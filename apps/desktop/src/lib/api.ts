import type {
  CareProfile,
  CareProfileSuggestion,
  ClaimDeviceInput,
  DeviceRecord,
  EpisodeMemory,
  MemoryCitation,
  PlantHealthSummary,
  PlantStatus,
  PlantSummary,
  PendingDevice,
  SuggestCareProfileInput,
  Understanding
} from "@dyn/shared";
import {
  clearConnection,
  createBackendConnection,
  loadConnection,
  saveConnection,
  type BackendConnection,
  type BackendConnectionInput
} from "./connection";

let activeConnection = loadConnection();

export const getApiConnection = (): BackendConnection | null => activeConnection;

export const setApiConnection = (connection: BackendConnection): void => {
  activeConnection = connection;
  saveConnection(connection);
};

export const clearApiConnection = (): void => {
  activeConnection = null;
  clearConnection();
};

const requireConnection = (): BackendConnection => {
  if (!activeConnection) throw new Error("请先连接后端服务");
  return activeConnection;
};

export const apiUrl = (path: string): string => `${requireConnection().baseUrl}${path}`;
export const mediaUrl = (path: string): string =>
  /^(https?:|data:|blob:)/i.test(path) ? path : apiUrl(path);

const buildHeaders = (
  connection: BackendConnection,
  incoming?: HeadersInit,
  hasBody = false
): Headers => {
  const headers = new Headers(incoming);
  if (hasBody && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (connection.apiKey) {
    headers.set("x-api-key", connection.apiKey);
    headers.set("authorization", `Bearer ${connection.apiKey}`);
  }
  return headers;
};

export const buildApiHeaders = (incoming?: HeadersInit): Headers =>
  buildHeaders(requireConnection(), incoming);

const readErrorDetail = async (res: Response): Promise<string> => {
  try {
    return JSON.stringify(await res.json());
  } catch {
    return await res.text();
  }
};

export const testApiConnection = async (
  input: BackendConnectionInput
): Promise<BackendConnection> => {
  const connection = createBackendConnection(input);
  const res = await fetch(`${connection.baseUrl}/api/v1/auth/check`, {
    headers: buildHeaders(connection)
  });

  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(`HTTP ${res.status} on /api/v1/auth/check: ${detail}`);
  }

  return connection;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const connection = requireConnection();
  const hasBody = init?.body !== undefined && init.body !== null;
  const res = await fetch(`${connection.baseUrl}${path}`, {
    ...init,
    headers: buildHeaders(connection, init?.headers, hasBody)
  });
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(`HTTP ${res.status} on ${path}: ${detail}`);
  }
  return (await res.json()) as T;
}

const plantPath = (id: string, suffix = ""): string =>
  `/api/v1/plants/${encodeURIComponent(id)}${suffix}`;

export interface ReadingRow {
  id: number;
  capturedAt: string;
  soilRaw: number | null;
  soilPercent: number | null;
  airTempC: number | null;
  airHumidityPercent: number | null;
  lightLux: number | null;
  rssi: number | null;
  batteryMv: number | null;
}

export interface ReadingState {
  latest: ReadingRow | null;
  health: PlantHealthSummary;
}

export interface ChatTurn {
  turn: number;
  reply: string;
  usedLlm: boolean;
  usedMemoryIds: string[];
  memoryCitations: MemoryCitation[];
  llmError?: string;
}

