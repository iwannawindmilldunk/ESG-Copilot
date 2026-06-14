import type { DisclosureStatus, IndicatorStatus, RiskLevel } from "@/types/esg";
import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  value: DisclosureStatus | RiskLevel | IndicatorStatus | string;
};

const styles: Record<string, string> = {
  已覆盖: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  部分覆盖: "bg-amber-50 text-amber-700 ring-amber-200",
  缺失: "bg-red-50 text-red-700 ring-red-200",
  已披露: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  部分披露: "bg-amber-50 text-amber-700 ring-amber-200",
  未披露: "bg-red-50 text-red-700 ring-red-200",
  低: "bg-slate-50 text-slate-700 ring-slate-200",
  中: "bg-amber-50 text-amber-700 ring-amber-200",
  高: "bg-red-50 text-red-700 ring-red-200",
  E: "bg-green-50 text-green-700 ring-green-200",
  S: "bg-blue-50 text-blue-700 ring-blue-200",
  G: "bg-indigo-50 text-indigo-700 ring-indigo-200",
};

export function StatusBadge({ value }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        styles[value] ?? "bg-ink-100 text-ink-700 ring-ink-300",
      )}
    >
      {value}
    </span>
  );
}
