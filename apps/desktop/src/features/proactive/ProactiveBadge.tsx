export function ProactiveBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full bg-[#edf5df]/95 text-[#46652d]",
        "ring-1 ring-[#9ab77b]/55 shadow-[0_5px_18px_rgba(73,103,48,0.18)]",
        compact ? "h-5 w-5 justify-center" : "gap-xs px-sm py-[3px] text-label-xs font-label-sm"
      ].join(" ")}
      aria-label="这株植物有话想说"
      title="有话想说"
    >
      <span className="relative flex h-2.5 w-2.5" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7c9e58]/45" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#678b45]" />
      </span>
      {compact ? null : <span>有话想说</span>}
    </span>
  );
}
