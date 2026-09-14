import { CheckCircle2, Clock, AlertCircle, MinusCircle } from "lucide-react";

export function VerificationStamp({ size = 16 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full flex-shrink-0 bg-teal"
      style={{ width: size + 8, height: size + 8 }}
    >
      <CheckCircle2 size={size} color="white" strokeWidth={2.5} />
    </span>
  );
}

export type ChipStatus = "verified" | "pending" | "missing" | "optional" | "required";

const STATUS_MAP: Record<
  ChipStatus,
  { icon: typeof CheckCircle2; label: string; className: string }
> = {
  verified: { icon: CheckCircle2, label: "Verified", className: "text-teal bg-[#EAF5F3]" },
  pending: { icon: Clock, label: "Pending", className: "text-mute bg-[#F1F1F1]" },
  missing: { icon: AlertCircle, label: "Missing", className: "text-ink bg-[#EDEDED]" },
  optional: { icon: MinusCircle, label: "Optional", className: "text-mute bg-[#F1F1F1]" },
  required: { icon: AlertCircle, label: "Required", className: "text-navy bg-[#EAF0F5]" },
};

export function StatusChip({ status }: { status: ChipStatus }) {
  const s = STATUS_MAP[status] || STATUS_MAP.optional;
  const Icon = s.icon;
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium flex-shrink-0 " +
        s.className
      }
    >
      <Icon size={12} strokeWidth={2.5} />
      {s.label}
    </span>
  );
}
