import { useState } from "react";
import { Icon } from "@/components/UI";

export const plantModelName = (plantId: string): string => `plant:${plantId}`;

interface PlantModelNameProps {
  plantId: string;
  compact?: boolean;
}

export function PlantModelName({ plantId, compact = false }: PlantModelNameProps) {
  const [copied, setCopied] = useState(false);
  const modelName = plantModelName(plantId);

  const copy = async () => {
    await navigator.clipboard.writeText(modelName);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex min-w-0 items-center justify-between gap-sm rounded-sm border border-hairline bg-surface-container-low/45 ${
      compact ? "px-sm py-xs" : "px-md py-sm"
    }`}>
      <div className="min-w-0">
        <p className="text-label-sm font-label-sm text-on-surface-variant">OpenAI 模型名</p>
        <p className="truncate select-all font-mono text-[13px] text-on-surface">{modelName}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        title="复制模型名"
        className="inline-flex shrink-0 items-center gap-xs rounded-full px-sm py-xs text-label-sm font-label-sm text-primary transition-all duration-200 hover:bg-primary-container/35 active:scale-95"
      >
        <Icon name={copied ? "check" : "content_copy"} className={`text-[15px] ${copied ? "scale-110" : ""}`} />
        {copied ? "已复制" : "复制"}
      </button>
    </div>
  );
}
