import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../../config/env.js";
import { photoConfig } from "../../config/photos.js";
import { getDb } from "../../db/connection.js";
import { nowIso } from "../../shared/time.js";

const MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif"
};

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

type PhotoRow = {
  id: string;
  plant_id: string;
  file_name: string;
  mime_type: string;
  content_path: string;
  caption: string;
  captured_at: string;
  created_at: string;
};

interface PhotoInput {
  fileName: string;
  dataUrl: string;
  caption?: string;
  capturedAt?: string;
}

const photoDir = (): string => path.join(env.dataDir, "uploads", "photos");

const toPhoto = (row: PhotoRow): PlantPhoto => ({
  id: row.id,
  plantId: row.plant_id,
  fileName: row.file_name,
  mimeType: row.mime_type,
  contentUrl: `/media/photos/${row.id}`,
  caption: row.caption,
  capturedAt: row.captured_at,
  createdAt: row.created_at
});

const safeFileName = (name: string): string =>
  name.replace(/[^\w .-]/g, "_").slice(0, 120) || "photo";

const decodeDataUrl = (dataUrl: string): { mimeType: string; bytes: Buffer } => {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) throw new Error("Invalid image data URL");

  const mimeType = match[1].toLowerCase();
  if (!MIME_EXT[mimeType]) throw new Error(`Unsupported image type: ${mimeType}`);

  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length) throw new Error("Image is empty");
  if (bytes.byteLength > photoConfig.maxStoredImageBytes) {
    throw new Error(`Image exceeds ${photoConfig.maxStoredImageSizeLabel} storage limit`);
  }
  return { mimeType, bytes };
};

export const createPlantPhoto = async (
  plantId: string,
  input: PhotoInput
): Promise<PlantPhoto> => {
  const { mimeType, bytes } = decodeDataUrl(input.dataUrl);
  const id = randomUUID();
  const storedFileName = `${id}${MIME_EXT[mimeType]}`;
  const dir = photoDir();
  const contentPath = path.join(dir, storedFileName);
  const now = nowIso();

  await mkdir(dir, { recursive: true });
  await writeFile(contentPath, bytes);

  getDb()
    .prepare(
      `INSERT INTO plant_photos
       (id, plant_id, file_name, mime_type, content_path, caption, captured_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      plantId,
      safeFileName(input.fileName),
      mimeType,
      contentPath,
      input.caption?.trim() ?? "",
      input.capturedAt ?? now,
      now
    );

  return getPlantPhoto(id)!;
};

export const getPlantPhoto = (id: string): PlantPhoto | null => {
  const row = getDb().prepare("SELECT * FROM plant_photos WHERE id = ?").get(id) as
    | PhotoRow
    | undefined;
  return row ? toPhoto(row) : null;
};

export const listPlantPhotos = (plantId: string): PlantPhoto[] => {
  const rows = getDb()
    .prepare("SELECT * FROM plant_photos WHERE plant_id = ? ORDER BY captured_at DESC, id DESC")
    .all(plantId) as PhotoRow[];
  return rows.map(toPhoto);
};

export const readPhotoBytes = async (
  id: string
): Promise<{ photo: PlantPhoto; bytes: Buffer } | null> => {
  const row = getDb().prepare("SELECT * FROM plant_photos WHERE id = ?").get(id) as
    | PhotoRow
    | undefined;
  if (!row) return null;
  return { photo: toPhoto(row), bytes: await readFile(row.content_path) };
};

const isStoredPhotoPath = (contentPath: string): boolean => {
  const root = path.resolve(photoDir());
  const target = path.resolve(contentPath);
  return target.startsWith(`${root}${path.sep}`);
};

const deletePhotoFile = async (contentPath: string): Promise<void> => {
  if (!isStoredPhotoPath(contentPath)) return;
  try {
    await unlink(contentPath);
  } catch {
    // The database row is the source of truth; a failed unlink only leaves an orphaned file.
  }
};

export const deletePlantPhoto = async (
  plantId: string,
  photoId: string
): Promise<{ photo: PlantPhoto; avatarCleared: boolean } | null> => {
  const row = getDb()
    .prepare("SELECT * FROM plant_photos WHERE id = ? AND plant_id = ?")
    .get(photoId, plantId) as PhotoRow | undefined;
  if (!row) return null;

  const photo = toPhoto(row);
  const db = getDb();
  const currentAvatar = db
    .prepare("SELECT avatar_url FROM plants WHERE id = ?")
    .get(plantId) as { avatar_url: string | null } | undefined;
  const avatarCleared = currentAvatar?.avatar_url === photo.contentUrl;

  db.exec("BEGIN");
  try {
    db.prepare("DELETE FROM plant_photos WHERE id = ? AND plant_id = ?").run(photoId, plantId);
    if (avatarCleared) {
      db.prepare("UPDATE plants SET avatar_url = NULL, updated_at = ? WHERE id = ?")
        .run(nowIso(), plantId);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  await deletePhotoFile(row.content_path);
  return { photo, avatarCleared };
};
