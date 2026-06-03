import { useEffect, useRef, useState } from "react";
import type { PlantSummary } from "@dyn/shared";
import { SENSOR_STATUS_REFRESH_MS } from "@/config/sensors";
import { QUICK_CHAT_ACTIONS } from "@/config/chat";
import { api, mediaUrl, type ReadingState } from "@/lib/api";
import { plantImage, useNow } from "@/lib/format";
import { getSensorConnection } from "@/lib/sensorStatus";
import { streamPlantChat } from "@/lib/chatStream";
import { useAsync } from "@/lib/useAsync";
import { useChatAutoScroll } from "@/hooks/useChatAutoScroll";
import { useSyncRefresh } from "@/hooks/useSyncRefresh";
import { SensorStatusBadge } from "@/components/SensorStatusBadge";
import { Empty, Icon, ProgressBar } from "@/components/UI";
import { ChatBubble, shouldShowStamp, type ChatDisplayMessage } from "@/components/chat/ChatBubble";
import { ChatMenu } from "@/components/chat/ChatMenu";
import { MessageLoadingSkeleton } from "@/components/chat/MessageLoadingSkeleton";
import { PlantSwitcher } from "@/components/plants/PlantSwitcher";
import { deriveStatus } from "@/lib/mood";

interface MobileChatScreenProps {
  plantId: string;
  plants: PlantSummary[];
  onSwitch: (nextId: string) => void;
}