export interface MessageRow {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export type MemoryRow = EpisodeMemory;
export type UnderstandingRow = Understanding;

export interface PlantPhoto {
  id: string;
  plantId: string;
  fileName: string;
  mimeType: string;
  contentUrl: string;
  caption: string;
  capturedAt: string;
  createdAt: string;
}

export interface PlantWithStatus {
  plant: PlantSummary;
  status: PlantStatus | null;
}

export interface WeatherNow {
  location: string;
  observedAt: string;
  temperatureC: number | null;
  feelsLikeC: number | null;
  humidityPercent: number | null;
  text: string;
  icon: string;
  windDir: string;
  windScale: string;
  windSpeedKph: number | null;
  precipMm: number | null;
  pressureHpa: number | null;
  visibilityKm: number | null;
  sourceUpdatedAt: string;
}

export interface WeatherNowResult {
  configured: boolean;
  weather: WeatherNow | null;
  cachedAt: string | null;
}

export interface DeviceClaimResult {
  device: DeviceRecord;
  deviceApiKey: string;
  deliveredToDevice?: boolean;
}

export interface PlantReflection {
  text: string;
  usedLlm: boolean;
  basis: string[];
}

export interface PlantStatusTags {
  tags: string[];
  usedLlm: boolean;
  basis: string[];
}

export const api = {
  health: () => request<{ ok: boolean; service: string }>("/health"),
  weatherNow: () => request<WeatherNowResult>("/api/v1/weather/now"),
  listDevices: () => request<{ devices: DeviceRecord[] }>("/api/v1/devices"),
  listPendingDevices: () =>
    request<{ devices: PendingDevice[] }>("/api/v1/devices/pending"),
  claimDevice: (deviceId: string, input: ClaimDeviceInput) =>
    request<DeviceClaimResult>(`/api/v1/devices/${encodeURIComponent(deviceId)}/claim`, {
      method: "POST",
      body: JSON.stringify(input)
    }),
  ignorePendingDevice: (deviceId: string) =>
    request<{ device: PendingDevice }>(
      `/api/v1/devices/${encodeURIComponent(deviceId)}/ignore`,
      { method: "POST" }
    ),
  rotateDeviceKey: (deviceId: string) =>
    request<DeviceClaimResult>(
      `/api/v1/devices/${encodeURIComponent(deviceId)}/rotate-key`,
      { method: "POST" }
    ),
  listPlants: () => request<{ plants: PlantSummary[] }>("/api/v1/plants"),
  suggestCareProfile: (input: SuggestCareProfileInput) =>
    request<{ suggestion: CareProfileSuggestion }>("/api/v1/plants/care-profile/suggest", {
      method: "POST",
      body: JSON.stringify(input)
    }),
  getPlant: (id: string) => request<PlantWithStatus>(plantPath(id)),
  getPlantReflection: (id: string) =>
    request<{ reflection: PlantReflection }>(`/api/v1/plants/${encodeURIComponent(id)}/reflection`),
  getPlantStatusTags: (id: string) =>
    request<{ tags: PlantStatusTags }>(`/api/v1/plants/${encodeURIComponent(id)}/status-tags`),
  updatePlant: (
    id: string,
    input: { name?: string; careProfile?: CareProfile; avatarUrl?: string | null }
  ) =>
    request<{ plant: PlantSummary }>(`/api/v1/plants/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    }),
  latestReading: (id: string) =>
    request<ReadingState>(plantPath(id, "/readings/latest")),
  listReadings: (id: string, limit = 60) =>
    request<{ readings: ReadingRow[] }>(plantPath(id, `/readings?limit=${encodeURIComponent(String(limit))}`)),
  listMessages: (id: string) =>
    request<{ messages: MessageRow[] }>(plantPath(id, "/messages")),
  chat: (id: string, content: string) =>
    request<ChatTurn>(plantPath(id, "/chat"), {
      method: "POST",
      body: JSON.stringify({ content })
    }),
  listMemories: (id: string) =>
    request<{ memories: MemoryRow[] }>(plantPath(id, "/memories")),
  listUnderstandings: (id: string) =>
    request<{ understandings: UnderstandingRow[] }>(plantPath(id, "/understandings")),
  listPhotos: (id: string) =>
    request<{ photos: PlantPhoto[] }>(plantPath(id, "/photos")),
  uploadPhoto: (
    id: string,
    input: { fileName: string; dataUrl: string; caption?: string; capturedAt?: string }
  ) =>
    request<{ photo: PlantPhoto }>(plantPath(id, "/photos"), {
      method: "POST",
      body: JSON.stringify(input)
    }),
  deletePhoto: (plantId: string, photoId: string) =>
    request<{ photo: PlantPhoto }>(
      `/api/v1/plants/${encodeURIComponent(plantId)}/photos/${encodeURIComponent(photoId)}`,
      { method: "DELETE" }
    ),
  createPlant: (input: {
    name: string;
    species: string;
    location?: string;
    avatarUrl?: string | null;
    careProfile?: CareProfile;
  }) =>
    request<{ plant: PlantSummary }>("/api/v1/plants", {
      method: "POST",
      body: JSON.stringify(input)
    })
};
