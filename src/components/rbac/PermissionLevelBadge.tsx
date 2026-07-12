import type { AccessLevel } from "@/lib/permissions";
import { ACCESS_LEVEL_LABELS, levelBadgeClass } from "@/lib/permissions";

export function PermissionLevelBadge({ level }: { level: AccessLevel }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${levelBadgeClass(level)}`}>
      {ACCESS_LEVEL_LABELS[level]}
    </span>
  );
}
