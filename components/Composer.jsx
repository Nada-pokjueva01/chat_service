"use client"

import { useRef, useState, forwardRef, useImperativeHandle, useEffect } from "react"
import { Send, Loader2, Plus, Mic } from "lucide-react"
import ComposerActionsPopover from "./ComposerActionsPopover"
import { cls } from "./utils"

const Composer = forwardRef(function Composer({
  input = "",
  handleInputChange, // 부모의 setInput을 실행하는 핸들러
  handleSubmit,      // 내부에서 sendMessage를 호출하는 핸들러
  busy               // isLoading 상태
}, ref) {
  const [lineCount, setLineCount] = useState(1)
  const inputRef = useRef(null)

  // textarea 높이 자동 조절 로직 (유지)
  useEffect(() => {
    if (inputRef.current) {
      const textarea = inputRef.current
      const lineHeight = 24
      const minHeight = 24

      textarea.style.height = "auto"
      const scrollHeight = textarea.scrollHeight
      const calculatedLines = Math.max(1, Math.ceil(scrollHeight / lineHeight))

      setLineCount(calculatedLines)

      if (calculatedLines <= 12) {
        textarea.style.height = `${Math.max(minHeight, scrollHeight)}px`
        textarea.style.overflowY = "hidden"
      } else {
        textarea.style.height = `${12 * lineHeight}px`
        textarea.style.overflowY = "auto"
      }
    }
  }, [input])

  useImperativeHandle(
    ref,
    () => ({
      // 템플릿 삽입 시 부모의 상태를 업데이트
      insertTemplate: (templateContent) => {
        const newValue = input ? `${input}\n\n${templateContent}` : templateContent;

        // AI SDK 5.0에서는 handleInputChange가 일반적인 onChange 핸들러이므로
        // 아래와 같이 이벤트 객체를 흉내 내어 전달하면 부모의 setInput이 작동합니다.
        if (typeof handleInputChange === 'function') {
          handleInputChange({
            target: { value: newValue }
          });
        }

        // 입력 후 즉시 포커스
        setTimeout(() => inputRef.current?.focus(), 0);
      },
      focus: () => inputRef.current?.focus(),
    }),
    [input, handleInputChange]
  )

  const hasContent = (input || "").trim().length > 0

  return (
    <div className="border-t border-zinc-200/60 p-4 dark:border-zinc-800">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!hasContent || busy) return;
          handleSubmit(e); // 부모의 handleSubmit(내부에 sendMessage 포함) 호출
        }}
        className={cls(
          "mx-auto flex flex-col rounded-3xl border bg-white shadow-sm dark:bg-zinc-950 transition-all duration-200",
          "max-w-3xl border-zinc-200 dark:border-zinc-800",
          busy && "opacity-80" // 전송 중일 때 시각적 피드백
        )}
      >
        <div className="flex-1 px-4 pt-4 pb-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            placeholder="Ask me anything... How can I help you?"
            rows={1}
            className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-zinc-400 leading-6 min-h-[24px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {    // 엔터키 전송 (Shift+Enter는 줄바꿈)
                e.preventDefault();
                if (hasContent && !busy) {
                  handleSubmit(e);
                }
              }
            }}
          />
        </div>

        <div className="flex items-center justify-between px-3 pb-3">
          <ComposerActionsPopover>
            <button
              type="button"
              className="inline-flex shrink-0 items-center justify-center rounded-full p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors"
              title="Add attachment"
            >
              <Plus className="h-5 w-5" />
            </button>
          </ComposerActionsPopover>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors"
              title="Voice input"
            >
              <Mic className="h-5 w-5" />
            </button>
            <button
              type="submit"
              disabled={busy || !hasContent}
              className={cls(
                "inline-flex shrink-0 items-center justify-center rounded-full p-2.5 transition-colors",
                hasContent
                  ? "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                  : "bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed",
              )}
            >
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </form>

      <div className="mx-auto mt-2 max-w-3xl px-1 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
        Be aware of that AI can make mistakes. You're recommended to check original sources again for important information.
      </div>
    </div>
  )
})

export default Composer