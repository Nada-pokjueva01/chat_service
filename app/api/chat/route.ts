import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { db } from '@/lib/db';
import { messages, conversations } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const maxDuration = 30;

const vllm = createOpenAICompatible({
  name: 'vllm',
  baseURL: process.env.VLLM_BASE_URL ?? 'http://127.0.0.1:8000/v1',
  apiKey: process.env.VLLM_API_KEY ?? 'not-used',
});

function extractContent(msg: UIMessage): string {
  try {
    const msgAny = msg as unknown as Record<string, unknown>;
    const content = msgAny.content;

    if (!content) {
      const parts = msgAny.parts;
      if (Array.isArray(parts)) {
        return parts
          .filter((p: Record<string, unknown>) => p && p.type === 'text')
          .map((p: Record<string, unknown>) => p.text || '')
          .join('');
      }
      return '';
    }

    if (typeof content === 'string') {
      return content;
    }
    if (Array.isArray(content)) {
      return content
        .map(c => {
          if (typeof c === 'string') return c;
          if (c && typeof c === 'object' && 'text' in c) return (c as Record<string, unknown>).text || '';
          return '';
        })
        .join('');
    }
    return '';
  } catch (e) {
    console.error('[extractContent] Error:', e);
    return '';
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const chatMessages: UIMessage[] = body.messages || [];
    const conversationId = body.conversationId || `conv_${Date.now()}`;

    // 1. Ensure conversation exists and Save the last message (the new one from user) to DB
    const lastMessage = chatMessages[chatMessages.length - 1];
    if (lastMessage && conversationId) {
      const content = extractContent(lastMessage);
      if (content) {
        try {
          // 1a. Check/Create Conversation
          const existingConv = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
          if (existingConv.length === 0) {
            await db.insert(conversations).values({
              id: conversationId,
              title: content.slice(0, 50) || 'New Chat',
              folder: 'Work Projects',
            });
            console.log(`[POST] Auto-created conversation: ${conversationId}`);
          }

          // 1b. Insert Message
          await db.insert(messages).values({
            id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            conversationId,
            role: lastMessage.role,
            content,
          });
        } catch (dbErr) {
          console.error('DB Persistence Error (User Message):', dbErr);
        }
      }
    }

    // 2. Prepare messages for the model
    let modelMessages: any[] = [];
    try {
      modelMessages = await convertToModelMessages(chatMessages);
    } catch (convErr) {
      console.error('convertToModelMessages Error:', convErr);
      modelMessages = [];
    }

    if (modelMessages.length === 0) {
      modelMessages = chatMessages.map(m => ({
        role: m.role,
        content: extractContent(m) || '',
      })).filter((m: any) => m.content);
    }

    // 3. Stream response from AI
    const result = await streamText({
      model: vllm.chatModel(process.env.VLLM_MODEL || 'vllm-model'),
      system: 'You are a helpful AI assistant.',
      messages: modelMessages,
      maxOutputTokens: 2048,
      temperature: 0.7,
      onFinish: async ({ text }) => {
        try {
          await db.insert(messages).values({
            id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            conversationId,
            role: 'assistant',
            content: text,
          });
          console.log(`[POST] Assistant message saved for conv: ${conversationId}`);
        } catch (dbErr) {
          console.error('Assistant DB Insert Error:', dbErr);
        }
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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get('conversationId');
  const getAll = searchParams.get('all');

  if (getAll === 'true') {
    try {
      // 🚀 Fix: Get the actual last message content using a subquery or distinct on
      const msgRows = await db.execute(sql`
        SELECT 
          m1.conversation_id as "conversationId",
          m1.content as "lastContent",
          m1.created_at as "lastCreatedAt",
          m2.cnt as "messageCount"
        FROM messages m1
        JOIN (
          SELECT conversation_id, MAX(created_at) as max_created_at, COUNT(*) as cnt
          FROM messages
          GROUP BY conversation_id
        ) m2 ON m1.conversation_id = m2.conversation_id AND m1.created_at = m2.max_created_at
        JOIN (
          -- Ensure we only get one row per conversation even if timestamps match exactly
          SELECT conversation_id, MAX(id) as max_id
          FROM messages
          GROUP BY conversation_id
        ) m3 ON m1.conversation_id = m3.conversation_id AND m1.id = m3.max_id
      `);

      const convRows = await db.select().from(conversations);
      const convMetaMap = new Map(convRows.map(c => [c.id, c]));

      const resultConversations = (msgRows.rows as any[]).map(r => {
        const meta = convMetaMap.get(r.conversationId);
        return {
          id: r.conversationId,
          title: meta?.title || (r.lastContent ? r.lastContent.slice(0, 40) + (r.lastContent.length > 40 ? '...' : '') : 'New Chat'),
          preview: r.lastContent ? r.lastContent.slice(0, 80) : 'Say hello to start...',
          updatedAt: r.lastCreatedAt,
          messageCount: Number(r.messageCount),
          pinned: meta?.pinned || false,
          folder: meta?.folder || 'Work Projects',
          messages: [],
        };
      });

      return Response.json({ conversations: resultConversations });
    } catch (error) {
      console.error('GET All Conversations Error:', error);
      return Response.json({ error: error instanceof Error ? error.message : 'Failed to fetch conversations' }, { status: 500 });
    }
  }

  if (!conversationId) {
    return Response.json({ messages: [] });
  }

  try {
    const rows = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);

    return Response.json({ messages: rows });
  } catch (error) {
    console.error('GET Chat Error:', error);
    return Response.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return Response.json({ error: 'conversationId is required' }, { status: 400 });
    }

    // Transaction implementation would be ideal here if Drizzle supports it easily with this driver,
    // but for now we'll delete messages first then the conversation.
    await db.delete(messages).where(eq(messages.conversationId, conversationId));
    await db.delete(conversations).where(eq(conversations.id, conversationId));

    return Response.json({ success: true });
  } catch (error) {
    console.error('DELETE Chat Error:', error);
    return Response.json({ error: 'Failed to delete messages' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { conversationId, pinned, title, folder, messageId, content } = body;

    // 1. Message Update Logic
    if (messageId && content) {
      await db.update(messages)
        .set({ content })
        .where(eq(messages.id, messageId));
      return Response.json({ success: true });
    }

    // 2. Conversation Metadata Update Logic
    if (!conversationId) {
      return Response.json({ error: 'conversationId is required' }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(conversations).values({
        id: conversationId,
        title: title || 'New Chat',
        pinned: pinned || false,
        folder: folder || 'Work Projects',
      });
    } else {
      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (pinned !== undefined) updateData.pinned = pinned;
      if (title !== undefined) updateData.title = title;
      if (folder !== undefined) updateData.folder = folder;

      await db.update(conversations)
        .set(updateData)
        .where(eq(conversations.id, conversationId));
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('PATCH Conversation Error:', error);
    return Response.json({ error: 'Failed to update conversation' }, { status: 500 });
  }
}
