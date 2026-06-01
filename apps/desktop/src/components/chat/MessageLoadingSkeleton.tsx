import "./MessageLoadingSkeleton.css";

export function MessageLoadingSkeleton() {
  return (
    <div className="chat-loading-stage" role="status" aria-live="polite" aria-label="正在加载对话">
      <div className="chat-loading-card">
        <span className="chat-loading-orb" aria-hidden />
        <span className="font-label-md text-label-md text-on-surface-variant">
          正在载入对话
        </span>
        <span className="typing-dots text-primary" aria-hidden>
          <span />
          <span />
          <span />
        </span>
      </div>
      <div className="chat-loading-lines" aria-hidden>
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
