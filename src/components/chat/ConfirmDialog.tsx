"use client";

export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  danger,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white p-5"
      >
        <div className="text-sm font-semibold text-ink mb-2">{title}</div>
        <p className="text-xs leading-relaxed text-mute mb-5">{description}</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 text-sm font-medium rounded-xl py-2.5 border border-hair text-ink"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={
              "flex-1 text-sm font-medium rounded-xl py-2.5 text-white " +
              (danger ? "bg-[#B3261E]" : "bg-navy")
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
