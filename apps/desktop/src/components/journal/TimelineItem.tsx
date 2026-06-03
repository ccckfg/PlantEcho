import { useState } from "react";
import type { MemoryRow } from "@/lib/api";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useToast } from "@/components/Toast";
import { Chip, Icon } from "@/components/UI";
import { useIsMobile } from "@/lib/usePlatform";

interface TimelineItemProps {
  plantId: string;
  plantName: string;
  memory: MemoryRow;
  tone: "newest" | "mid" | "oldest";
  index: number;
}

export function TimelineItem({ plantId, plantName, memory, tone, index }: TimelineItemProps) {
  const isMobile = useIsMobile();
  const dotPalette = {
    newest: "bg-primary-container text-on-primary-container ring-4 ring-primary/15",
    mid: "bg-secondary-fixed text-on-secondary-fixed ring-4 ring-secondary-fixed-dim/40",
    oldest: "bg-surface-variant text-on-surface-variant ring-4 ring-surface-container-highest/40"
  }[tone];
  const icon = tone === "newest" ? "photo_camera" : tone === "mid" ? "psychiatry" : "home";
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const toast = useToast();
  const memoryAnchor = memory.title || extractTitle(memory.content);

  const submit = async () => {
    const trimmed = draft.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await api.chat(plantId, `📌 关于里程碑「${memoryAnchor}」：${trimmed}`);
      toast.show({
        title: `${plantName} 收到了你的留言`,
        description: "它会把这段话当作这次里程碑的回响。",
        tone: "success",
        durationMs: 4000
      });
      setDraft("");
      setOpen(false);
    } catch (caught) {
      toast.show({
        title: "留言没能送达",
        description: caught instanceof Error ? caught.message : "网络打了个盹，要不要再试一次？",
        tone: "warning",
        durationMs: 6000
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <article
      className="timeline-item relative flex gap-md stagger-in"
      style={{ animationDelay: `${Math.min(index, 6) * 80}ms` }}
    >
      <div className="timeline-line relative flex-shrink-0 w-9 md:w-12 flex justify-center mt-sm">
        <div
          className={`w-8 h-8 md:w-10 md:h-10 rounded-full ${dotPalette} flex items-center justify-center z-10 border-4 border-background transition-transform duration-300 ease-emphasized hover:scale-110`}
        >
          <Icon name={icon} className="text-[16px] md:text-[20px]" />
        </div>
      </div>
      <div className="group/item flex-1 surface-card surface-card-hover rounded-md p-md md:p-lg relative">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-sm mb-xs">
            <span className="font-label-sm text-label-sm text-secondary tracking-widest uppercase">
              {formatDate(memory.createdAt)}
            </span>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-label={open ? "收起留言框" : `给「${memoryAnchor}」留言`}
              className={`shrink-0 inline-flex items-center gap-xs rounded-full px-sm py-xs text-label-sm font-label-sm text-secondary transition-all duration-300 ease-emphasized hover:bg-secondary-container/40 hover:text-primary active:scale-[0.97] focus-visible:opacity-100 ${
                open ? "opacity-100 bg-secondary-container/40 text-primary" : "opacity-0 group-hover/item:opacity-100"
              }`}
            >
              <Icon name={open ? "close" : "edit_note"} className="text-[18px]" />
              {open ? "收起" : "对它说两句"}
            </button>
          </div>
          <h3 className="font-display text-headline-sm md:text-headline-md text-on-surface mb-xs md:mb-sm text-balance">
            {memoryAnchor}
          </h3>
          <p className="font-body text-body-sm md:text-body-md text-on-surface-variant whitespace-pre-wrap leading-relaxed">
            {memory.content || "—"}
          </p>
          {memory.importance ? (
            <div className="mt-md flex flex-wrap gap-sm">
              {memory.milestoneReason ? (
                <Chip tone="primary" icon="flag">
                  {memory.milestoneReason}
                </Chip>
              ) : null}
              <Chip tone="muted" icon="auto_awesome">
                重要度 {memory.importance}
              </Chip>
            </div>
          ) : null}
          {open ? (
            <div className="dialog-pop-in mt-md rounded-lg bg-secondary-container/25 ring-1 ring-secondary-fixed-dim/45 p-md">
              <p className="text-label-sm font-label-sm text-on-surface-variant inline-flex items-center gap-xs mb-sm">
                <Icon name="forum" className="text-[14px] text-secondary" />
                这段话会作为系统留言发给 {plantName}
              </p>
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    event.preventDefault();
                    void submit();
                  }
                }}
                placeholder="想对这一刻说点什么？比如「真为你高兴」"
                rows={3}
                className="w-full bg-surface-container-lowest rounded-md ring-1 ring-surface-container-highest/60 px-md py-sm text-body-md text-on-surface placeholder:text-on-surface-variant/60 outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/40 resize-none"
              />
              <div className="mt-sm flex items-center justify-between gap-sm">
                {!isMobile && (
                  <span className="text-label-sm font-label-sm text-on-surface-variant/70">
                    ⌘ / Ctrl + Enter 快速送达
                  </span>
                )}
                <div className="flex gap-xs">
                  <button
                    type="button"
                    onClick={() => { setOpen(false); setDraft(""); }}
                    disabled={sending}
                    className="rounded-full px-md py-sm text-label-sm font-label-sm text-on-surface-variant transition-colors hover:bg-surface-container active:scale-[0.97]"
                  >
                    暂不发
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={sending || !draft.trim()}
                    className="group inline-flex items-center gap-xs rounded-full bg-primary text-on-primary px-md py-sm text-label-sm font-label-sm shadow-leaf transition-all duration-200 ease-standard hover:bg-surface-tint hover:shadow-soft active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Icon
                      name={sending ? "progress_activity" : "send"}
                      className={`text-[16px] ${sending ? "animate-spin" : "transition-transform duration-300 ease-emphasized group-hover:translate-x-0.5"}`}
                    />
                    {sending ? "送达中" : "送达"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function extractTitle(content: string): string {
  const first = content.split(/[.。!！?？\n]/)[0]?.trim();
  return first && first.length <= 24 ? first : "新的成长片段";
}
