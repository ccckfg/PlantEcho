import type { MessageRow } from "@/lib/api";
import type { MemoryCitation } from "@dyn/shared";
import { formatTime } from "@/lib/format";
import { Icon } from "@/components/UI";

export type ChatDisplayMessage = MessageRow & {
  usedLlm?: boolean;
  memoryCitations?: MemoryCitation[];
  llmError?: string;
};

export function shouldShowStamp(prev: string, current: string): boolean {
  const a = new Date(prev).getTime();
  const b = new Date(current).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  return b - a > 1000 * 60 * 10;
}

interface ChatBubbleProps {
  message: ChatDisplayMessage;
  avatar: string;
  showStamp: boolean;
}

export function ChatBubble({ message, avatar, showStamp }: ChatBubbleProps) {
  const isUser = message.role === "user";
  const isThinking = !isUser && message.content.length === 0;
  return (
    <>
      {showStamp ? (
        <div className="flex justify-center select-none">
          <span className="font-label-sm text-label-sm text-on-surface-variant/80 bg-surface/70 backdrop-blur-sm px-md py-xs rounded-full ring-1 ring-surface-container-highest/50">
            {formatTime(message.createdAt) || "刚刚"}
          </span>
        </div>
      ) : null}
      <div
        className={`flex gap-sm md:gap-md max-w-[88%] md:max-w-[80%] stagger-in ${isUser ? "self-end" : ""}`}
      >
        {isUser ? null : (
          <img
            src={avatar}
            alt=""
            className="w-8 h-8 rounded-full object-cover self-end mb-1 ring-2 ring-surface shrink-0"
          />
        )}
        <div className="flex flex-col gap-xs min-w-0">
          <div
            className={`px-md py-sm rounded-[22px] transition-shadow duration-300 ease-standard ${
              isUser
                ? "bg-secondary-container/55 text-on-secondary-container ring-1 ring-secondary-fixed-dim/45 rounded-br-md"
                : "bg-surface-container-lowest text-on-surface rounded-bl-md ring-1 ring-surface-container-highest/60 shadow-[0_2px_8px_rgba(45,90,39,0.06)]"
            }`}
          >
            {isThinking ? (
              <p className="font-body text-body-md text-on-surface-variant inline-flex items-center gap-sm">
                <span>正在思考</span>
                <span className="typing-dots">
                  <span />
                  <span />
                  <span />
                </span>
              </p>
            ) : (
              <p className="font-body text-body-md whitespace-pre-wrap break-words leading-relaxed">
                {message.content}
              </p>
            )}
          </div>
          {!isUser && message.usedLlm === false ? (
            <span
              className="self-start inline-flex items-center gap-xs px-sm py-xs rounded-full bg-surface-container text-on-surface-variant text-label-sm font-label-sm ring-1 ring-surface-container-highest/40"
              title={message.llmError}
            >
              <Icon name="rule" className="text-[14px]" />
              离线兜底
            </span>
          ) : null}
          {!isUser && message.memoryCitations?.length ? (
            <span
              className="self-start inline-flex items-center gap-xs px-sm py-xs rounded-full bg-secondary-container/80 text-on-secondary-container text-label-sm font-label-sm ring-1 ring-secondary-fixed-dim/40 max-w-full"
              title={message.memoryCitations.map((item) => item.title).join("；")}
            >
              <Icon name="history" className="text-[14px] shrink-0" />
              <span className="truncate">引用记忆：{message.memoryCitations[0].title}</span>
            </span>
          ) : null}
        </div>
      </div>
    </>
  );
}
