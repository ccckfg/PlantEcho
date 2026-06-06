import { useEffect, useRef, useState } from "react";
import type { PlantSummary } from "@dyn/shared";
import {
  SENSOR_READING_REFRESH_THROTTLE_MS,
  SENSOR_STATUS_REFRESH_MS
} from "@/config/sensors";
import { QUICK_CHAT_ACTIONS } from "@/config/chat";
import { api, mediaUrl, type ReadingState } from "@/lib/api";
import { plantImage, useNow } from "@/lib/format";
import { getSensorConnection } from "@/lib/sensorStatus";
import { streamPlantChat } from "@/lib/chatStream";
import { useAsync } from "@/lib/useAsync";
import { useChatAutoScroll } from "@/hooks/useChatAutoScroll";
import { useSyncRefresh } from "@/hooks/useSyncRefresh";
import { BrandMark } from "@/components/BrandMark";
import { SensorStatusBadge } from "@/components/SensorStatusBadge";
import { Chip, Empty, Icon, ProgressBar } from "@/components/UI";
import { ChatBubble, shouldShowStamp, type ChatDisplayMessage } from "@/components/chat/ChatBubble";
import { ChatMenu } from "@/components/chat/ChatMenu";
import { MessageLoadingSkeleton } from "@/components/chat/MessageLoadingSkeleton";
import { PlantSwitcher } from "@/components/plants/PlantSwitcher";
import { PlantStatusTagChips } from "@/components/plants/PlantStatusTagChips";
import { deriveStatus, MOOD_PRESETS } from "@/lib/mood";

interface ChatScreenProps {
  plantId: string;
  plants: PlantSummary[];
  onSwitch: (nextId: string) => void;
}

