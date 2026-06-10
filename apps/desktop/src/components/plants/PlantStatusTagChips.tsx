import { useEffect, useMemo, useState, type CSSProperties } from "react";
import "./PlantStatusTagChips.css";

interface PlantStatusTagChipsProps {
  tags: string[];
}

const uniqueTags = (tags: string[]): string[] => {
  const seen = new Set<string>();
  return tags
    .map((tag) => tag.trim())
    .filter((tag) => tag && !seen.has(tag) && seen.add(tag))
    .slice(0, 2);
};

function SmoothStatusChip({ tag, index }: { tag: string; index: number }) {
  const [shown, setShown] = useState(tag);
  const [phase, setPhase] = useState<"steady" | "leaving" | "entering">("steady");
  const chars = Math.max(2, Math.min(4, Math.max(shown.length, tag.length)));

  useEffect(() => {
    if (tag === shown) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setShown(tag);
      setPhase("steady");
      return;
    }

    setPhase("leaving");
    const swapTimer = window.setTimeout(() => {
      setShown(tag);
      setPhase("entering");
    }, 130);
    const settleTimer = window.setTimeout(() => setPhase("steady"), 460);
    return () => {
      window.clearTimeout(swapTimer);
      window.clearTimeout(settleTimer);
    };
  }, [tag, shown]);

  return (
    <span
      className={`status-tag-chip status-tag-chip--${phase}`}
      style={{ "--status-tag-chars": chars, "--status-tag-delay": `${index * 35}ms` } as CSSProperties}
    >
      <span className="status-tag-chip__inner">
        <span className="status-tag-chip__dot" aria-hidden />
        <span>{shown}</span>
      </span>
    </span>
  );
}

export function PlantStatusTagChips({ tags }: PlantStatusTagChipsProps) {
  const visibleTags = useMemo(() => uniqueTags(tags), [tags]);

  return (
    <>
      {visibleTags.map((tag, index) => (
        <SmoothStatusChip key={tag} tag={tag} index={index} />
      ))}
    </>
  );
}
