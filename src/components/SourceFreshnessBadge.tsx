import { sourceFreshness } from "@/lib/student/status";

export function SourceFreshnessBadge({ checkedAt }: { checkedAt?: Date | string | null }) {
  const freshness = sourceFreshness(checkedAt);
  const cls = freshness.state === "CURRENT" ? "bg-[#F0F7F5] text-teal" : freshness.state === "AGING" ? "bg-[#FFF7DF] text-[#80651A]" : "bg-[#FFF0F0] text-[#9A3434]";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${cls}`}>{freshness.label}</span>;
}
