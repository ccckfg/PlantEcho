import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { PlantSummary } from "@dyn/shared";
import { api, type PlantPhoto } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { useSyncRefresh } from "@/hooks/useSyncRefresh";
import { Empty, Icon } from "@/components/UI";
import { AlbumUploadPanel } from "@/components/album/AlbumUploadPanel";
import { PhotoCard, type AlbumPhoto } from "@/components/album/PhotoCard";

const monthLabel = (dateText: string): string =>
  new Date(dateText).toLocaleDateString("zh-CN", { year: "numeric", month: "long" });

const toAlbumPhoto = (
  photo: PlantPhoto,
  plant: PlantSummary | undefined
): AlbumPhoto => ({
  id: photo.id,
  src: photo.contentUrl,
  plantId: photo.plantId,
  plantName: plant?.name ?? photo.plantId,
  caption: photo.caption,
  capturedAt: photo.capturedAt,
  monthLabel: monthLabel(photo.capturedAt)
});

export function AlbumPage() {
  const [searchParams] = useSearchParams();
  const plantsRefresh = useSyncRefresh({ resources: ["plants"] });
  const photosRefresh = useSyncRefresh({ resources: ["photos"] });
  const plantsState = useAsync(() => api.listPlants(), [plantsRefresh]);
  const [filter, setFilter] = useState<"date" | "plant">("date");
  const [activePlant, setActivePlant] = useState<string | "all">("all");
  const [showUpload, setShowUpload] = useState(false);
  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (searchParams.get("upload") === "1") setShowUpload(true);
  }, [searchParams]);

  useEffect(() => {
    const plants = plantsState.data?.plants;
    if (!plants) return;
    let cancelled = false;
    const loadPhotos = async () => {
      try {
        const entries = await Promise.all(
          plants.map(async (plant) => ({
            plant,
            photos: (await api.listPhotos(plant.id)).photos
          }))
        );
        if (cancelled) return;
        const next = entries.flatMap(({ plant, photos: rows }) =>
          rows.map((photo) => toAlbumPhoto(photo, plant))
        );
        setPhotos(next.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt)));
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "相册加载失败");
      }
    };
    void loadPhotos();
    return () => {
      cancelled = true;
    };
  }, [plantsState.data, photosRefresh]);

  const grouped = useMemo(() => {
    const filtered =
      activePlant === "all" ? photos : photos.filter((photo) => photo.plantId === activePlant);
    const map = new Map<string, AlbumPhoto[]>();
    for (const photo of filtered) {
      map.set(photo.monthLabel, [...(map.get(photo.monthLabel) ?? []), photo]);
    }
    return Array.from(map.entries());
  }, [photos, activePlant]);

  const plants = plantsState.data?.plants ?? [];

  const deletePhoto = async (photo: AlbumPhoto) => {
    await api.deletePhoto(photo.plantId, photo.id);
    setPhotos((prev) => prev.filter((item) => item.id !== photo.id));
  };

  return (
    <div className="px-margin-desktop py-xl flex flex-col h-full">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-xl">
        <div>
          <h1 className="font-display text-headline-xl text-on-surface mb-sm">相册</h1>
          <p className="font-body text-body-md text-on-surface-variant">
            把它每一次的小变化都收下来。
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowUpload((value) => !value)}
          className="group rounded-full ring-1 ring-secondary-fixed-dim bg-surface-container-lowest px-lg py-sm font-label-md text-label-md text-primary transition-all duration-200 ease-standard hover:bg-secondary-container/40 hover:ring-secondary-fixed active:scale-[0.98] flex items-center gap-sm self-start md:self-auto focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <Icon
            name={showUpload ? "close" : "upload"}
            className={`transition-transform duration-300 ease-emphasized ${showUpload ? "rotate-90" : "group-hover:-translate-y-0.5"}`}
          />
          {showUpload ? "收起上传" : "上传照片"}
        </button>
      </header>

      {showUpload && plants.length > 0 ? (
        <div className="mb-xl">
          <AlbumUploadPanel
            plants={plants}
            onUploaded={({ photo, plantName }) => {
              setPhotos((prev) => [
                toAlbumPhoto(photo, plants.find((plant) => plant.id === photo.plantId) ?? {
                  id: photo.plantId,
                  name: plantName,
                  species: "",
                  location: "",
                  avatarUrl: null,
                  careProfile: plants[0].careProfile
                }),
                ...prev
              ]);
              setShowUpload(false);
            }}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-sm mb-xl">
        {[
          { key: "date", label: "按日期", icon: "calendar_month" },
          { key: "plant", label: "按植物", icon: "local_florist" }
        ].map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setFilter(opt.key as typeof filter)}
            className={`group px-md py-sm rounded-full font-label-md text-label-md flex items-center gap-xs transition-all duration-250 ease-standard active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-primary/40 ${
              filter === opt.key
                ? "ring-1 ring-secondary-fixed bg-secondary-container/50 text-primary shadow-leaf"
                : "ring-1 ring-outline-variant/70 bg-surface-container-lowest text-on-surface-variant hover:ring-secondary-fixed-dim hover:bg-secondary-container/20 hover:text-primary"
            }`}
          >
            <Icon
              name={opt.icon}
              className="text-[18px] transition-transform duration-300 ease-emphasized group-hover:scale-110"
            />
            {opt.label}
          </button>
        ))}
        {filter === "plant" ? (
          <PlantFilters plants={plants} activePlant={activePlant} onChange={setActivePlant} />
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto scroll-area pb-xl">
        {plantsState.loading && !plantsState.data ? (
          <AlbumSkeleton />
        ) : error ? (
          <Empty icon="cloud_off" title="相册加载失败" description={error} />
        ) : grouped.length === 0 ? (
          <Empty
            icon="photo_camera"
            title="还没有照片"
            description="也许等它再长一点，再为它拍一张？"
          />
        ) : (
          <div className="flex flex-col gap-xxl">
            {grouped.map(([month, items]) => (
              <section key={month}>
                <h2 className="font-display text-headline-md text-on-surface mb-md">{month}</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-md md:gap-lg">
                  {items.map((photo) => (
                    <PhotoCard key={photo.id} photo={photo} onDelete={deletePhoto} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PlantFilters({
  plants,
  activePlant,
  onChange
}: {
  plants: PlantSummary[];
  activePlant: string | "all";
  onChange: (value: string | "all") => void;
}) {
  return (
    <div className="flex items-center gap-xs flex-wrap pl-sm">
      <button
        type="button"
        onClick={() => onChange("all")}
        className={`px-md py-xs rounded-full text-label-sm font-label-sm ring-1 transition-all duration-200 ease-standard active:scale-[0.97] ${
          activePlant === "all"
            ? "ring-primary text-primary bg-secondary-container/40"
            : "ring-outline-variant text-on-surface-variant hover:ring-secondary-fixed-dim hover:text-primary"
        }`}
      >
        全部
      </button>
      {plants.map((plant) => (
        <button
          key={plant.id}
          type="button"
          onClick={() => onChange(plant.id)}
          className={`px-md py-xs rounded-full text-label-sm font-label-sm ring-1 transition-all duration-200 ease-standard active:scale-[0.97] ${
            activePlant === plant.id
              ? "ring-primary text-primary bg-secondary-container/40"
              : "ring-outline-variant text-on-surface-variant hover:ring-secondary-fixed-dim hover:text-primary"
          }`}
        >
          {plant.name}
        </button>
      ))}
    </div>
  );
}

function AlbumSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-md md:gap-lg">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="aspect-square bg-surface-container rounded-md animate-pulse" />
      ))}
    </div>
  );
}
