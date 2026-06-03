import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { PlantSummary } from "@dyn/shared";
import { useToast } from "@/components/Toast";
import { Icon } from "@/components/UI";
import { api } from "@/lib/api";
import { PlantDeleteConfirmDialog } from "./PlantDeleteConfirmDialog";

interface PlantDeleteButtonProps {
  plant: PlantSummary;
  className?: string;
  label?: string;
}

const defaultClassName =
  "group flex items-center gap-sm rounded-full bg-surface-container-lowest px-lg py-sm font-label-md text-label-md text-error ring-1 ring-error/25 transition-all duration-200 ease-standard hover:bg-error-container/25 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-error/35";

export function PlantDeleteButton({
  plant,
  className = defaultClassName,
  label = "删除这棵植物"
}: PlantDeleteButtonProps) {
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const restoreDeletedPlant = () => {
    void (async () => {
      try {
        await api.restorePlant(plant.id);
        navigate(`/plant/${encodeURIComponent(plant.id)}`, { replace: true });
        toast.show({
          title: `${plant.name} 回来了`,
          description: "它的记录还在，我们继续慢慢照看。",
          tone: "success"
        });
      } catch (caught) {
        toast.show({
          title: "暂时没能把它请回来",
          description: caught instanceof Error ? caught.message : "请稍后再试一次。",
          tone: "warning"
        });
      }
    })();
  };

  const deletePlant = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await api.deletePlant(plant.id);
      navigate("/", { replace: true });
      toast.show({
        title: `${plant.name} 已先回到安静处`,
        description: "5 秒内可以撤销，它的记录会一起回来。",
        tone: "warning",
        action: {
          label: "撤销",
          onClick: restoreDeletedPlant
        }
      });
    } catch (caught) {
      setDeleting(false);
      setConfirming(false);
      toast.show({
        title: "这次没有删掉",
        description: caught instanceof Error ? caught.message : "我们暂时联系不上 PlantEcho 的家。",
        tone: "warning"
      });
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={deleting}
        className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <Icon
          name={deleting ? "progress_activity" : "delete"}
          className={`${deleting ? "animate-spin" : "transition-transform duration-300 ease-emphasized group-hover:scale-110"}`}
        />
        {label}
      </button>
      {confirming ? (
        <PlantDeleteConfirmDialog
          plant={plant}
          busy={deleting}
          onClose={() => setConfirming(false)}
          onConfirm={() => void deletePlant()}
        />
      ) : null}
    </>
  );
}