export function ChatScreen({ plantId, plants, onSwitch }: ChatScreenProps) {
  const summary = plants.find((p) => p.id === plantId) ?? plants[0];
  const readingRefresh = useSyncRefresh(
    { plantId, resources: ["readings"] },
    { throttleMs: SENSOR_READING_REFRESH_THROTTLE_MS }
  );
  const messagesRefresh = useSyncRefresh({ plantId, resources: ["messages"] });
  const reading = useAsync<ReadingState>(() => api.latestReading(plantId), [plantId, readingRefresh]);
  const [messages, setMessages] = useState<ChatDisplayMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
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
  const moodMeta = MOOD_PRESETS[status.mood];
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
    const streamingReply: ChatDisplayMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      usedLlm: true
    };
    setMessages((prev) => [...prev, streamingReply]);
    try {
      await streamPlantChat(plantId, content, {
        onDelta: (delta) => {
          if (!mountedRef.current) return;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId ? { ...msg, content: msg.content + delta } : msg
            )
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
    <div className="h-full min-h-0 flex gap-xl p-xl overflow-hidden">
      <aside className="w-80 min-h-0 flex flex-col gap-md overflow-y-auto pr-sm pt-xs scroll-area">
        {plants.length > 1 ? (
          <PlantSwitcher plants={plants} activeId={plantId} ariaLabel="切换植物对话" onSwitch={onSwitch} />
        ) : null}
        <div key={`profile-${plantId}`} className="plant-swap-in surface-card rounded-lg p-lg flex flex-col gap-md">
          <div className="relative w-full aspect-[4/3] rounded-md overflow-hidden bg-surface-container ring-1 ring-surface-container-highest/30">
            <img
              src={avatarSrc}
              alt={summary?.name ?? plantId}
              className="w-full h-full object-cover transition-transform duration-700 ease-emphasized hover:scale-[1.04]"
            />
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/15 to-transparent pointer-events-none"
            />
          </div>
          <div className="flex flex-col gap-xs">
            <h1 className="font-display text-headline-lg text-on-surface leading-tight">
              {summary?.name ?? plantId}
            </h1>
            <p className="text-label-md font-label-md text-on-surface-variant tracking-wide">
              {summary?.species ?? "-"}
            </p>
          </div>
          <div className="flex gap-xs flex-wrap">
            <Chip
              icon={moodMeta.icon}
              tone={status.mood === "thirsty" ? "error" : status.mood === "sunny" ? "tertiary" : "secondary"}
            >
              {moodMeta.label}
            </Chip>
            <PlantStatusTagChips plantId={plantId} primaryLabel={moodMeta.label} />
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-surface-container-highest/70 to-transparent w-full my-xs" />
          <div className="flex flex-col gap-md">
            <h3 className="font-label-md text-label-md text-on-surface-variant inline-flex items-center gap-xs">
              <Icon name="monitor_heart" className="text-[16px] text-secondary" />
              当前状态
            </h3>
            <ProgressBar label="水分" icon="water_drop" value={status.hydration} />
            <ProgressBar label="光照" icon="light_mode" value={status.light} />
            <ProgressBar label="湿度" icon="air" value={status.humidity} />
          </div>
        </div>
      </aside>

      <section className="flex-1 min-w-0 surface-card rounded-lg flex flex-col overflow-hidden relative">
        <header className="shrink-0 relative z-20 px-lg py-md bg-surface-container-lowest flex items-center justify-between">
          <div key={`header-${plantId}`} className="plant-swap-in flex items-center gap-sm">
            <BrandMark size="md" />
            <div>
              <h2 className="font-display text-headline-md text-on-surface leading-none">
                与 {summary?.name ?? plantId} 对话
              </h2>
              <SensorStatusBadge connection={sensorConnection} variant="inline" className="mt-1" />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-expanded={menuOpen}
            aria-label="打开对话菜单"
            className="text-on-surface-variant hover:text-primary transition-all duration-200 p-sm rounded-full hover:bg-surface-container active:scale-95 focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Icon name="more_vert" />
          </button>
          <ChatMenu
            open={menuOpen}
            plantId={plantId}
            onClose={() => setMenuOpen(false)}
            onRefresh={() => setManualRefresh((value) => value + 1)}
          />
          <div aria-hidden className="absolute inset-x-0 -bottom-6 h-6 bg-gradient-to-b from-surface-container-lowest to-transparent pointer-events-none z-10" />
        </header>

        <div
          ref={scrollRef}
          key={`messages-${plantId}`}
          className="plant-swap-in flex-1 min-h-0 overflow-y-auto px-lg py-md flex flex-col gap-lg bg-gradient-to-b from-[#f4f8f3] via-[#f0f5ef] to-[#ebf1ea] scroll-area relative z-0"
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
            <p className="dialog-pop-in text-error text-label-sm font-label-sm self-center bg-error-container px-md py-xs rounded-full ring-1 ring-error/20">
              {error}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 relative bg-surface-container-lowest p-md pt-sm flex flex-col gap-sm">
          <div aria-hidden className="absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-surface-container-lowest to-transparent pointer-events-none" />
          <div className="flex gap-xs overflow-x-auto pb-0 scroll-area px-xs">
            {QUICK_CHAT_ACTIONS.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => send(`记录一下：${action.label}`)}
                className="group whitespace-nowrap px-sm py-xs rounded-full text-label-sm font-label-sm text-secondary hover:text-primary bg-transparent hover:bg-secondary-container/30 transition-all duration-200 ease-standard active:scale-[0.97] flex items-center gap-xs focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <Icon
                  name={action.icon}
                  className="text-[16px] transition-transform duration-300 ease-emphasized group-hover:scale-110"
                />
                {action.label}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-sm bg-surface-container-low/60 ring-1 ring-surface-container-highest/50 rounded-2xl px-lg py-xs transition-all duration-200 ease-standard focus-within:ring-2 focus-within:ring-primary/40 focus-within:bg-surface-container-lowest focus-within:shadow-soft"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none font-body text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:ring-0 py-sm"
              placeholder={`给 ${summary?.name ?? "PlantEcho"} 发消息...`}
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="发送消息"
              className="shrink-0 bg-primary text-on-primary w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-tint shadow-sm transition-all duration-200 ease-standard active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              <Icon name={sending ? "progress_activity" : "arrow_upward"} className={`text-[20px] ${sending ? "animate-spin" : ""}`} />
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
