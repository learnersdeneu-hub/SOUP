import { StatusChip } from "@/components/ui";
import { credentialStatusToChip } from "@/lib/statusMap";

type CredentialRow = {
  id: string;
  verificationStatus: string;
  educationDetail?: { institutionName: string; degreeType: string } | null;
  employmentDetail?: { employerName: string; jobTitle: string } | null;
  identityDetail?: { documentType: string; documentCountry: string } | null;
  financialDetail?: { attestingInstitutionName: string; attestationCategory: string } | null;
};

function labelFor(c: CredentialRow): string {
  if (c.educationDetail) return `${c.educationDetail.degreeType} — ${c.educationDetail.institutionName}`;
  if (c.employmentDetail) return `${c.employmentDetail.jobTitle} — ${c.employmentDetail.employerName}`;
  if (c.identityDetail) return `${c.identityDetail.documentType} (${c.identityDetail.documentCountry})`;
  if (c.financialDetail)
    return `${c.financialDetail.attestationCategory} — ${c.financialDetail.attestingInstitutionName}`;
  return "Credential";
}

export function CredentialList({ items }: { items: CredentialRow[] }) {
  if (items.length === 0) {
    return <p className="text-xs text-mute">Nothing added yet.</p>;
  }
  return (
    <div className="space-y-1.5">
      {items.map((c) => (
        <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-paper">
          <span className="text-xs text-ink">{labelFor(c)}</span>
          <StatusChip status={credentialStatusToChip(c.verificationStatus)} />
        </div>
      ))}
    </div>
  );
}