export function MobileChatScreen({ plantId, plants, onSwitch }: MobileChatScreenProps) {
  const summary = plants.find((p) => p.id === plantId) ?? plants[0];
  const readingRefresh = useSyncRefresh({ plantId, resources: ["readings"] });
  const messagesRefresh = useSyncRefresh({ plantId, resources: ["messages"] });
  const reading = useAsync<ReadingState>(() => api.latestReading(plantId), [plantId, readingRefresh]);
  const [messages, setMessages] = useState<ChatDisplayMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [manualRefresh, setManualRefresh] = useState(0);
  const now = useNow(SENSOR_STATUS_REFRESH_MS);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(false);
  const loadedPlantIdRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (loadedPlantIdRef.current !== plantId) {
      setMessages([]);
      setError(null);
    }
    setMessagesLoading(true);
    api
      .listMessages(plantId)
      .then((r) => {
        if (!cancelled) {
          loadedPlantIdRef.current = plantId;
          setMessages(r.messages);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setMessagesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [plantId, messagesRefresh, manualRefresh]);

  useChatAutoScroll({
    scrollRef,
    resetKey: plantId,
    loading: messagesLoading,
    tailKey: `${messages.length}:${messages[messages.length - 1]?.content ?? ""}`
  });

  const sensorConnection = getSensorConnection(reading.data?.latest, now);
  const status = deriveStatus(reading.data?.latest, summary?.careProfile, now);
  const avatarSrc = mediaUrl(summary?.avatarUrl ?? plantImage(plantId));

  async function send(content: string) {
    if (!content.trim() || sending) return;
    const optimisticUser: ChatDisplayMessage = {
      id: Date.now(),
      role: "user",
      content,
      createdAt: new Date().toISOString()
    };
    setMessages((prev) => [...prev, optimisticUser]);
    setInput("");
    setSending(true);
    setError(null);
    const assistantId = Date.now() + 1;
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", createdAt: new Date().toISOString(), usedLlm: true }
    ]);
    try {
      await streamPlantChat(plantId, content, {
        onDelta: (delta) => {
          if (!mountedRef.current) return;
          setMessages((prev) =>
            prev.map((msg) => (msg.id === assistantId ? { ...msg, content: msg.content + delta } : msg))
          );
        },
        onDone: (done) => {
          if (!mountedRef.current) return;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? { ...msg, usedLlm: done.usedLlm, memoryCitations: done.memoryCitations, llmError: done.llmError }
                : msg
            )
          );
        }
      });
    } catch (err) {
      if (!mountedRef.current) return;
      setMessages((prev) => prev.filter((msg) => msg.id !== assistantId));
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (mountedRef.current) setSending(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-gradient-to-b from-[#f4f8f3] via-[#f0f5ef] to-[#ebf1ea]">
      <header className="relative z-20 shrink-0 bg-surface-container-lowest/95 px-margin-mobile py-xs backdrop-blur-md">
        {plants.length > 1 ? (
          <PlantSwitcher
            plants={plants}
            activeId={plantId}
            ariaLabel="切换植物对话"
            onSwitch={onSwitch}
            className="mb-xs"
          />
        ) : null}
        <div className="flex items-center justify-between gap-sm">
          <div className="min-w-0">
            <h2 className="truncate font-display text-title-md font-bold text-on-surface leading-none">
              与 {summary?.name ?? plantId} 对话
            </h2>
            <SensorStatusBadge connection={sensorConnection} variant="inline" className="mt-0.5" />
          </div>
          <div className="flex shrink-0 items-center">
            <button
              type="button"
              onClick={() => setStatusOpen((v) => !v)}
              aria-expanded={statusOpen}
              aria-label="查看当前状态"
              className="grid h-9 w-9 place-items-center rounded-full text-on-surface-variant transition-all duration-200 hover:bg-surface-container hover:text-primary active:scale-95"
            >
              <Icon name="monitor_heart" className={`text-[20px] ${statusOpen ? "text-primary" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-label="打开对话菜单"
              className="grid h-9 w-9 place-items-center rounded-full text-on-surface-variant transition-all duration-200 hover:bg-surface-container hover:text-primary active:scale-95"
            >
              <Icon name="more_vert" />
            </button>
          </div>
          <ChatMenu
            open={menuOpen}
            plantId={plantId}
            onClose={() => setMenuOpen(false)}
            onRefresh={() => setManualRefresh((v) => v + 1)}
          />
        </div>
        {statusOpen ? (
          <div className="dialog-pop-in absolute left-margin-mobile right-margin-mobile top-[calc(100%-4px)] z-30 grid grid-cols-3 gap-sm rounded-md bg-surface-container-lowest/95 backdrop-blur-md p-md shadow-modal ring-1 ring-surface-container-highest/60">
            <ProgressBar label="水分" icon="water_drop" value={status.hydration} />
            <ProgressBar label="光照" icon="light_mode" value={status.light} />
            <ProgressBar label="湿度" icon="air" value={status.humidity} />
          </div>
        ) : null}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -bottom-6 z-10 h-6 bg-gradient-to-b from-surface-container-lowest to-transparent"
        />
      </header>

      <div
        ref={scrollRef}
        className="scroll-area flex min-h-0 flex-1 flex-col gap-md overflow-y-auto px-margin-mobile py-md"
      >
        {messagesLoading && messages.length === 0 ? (
          <MessageLoadingSkeleton />
        ) : messages.length === 0 ? (
          <Empty
            icon="forum"
            title="开启第一段对话"
            description="问问 PlantEcho 它今天想晒太阳还是喝水，或者复盘一下昨天的状态。"
          />
        ) : (
          messages.map((msg, idx) => (
            <ChatBubble
              key={msg.id}
              message={msg}
              avatar={avatarSrc}
              showStamp={idx === 0 || shouldShowStamp(messages[idx - 1].createdAt, msg.createdAt)}
            />
          ))
        )}
        {error ? (
          <p className="dialog-pop-in self-center rounded-full bg-error-container px-md py-xs text-label-sm font-label-sm text-error ring-1 ring-error/20">
            {error}
          </p>
        ) : null}
      </div>

      <div className="relative shrink-0 bg-surface-container-lowest px-md pb-sm pt-xs">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-surface-container-lowest to-transparent"
        />
        <div className="scroll-area mb-xs flex gap-sm overflow-x-auto px-xs pb-xs">
          {QUICK_CHAT_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => send(`记录一下：${action.label}`)}
              className="flex shrink-0 items-center gap-xs whitespace-nowrap rounded-full bg-secondary-container/30 text-on-secondary-container ring-1 ring-secondary-fixed-dim/20 px-sm py-[4px] text-[12px] font-label-sm transition-all duration-200 ease-standard hover:bg-secondary-container/60 hover:text-primary active:scale-[0.97]"
            >
              <Icon name={action.icon} className="text-[14px] text-primary" />
              {action.label}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-sm rounded-full bg-surface-container-low/60 px-md py-[3px] ring-1 ring-surface-container-highest/50 transition-all duration-200 ease-standard focus-within:bg-surface-container-lowest focus-within:ring-2 focus-within:ring-primary/40"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="min-w-0 flex-1 border-none bg-transparent py-xs font-body text-body-sm text-on-surface outline-none placeholder:text-on-surface-variant/50 focus:ring-0"
            placeholder={`给 ${summary?.name ?? "PlantEcho"} 发消息...`}
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            aria-label="发送消息"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-on-primary shadow-sm transition-all duration-200 ease-standard hover:bg-surface-tint active:scale-90 disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none"
          >
            <Icon name={sending ? "progress_activity" : "arrow_upward"} className={`text-[18px] ${sending ? "animate-spin" : ""}`} />
          </button>
        </form>
      </div>
    </div>
  );
}
