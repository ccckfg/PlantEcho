import { useEffect, useMemo, useRef, useState } from "react";
import type { CareProfile, CareProfileSuggestion, ClaimDeviceInput, PendingDevice, PlantSummary } from "@dyn/shared";
import { Icon } from "@/components/UI";
import { api } from "@/lib/api";
import { deviceApi, type DeviceClaimResult } from "@/lib/deviceApi";
import { CareProfileEditor } from "@/components/plants/CareProfileEditor";
import { ExistingPlantSelect, NewPlantFields } from "./DeviceClaimFields";

type ClaimMode = "existingPlant" | "newPlant";

export function PendingDeviceClaimForm({
  devices,
  plants,
  loading,
  onClaimed,
  onChanged,
  onClose
}: {
  devices: PendingDevice[];
  plants: PlantSummary[];
  loading: boolean;
  onClaimed: (result: DeviceClaimResult) => void;
  onChanged: () => void;
  onClose: () => void;
}) {
  const [deviceId, setDeviceId] = useState(() => devices[0]?.id ?? "");
  const [mode, setMode] = useState<ClaimMode>("existingPlant");
  const [plantId, setPlantId] = useState(() => plants[0]?.id ?? "");
  const [deviceName, setDeviceName] = useState("");
  const [plantName, setPlantName] = useState("");
  const [species, setSpecies] = useState("");
  const [location, setLocation] = useState("");
  const [careProfile, setCareProfile] = useState<CareProfile | null>(null);
  const [careSuggestion, setCareSuggestion] = useState<CareProfileSuggestion | null>(null);
  const [profileEdited, setProfileEdited] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [ignoring, setIgnoring] = useState(false);
  const [error, setError] = useState("");
  const lastSuggestionKey = useRef("");

  const activeDevice = useMemo(
    () => devices.find((device) => device.id === deviceId) ?? devices[0],
    [devices, deviceId]
  );
  const activeDeviceId = activeDevice?.id ?? deviceId;
  const selectedPlantId = plantId || plants[0]?.id || "";
  const canClaim =
    Boolean(activeDeviceId) &&
    (mode === "existingPlant"
      ? Boolean(selectedPlantId)
      : Boolean(plantName.trim() && species.trim() && careProfile));

  const requestCareProfile = async (force = false) => {
    const trimmedSpecies = species.trim();
    if (!trimmedSpecies || suggesting) return;
    const key = `${plantName.trim()}|${trimmedSpecies}|${location.trim()}`;
    if (!force && (profileEdited || lastSuggestionKey.current === key)) return;
    setSuggesting(true);
    setSuggestError("");
    try {
      const result = await api.suggestCareProfile({
        name: plantName.trim() || undefined,
        species: trimmedSpecies,
        location: location.trim() || undefined
      });
      lastSuggestionKey.current = key;
      setCareProfile(result.suggestion.careProfile);
      setCareSuggestion(result.suggestion);
      setProfileEdited(false);
    } catch (caught) {
      setSuggestError(caught instanceof Error ? caught.message : "生成养护参数失败");
    } finally {
      setSuggesting(false);
    }
  };

  useEffect(() => {
    if (mode !== "newPlant" || !species.trim() || profileEdited) return;
    const timer = window.setTimeout(() => {
      void requestCareProfile(false);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [mode, plantName, species, location, profileEdited]);

  const handleClaim = async () => {
    if (!canClaim || claiming) return;
    setClaiming(true);
    setError("");
    try {
      const input: ClaimDeviceInput =
        mode === "existingPlant"
          ? {
              mode,
              plantId: selectedPlantId,
              deviceName: deviceName.trim() || undefined
            }
          : {
              mode,
              plant: {
                name: plantName.trim(),
                species: species.trim(),
                location: location.trim() || undefined,
                careProfile: careProfile ?? undefined
              },
              deviceName: deviceName.trim() || undefined
            };
      const result = await deviceApi.claimDevice(activeDeviceId, input);
      onClaimed(result);
      onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "认领失败");
    } finally {
      setClaiming(false);
    }
  };

  const handleIgnore = async () => {
    if (!activeDeviceId || ignoring) return;
    setIgnoring(true);
    setError("");
    try {
      await deviceApi.ignorePendingDevice(activeDeviceId);
      setDeviceId(devices.find((device) => device.id !== activeDeviceId)?.id ?? "");
      onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "忽略设备失败");
    } finally {
      setIgnoring(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col gap-md">
      {error ? (
        <p className="rounded-md bg-error-container px-md py-sm text-body-sm text-on-error-container">
          {error}
        </p>
      ) : null}
      <label className="flex flex-col gap-xs">
        <span className="text-label-md font-label-md text-on-surface">待认领设备</span>
        <div className="flex flex-col gap-sm sm:flex-row">
          <select
            value={activeDeviceId}
            onChange={(event) => setDeviceId(event.target.value)}
            className="min-w-0 flex-1 rounded-md border border-surface-container-highest bg-surface px-md py-sm text-body-md outline-none focus:border-primary"
            disabled={loading}
          >
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.id} · {device.rssi ?? "RSSI --"}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleIgnore}
            disabled={!activeDeviceId || ignoring}
            className="inline-flex items-center gap-xs rounded-full border border-outline-variant px-md py-sm text-label-md font-label-md text-on-surface-variant hover:bg-surface-container disabled:opacity-50"
          >
            <Icon name={ignoring ? "progress_activity" : "visibility_off"} />
            {ignoring ? "处理中" : "忽略"}
          </button>
        </div>
      </label>

      <div className="flex rounded-full bg-surface-container p-xs">
        {[
          { key: "existingPlant", label: "绑定已有" },
          { key: "newPlant", label: "新建植物" }
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setMode(item.key as ClaimMode)}
            className={`flex-1 rounded-full px-md py-sm text-label-md font-label-md ${
              mode === item.key
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-xs">
        <span className="text-label-md font-label-md text-on-surface">设备名称</span>
        <input
          value={deviceName}
          onChange={(event) => setDeviceName(event.target.value)}
          placeholder={activeDeviceId ? `Device ${activeDeviceId}` : "书桌 ESP32"}
          className="rounded-md border border-surface-container-highest bg-surface px-md py-sm text-body-md outline-none focus:border-primary"
        />
      </label>

      {mode === "existingPlant" ? (
        <ExistingPlantSelect plants={plants} plantId={selectedPlantId} onChange={setPlantId} />
      ) : (
        <div className="flex flex-col gap-md">
          <NewPlantFields
            name={plantName}
            species={species}
            location={location}
            onName={setPlantName}
            onSpecies={setSpecies}
            onLocation={setLocation}
          />
          <div className="flex flex-col gap-sm rounded-md bg-secondary-fixed/20 px-md py-sm lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-label-md font-label-md text-on-surface">
                {suggesting ? "正在生成养护参数" : careProfile ? "已生成养护参数" : "输入品种后自动生成养护参数"}
              </p>
              {careSuggestion ? (
                <p className="text-label-sm font-label-sm text-on-surface-variant">
                  来源：{careSuggestion.source === "llm" ? "LLM" : careSuggestion.source === "template" ? "品种模板" : "默认模板"}
                  {careSuggestion.usedLlm ? "，认领前请确认数值" : "，可手动调整"}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => requestCareProfile(true)}
              disabled={!species.trim() || suggesting}
              className="inline-flex items-center gap-xs rounded-full border border-outline-variant px-md py-sm text-label-md font-label-md text-primary hover:bg-primary-container disabled:opacity-50"
            >
              <Icon name={suggesting ? "progress_activity" : "auto_awesome"} />
              {careProfile ? "重新生成" : "生成"}
            </button>
          </div>
          {suggestError ? (
            <p className="rounded-md bg-error-container px-md py-sm text-body-sm text-on-error-container">
              {suggestError}
            </p>
          ) : null}
          {careSuggestion?.notes.length ? (
            <ul className="flex flex-col gap-xs text-label-sm font-label-sm text-on-surface-variant">
              {careSuggestion.notes.map((note) => (
                <li key={note} className="flex gap-xs">
                  <Icon name="info" className="text-[16px] text-primary" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {careProfile ? (
            <CareProfileEditor
              value={careProfile}
              onChange={(next) => {
                setCareProfile(next);
                setProfileEdited(true);
              }}
            />
          ) : null}
        </div>
      )}

      <div className="sticky bottom-0 -mx-lg mt-auto flex justify-end gap-sm border-t border-surface-container-highest/50 bg-surface-container-lowest/95 px-lg py-md backdrop-blur-sm sm:-mx-xl sm:px-xl">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-lg py-sm text-label-md font-label-md text-primary hover:bg-primary-container"
        >
          取消
        </button>
        <button
          type="button"
          onClick={handleClaim}
          disabled={!canClaim || claiming}
          className="inline-flex items-center gap-sm rounded-full bg-primary px-lg py-sm text-label-md font-label-md text-on-primary disabled:opacity-50"
        >
          <Icon name={claiming ? "progress_activity" : "verified"} />
          {claiming ? "认领中" : "认领"}
        </button>
      </div>
    </div>
  );
}
