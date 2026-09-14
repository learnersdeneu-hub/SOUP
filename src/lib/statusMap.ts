import type { ChipStatus } from "@/components/ui";

// Maps the real CredentialStatus enum onto the UI's ChipStatus vocabulary.
export function credentialStatusToChip(status: string): ChipStatus {
  switch (status) {
    case "VERIFIED":
      return "verified";
    case "PENDING_VERIFICATION":
      return "pending";
    case "REJECTED":
    case "DISPUTED":
    case "INSUFFICIENT_EVIDENCE":
    case "EXPIRED":
      return "missing";
    case "DRAFT":
    default:
      return "required";
  }
}
