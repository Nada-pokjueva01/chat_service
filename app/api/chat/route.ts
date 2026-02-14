import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

export const runtime = 'nodejs';
export const maxDuration = 30; // 로컬 모델 응답 속도를 고려한 타임아웃 설정

const vllm = createOpenAICompatible({
  name: 'vllm',
  baseURL: process.env.VLLM_BASE_URL ?? 'http://127.0.0.1:8000/v1',
  apiKey: process.env.VLLM_API_KEY ?? 'not-used',
});

export async function POST(req: Request) {

  console.log("환경변수 확인:", process.env.VLLM_BASE_URL);
  console.log("모델명 확인:", process.env.VLLM_MODEL);

  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    const result = await streamText({
      model: vllm.chatModel(process.env.VLLM_MODEL || 'vllm-model'),
      system: 'You are a helpful AI assistant who operated on a local environment.',
      messages: await convertToModelMessages(messages),
      maxOutputTokens: 2048,  // 출력 토큰 수 설정
      temperature: 0.7,
      onFinish: async ({ text, usage }) => {
        console.log('Token Usage:', usage);
        console.log('Response:', text);
        // TODO: 여기서 Drizzle ORM을 사용해 대화를 DB에 저장하세요.
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
