import type { BulkDeviceActionInput, DeviceRecord } from "@dyn/shared";
import { Icon } from "@/components/UI";

export function DeviceBulkActions({
  devices,
  selectedIds,
  busy,
  onSelectAll,
  onClear,
  onAction
}: {
  devices: DeviceRecord[];
  selectedIds: string[];
  busy: boolean;
  onSelectAll: () => void;
  onClear: () => void;
  onAction: (action: BulkDeviceActionInput["action"]) => void;
}) {
  const selectedCount = selectedIds.length;
  const allSelected = devices.length > 0 && selectedCount === devices.length;
  return (
    <div className="flex flex-col gap-sm rounded-md bg-secondary-fixed/20 px-md py-sm md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-sm">
        <button
          type="button"
          onClick={allSelected ? onClear : onSelectAll}
          className="inline-flex items-center gap-xs rounded-full px-md py-xs text-label-md font-label-md text-primary hover:bg-primary-container/40"
        >
          <Icon name={allSelected ? "check_box" : "check_box_outline_blank"} />
          {allSelected ? "取消全选" : "全选"}
        </button>
        <span className="text-body-sm text-on-surface-variant">
          已选择 {selectedCount} 个设备
        </span>
      </div>
      <div className="flex flex-wrap gap-xs">
        {[
          { action: "disable", label: "批量停用", icon: "pause_circle" },
          { action: "enable", label: "批量启用", icon: "play_circle" },
          { action: "delete", label: "批量删除", icon: "delete" }
        ].map((item) => (
          <button
            key={item.action}
            type="button"
            onClick={() => onAction(item.action as BulkDeviceActionInput["action"])}
            disabled={!selectedCount || busy}
            className="inline-flex items-center gap-xs rounded-full px-md py-xs text-label-md font-label-md text-primary hover:bg-primary-container/40 disabled:opacity-50"
          >
            <Icon name={busy ? "progress_activity" : item.icon} />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
