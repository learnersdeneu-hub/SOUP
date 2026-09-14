export type AttachmentCandidate = {
  id: string;
  title: string;
  applicationId: string | null;
  superseded: boolean;
};

function normalized(value: unknown): string {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export type AttachmentSelection =
  | { kind: "match"; itemId: string }
  | { kind: "ambiguous" }
  | { kind: "none" };

export function selectAttachmentCandidate(input: {
  candidates: AttachmentCandidate[];
  checklistItemId?: string | null;
  requestedLabel?: string | null;
  applicationId?: string | null;
}): AttachmentSelection {
  const active = input.candidates.filter((candidate) => !candidate.superseded);
  if (input.checklistItemId) {
    const explicit = active.find((candidate) => candidate.id === input.checklistItemId && (!input.applicationId || candidate.applicationId === input.applicationId));
    return explicit ? { kind: "match", itemId: explicit.id } : { kind: "none" };
  }

  const label = normalized(input.requestedLabel);
  if (!label) return { kind: "none" };
  const matches = active.filter((candidate) => {
    if (input.applicationId && candidate.applicationId !== input.applicationId) return false;
    const title = normalized(candidate.title);
    return title === label || title.includes(label) || label.includes(title);
  });
  if (matches.length > 1) return { kind: "ambiguous" };
  return matches.length === 1 ? { kind: "match", itemId: matches[0].id } : { kind: "none" };
}
