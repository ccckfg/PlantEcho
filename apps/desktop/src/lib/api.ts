import type {
  CareProfile,
  CareProfileSuggestion,
  CareRecord,
  CreateCareRecordInput,
  EpisodeMemory,
  MemoryCitation,
  PlantHealthSummary,
  LayeredPlantState,
  PlantSummary,
  SuggestCareProfileInput,
  Understanding
} from "@dyn/shared";
import {
  clearConnection,
  loadConnection,
  saveConnection,
  type BackendConnection,
  type BackendConnectionInput
} from "./connection";
import { loginWithPassword } from "./authApi";
import { getClientTimezone } from "./timezone";

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
  if (connection.token) {
    headers.set("authorization", `Bearer ${connection.token}`);
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
  const connection = await loginWithPassword(input);
  const res = await fetch(`${connection.baseUrl}/api/v1/auth/check`, {
    headers: buildHeaders(connection)
  });

  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(`HTTP ${res.status} on /api/v1/auth/check: ${detail}`);
  }

  return connection;
};

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
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
  state: LayeredPlantState;
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

export interface PlantReflection {
  text: string;
  usedLlm: boolean;
  basis: string[];
}

export interface PlantStatusTags {
  primary: {
    key: "online" | "offline";
    label: "在线" | "离线";
    source: "rule";
  };
  secondary: {
    tags: string[];
    source: "llm" | "none";
    sourceTurn: number | null;
    updatedAt: string | null;
    expiresAt: string | null;
  };
}

export const api = {
  health: () => request<{ ok: boolean; service: string }>("/health"),
  weatherNow: () => request<WeatherNowResult>("/api/v1/weather/now"),
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
    input: {
      name?: string;
      backgroundInfo?: string;
      careProfile?: CareProfile;
      avatarUrl?: string | null;
    }
  ) =>
    request<{ plant: PlantSummary }>(`/api/v1/plants/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    }),
  deletePlant: (id: string) =>
    request<{ plant: PlantSummary }>(plantPath(id), {
      method: "DELETE"
    }),
  restorePlant: (id: string) =>
    request<{ plant: PlantSummary }>(plantPath(id, "/restore"), {
      method: "POST"
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
      body: JSON.stringify({ content, timezone: getClientTimezone() })
    }),
  listMemories: (id: string) =>
    request<{ memories: MemoryRow[] }>(plantPath(id, "/memories")),
  listUnderstandings: (id: string) =>
    request<{ understandings: UnderstandingRow[] }>(plantPath(id, "/understandings")),
  listCareRecords: (id: string, limit = 50) =>
    request<{ records: CareRecord[] }>(
      plantPath(id, `/care-records?limit=${encodeURIComponent(String(limit))}`)
    ),
  createCareRecord: (id: string, input: CreateCareRecordInput) =>
    request<{ record: CareRecord }>(plantPath(id, "/care-records"), {
      method: "POST",
      body: JSON.stringify(input)
    }),
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
    backgroundInfo?: string;
    avatarUrl?: string | null;
    careProfile?: CareProfile;
  }) =>
    request<{ plant: PlantSummary }>("/api/v1/plants", {
      method: "POST",
      body: JSON.stringify(input)
    })
};
