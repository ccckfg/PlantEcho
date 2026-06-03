import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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

const toAlbumPhoto = (photo: PlantPhoto, plant: PlantSummary | undefined): AlbumPhoto => ({
  id: photo.id,
  src: photo.contentUrl,
  plantId: photo.plantId,
  plantName: plant?.name ?? photo.plantId,
  caption: photo.caption,
  capturedAt: photo.capturedAt,
  monthLabel: monthLabel(photo.capturedAt)
});

export function MobileAlbumPage() {
  const [searchParams] = useSearchParams();
  const plantsRefresh = useSyncRefresh({ resources: ["plants"] });
  const photosRefresh = useSyncRefresh({ resources: ["photos"] });
  const plantsState = useAsync(() => api.listPlants(), [plantsRefresh]);
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
          plants.map(async (plant) => ({ plant, photos: (await api.listPhotos(plant.id)).photos }))
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
    const filtered = activePlant === "all" ? photos : photos.filter((p) => p.plantId === activePlant);
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
    <div className="flex h-full flex-col px-margin-mobile py-md">
      <header className="mb-sm flex items-end justify-between gap-md">
        <div>
          <h1 className="font-display text-title-lg font-bold text-on-surface leading-tight">相册</h1>
          <p className="mt-[2px] font-body text-body-sm text-on-surface-variant">把它每一次的小变化都收下来。</p>
        </div>
        <button
          type="button"
          onClick={() => setShowUpload(true)}
          className="group flex shrink-0 items-center gap-xs rounded-full bg-surface-container-lowest px-md py-sm font-label-md text-label-md text-primary ring-1 ring-secondary-fixed-dim transition-all duration-200 ease-standard hover:bg-secondary-container/40 active:scale-[0.98]"
        >
          <Icon name="upload" className="transition-transform duration-300 group-hover:-translate-y-0.5" />
          上传
        </button>
      </header>

      {showUpload && plants.length > 0
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center p-md bg-inverse-surface/30 backdrop-blur-sm dialog-backdrop-in">
              <div
                className="absolute inset-0"
                onClick={() => setShowUpload(false)}
              />
              <div className="dialog-pop-in relative w-full max-w-[420px] rounded-lg bg-surface-container-lowest ring-1 ring-surface-container-highest/60 shadow-modal p-md max-h-[90vh] overflow-y-auto">
                <header className="flex items-center justify-between mb-md pb-xs border-b border-hairline">
                  <h3 className="font-display text-title-md font-bold text-on-surface">上传到相册</h3>
                  <button
                    type="button"
                    onClick={() => setShowUpload(false)}
                    className="grid h-8 w-8 place-items-center rounded-full text-on-surface-variant transition-all duration-200 hover:bg-surface-container active:scale-90"
                    aria-label="关闭"
                  >
                    <Icon name="close" className="text-[18px]" />
                  </button>
                </header>
                <AlbumUploadPanel
                  plants={plants}
                  className="p-0 bg-transparent"
                  onUploaded={({ photo, plantName }) => {
                    setPhotos((prev) => [
                      toAlbumPhoto(
                        photo,
                        plants.find((plant) => plant.id === photo.plantId) ?? {
                          id: photo.plantId,
                          name: plantName,
                          species: "",
                          location: "",
                          avatarUrl: null,
                          careProfile: plants[0].careProfile
                        }
                      ),
                      ...prev
                    ]);
                    setShowUpload(false);
                  }}
                />
              </div>
            </div>,
            document.body
          )
        : null}

      {plants.length > 0 ? (
        <div className="relative w-full">
          {/* 右侧环境渐变遮罩：在横向滚动边缘提供羽化渐隐，消除生硬的物理截断感，pointer-events-none 避开点击交互 */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-l from-surface to-transparent" />
          
          {/* 选项卡滚动层：使用负外边距 -mx-margin-mobile 撑满屏幕宽度，用正内边距 px-margin-mobile 保持初始排版对齐。增加 pt-xs (4px) 顶部边距防止 overflow-x-auto 的垂直裁剪 */}
          <div className="scroll-area mb-md flex items-center gap-xs overflow-x-auto pt-xs pb-xs -mx-margin-mobile px-margin-mobile">
            <FilterChip label="全部" active={activePlant === "all"} onClick={() => setActivePlant("all")} />
            {plants.map((plant) => (
              <FilterChip
                key={plant.id}
                label={plant.name}
                active={activePlant === plant.id}
                onClick={() => setActivePlant(plant.id)}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="scroll-area flex-1 overflow-y-auto pb-xl">
        {plantsState.loading ? (
          <AlbumSkeleton />
        ) : error ? (
          <Empty icon="cloud_off" title="相册加载失败" description={error} />
        ) : grouped.length === 0 ? (
          <Empty icon="photo_camera" title="还没有照片" description="也许等它再长一点，再为它拍一张？" />
        ) : (
          <div className="flex flex-col gap-xl">
            {grouped.map(([month, items]) => (
              <section key={month}>
                <h2 className="mb-sm font-display text-headline-sm text-on-surface">{month}</h2>
                <div className="grid grid-cols-2 gap-sm">
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

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full px-md py-xs text-label-sm font-label-sm ring-1 transition-all duration-200 ease-standard active:scale-[0.97] ${
        active
          ? "bg-secondary-container/50 text-primary ring-secondary-fixed"
          : "bg-surface-container-lowest text-on-surface-variant ring-outline-variant/70 hover:text-primary"
      }`}
    >
      {label}
    </button>
  );
}

function AlbumSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-sm">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="aspect-square animate-pulse rounded-md bg-surface-container" />
      ))}
    </div>
  );
}
