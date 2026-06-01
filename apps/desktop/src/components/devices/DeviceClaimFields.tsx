import { useState } from "react";
import type { PlantSummary } from "@dyn/shared";
import { Icon } from "@/components/UI";

export function ExistingPlantSelect({
  plants,
  plantId,
  onChange
}: {
  plants: PlantSummary[];
  plantId: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-xs">
      <span className="text-label-md font-label-md text-on-surface">植物</span>
      <select
        value={plantId}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-surface-container-highest bg-surface px-md py-sm text-body-md outline-none focus:border-primary"
      >
        {plants.map((plant) => (
          <option key={plant.id} value={plant.id}>
            {plant.name} · {plant.species}
          </option>
        ))}
      </select>
    </label>
  );
}

export function NewPlantFields({
  name,
  species,
  location,
  onName,
  onSpecies,
  onLocation
}: {
  name: string;
  species: string;
  location: string;
  onName: (value: string) => void;
  onSpecies: (value: string) => void;
  onLocation: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
      <input
        value={name}
        onChange={(event) => onName(event.target.value)}
        placeholder="植物名"
        className="rounded-md border border-surface-container-highest bg-surface px-md py-sm text-body-md outline-none focus:border-primary"
      />
      <input
        value={species}
        onChange={(event) => onSpecies(event.target.value)}
        placeholder="品种"
        className="rounded-md border border-surface-container-highest bg-surface px-md py-sm text-body-md outline-none focus:border-primary"
      />
      <input
        value={location}
        onChange={(event) => onLocation(event.target.value)}
        placeholder="位置"
        className="rounded-md border border-surface-container-highest bg-surface px-md py-sm text-body-md outline-none focus:border-primary"
      />
    </div>
  );
}

export function ClaimedKey({
  apiKey,
  deliveredToDevice,
  onDone
}: {
  apiKey: string;
  deliveredToDevice?: boolean;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
  };

  return (
    <div className="mt-lg flex flex-col gap-md">
      <div className="rounded-md bg-surface-container p-md">
        <p className="text-label-md font-label-md text-on-surface-variant mb-xs">
          DEVICE_API_KEY
        </p>
        <code className="block break-all text-body-md text-primary">{apiKey}</code>
        <p className="mt-sm text-label-sm font-label-sm text-on-surface-variant">
          {deliveredToDevice
            ? "已通过 MQTT 下发给在线设备，设备会自动保存并重连。"
            : "如果设备不在线，请复制后稍后手动写入配网页。"}
        </p>
      </div>
      <div className="flex justify-end gap-sm">
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-sm rounded-full border border-outline-variant px-lg py-sm text-label-md font-label-md text-primary hover:bg-primary-container"
        >
          <Icon name={copied ? "check" : "content_copy"} />
          {copied ? "已复制" : "复制"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-full bg-primary px-lg py-sm text-label-md font-label-md text-on-primary"
        >
          完成
        </button>
      </div>
    </div>
  );
}
