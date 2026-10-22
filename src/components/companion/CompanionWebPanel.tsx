"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, GripVertical } from "lucide-react";
import { getDocumentSignedUrl } from "@/app/actions/documents";
import { CATEGORY_CONFIG, DOCUMENT_CATEGORIES, CATEGORY_DOCUMENT_TYPE, type DocumentCategory } from "@/lib/documents/categories";
import type { AnswerBankResult } from "@/lib/companion/answerBank";

type Props = AnswerBankResult & { studentName: string };

const ANSWER_GROUPS: Array<{ label: string; fields: string[] }> = [
  { label: "Personal", fields: ["firstName", "lastName", "fullName", "dateOfBirth", "nationality", "currentCountry"] },
  { label: "Contact", fields: ["email"] },
  { label: "Academic", fields: ["targetDegreeLevel", "targetSubject", "preferredIntake", "academicBackground", "englishProficiency"] },
];

const FIELD_LABELS: Record<string, string> = {
  firstName: "First name", lastName: "Last name", fullName: "Full name", dateOfBirth: "Date of birth",
  nationality: "Nationality", currentCountry: "Current country", email: "Email address",
  targetDegreeLevel: "Target degree level", targetSubject: "Target subject", preferredIntake: "Preferred intake",
  academicBackground: "Academic background", englishProficiency: "English proficiency",
};

const QUICK_SITES = [
  { label: "UCAS", href: "https://www.ucas.com", color: "bg-[#E9EEFB] text-[#1F3FA8]" },
  { label: "Common App", href: "https://www.commonapp.org", color: "bg-[#F1E9FA] text-[#6A3FA0]" },
];

const EXTENSION_MIME: Record<string, string> = {
  pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function guessMimeType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return EXTENSION_MIME[ext] || "application/octet-stream";
}

function CopyRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API can be blocked (permissions, older embedded webviews) —
      // the value is still shown as plain selectable text, so the student
      // can always copy it manually even if this fails silently.
    }
  }
  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ${highlight ? "bg-[#E8F4EF]" : "bg-paper"}`}>
      <div className="min-w-0">
        <div className="text-[10.5px] text-mute">{label}</div>
        <div className="mt-0.5 truncate text-[13px] font-semibold text-ink">{value}</div>
      </div>
      <button onClick={copy} className={`inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold ${copied ? "bg-teal text-white" : "border border-hair bg-white text-ink"}`}>
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function DocumentRow({ id, fileName, uploadedAt, signedUrl }: { id: string; fileName: string; uploadedAt: Date; signedUrl: string | undefined }) {
  const [opening, setOpening] = useState(false);
  async function open() {
    setOpening(true);
    try {
      const url = signedUrl || (await getDocumentSignedUrl(id));
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setOpening(false);
    }
  }
  function onDragStart(event: React.DragEvent) {
    if (!signedUrl) return;
    // The non-standard "DownloadURL" drag type is what lets a browser-based
    // drag end on a native file picker/input as a real dropped file — the
    // browser fetches the URL and hands the OS a file, the same mechanism
    // Gmail uses to let you drag an attachment out of the browser. Chrome
    // and Edge support it; Firefox and Safari don't, and touch devices have
    // no drag gesture at all, so the "Open" button beside every row (which
    // works everywhere) is always visible, not just a fallback.
    event.dataTransfer.setData("DownloadURL", `${guessMimeType(fileName)}:${fileName}:${signedUrl}`);
  }
  return (
    <div
      draggable={Boolean(signedUrl)}
      onDragStart={onDragStart}
      className="flex items-center gap-2.5 rounded-xl border border-hair bg-white px-3 py-3"
      title={signedUrl ? "On a computer, drag onto the file box on the real site. On your phone, tap Open." : "Preparing a secure link…"}
    >
      <GripVertical size={14} className={`hidden shrink-0 sm:block ${signedUrl ? "cursor-grab text-mute" : "text-[#D5D9D1]"}`} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12.5px] font-semibold text-ink">{fileName}</div>
        <div className="mt-0.5 text-[10.5px] text-mute">Uploaded {new Date(uploadedAt).toLocaleDateString()}</div>
      </div>
      <button onClick={open} disabled={opening} className="inline-flex min-h-[36px] shrink-0 items-center gap-1 rounded-lg border border-hair bg-white px-3 py-2 text-[11px] font-semibold text-ink disabled:opacity-50">
        <ExternalLink size={12} />{opening ? "Opening…" : "Open"}
      </button>
    </div>
  );
}

export function CompanionWebPanel({ studentName, answerBank, documents, applications }: Props) {
  const [tab, setTab] = useState<"answers" | "checklist" | "documents" | "noodles">("answers");
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (tab !== "documents" || documents.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        documents.map(async (doc) => {
          try {
            return [doc.id, await getDocumentSignedUrl(doc.id)] as const;
          } catch {
            return null;
          }
        })
      );
      if (cancelled) return;
      const next: Record<string, string> = {};
      for (const entry of entries) if (entry) next[entry[0]] = entry[1];
      setSignedUrls(next);
    })();
    return () => {
      cancelled = true;
    };
    // Re-fetches fresh 5-minute signed links each time the Documents tab is
    // opened, since the previous batch may already have expired.
  }, [tab, documents]);

  const documentsByCategory: Array<{ category: DocumentCategory; docs: typeof documents }> = DOCUMENT_CATEGORIES.map((category) => ({
    category,
    docs: documents.filter((doc) => doc.documentType === CATEGORY_DOCUMENT_TYPE[category]),
  })).filter((group) => group.docs.length > 0);

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans sm:min-h-0 sm:mx-auto sm:my-6 sm:max-w-[440px] sm:rounded-2xl sm:shadow-[0_0_0_1px_#E4E7E1]">
      <div className="flex shrink-0 items-center gap-2.5 bg-navy px-4 py-4">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#FFF4CC] text-sm">🍲</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[13.5px] font-extrabold text-white">Companion</span>
            <span className="rounded-md bg-[#FFF4CC] px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-wide text-ink">WEB · PRO</span>
          </div>
          <div className="mt-0.5 text-[11px] text-[#B9C4DB]">{studentName}</div>
        </div>
      </div>

      <div className="flex shrink-0 gap-1 bg-paper px-3 pt-2.5">
        {(["answers", "checklist", "documents", "noodles"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`min-h-[40px] rounded-t-[10px] px-3 py-2.5 text-[12.5px] font-semibold capitalize ${tab === key ? "bg-white text-ink" : "text-mute"}`}
          >
            {key}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === "answers" && (
          <div className="flex flex-col gap-4">
            {ANSWER_GROUPS.map((group) => {
              const entries = group.fields.filter((field) => answerBank[field]);
              if (entries.length === 0) return null;
              return (
                <div key={group.label}>
                  <div className="mb-2 text-[10.5px] font-bold uppercase tracking-[.08em] text-teal">{group.label}</div>
                  <div className="flex flex-col gap-1.5">
                    {entries.map((field, i) => (
                      <CopyRow key={field} label={FIELD_LABELS[field] || field} value={answerBank[field].value} highlight={i === 0 && group.label === "Personal"} />
                    ))}
                  </div>
                </div>
              );
            })}
            {Object.keys(answerBank).length === 0 && <p className="text-xs text-mute">Nothing saved to your SOUP profile yet — fill in Profile &amp; Details first.</p>}

            <div>
              <div className="mb-2 text-[10.5px] font-bold uppercase tracking-[.08em] text-teal">Open a site</div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_SITES.map((site) => (
                  <a key={site.label} href={site.href} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${site.color}`}>
                    {site.label} <ExternalLink size={10} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "checklist" && (
          <div className="flex flex-col gap-2">
            {applications.length === 0 && <p className="text-xs text-mute">No applications tracked yet.</p>}
            {applications.map((app) => (
              <div key={app.id} className="rounded-xl border border-hair bg-paper p-3">
                <div className="text-[12.5px] font-semibold text-ink">{app.university || "Application"}</div>
                <div className="mt-0.5 text-[11px] text-mute">{app.program || "Programme TBC"}{app.intake ? ` · ${app.intake}` : ""}</div>
                <div className="mt-1.5 inline-block rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-navy">{app.status}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "documents" && (
          <div className="flex flex-col gap-4">
            <p className="text-[11px] leading-5 text-mute">
              <span className="hidden sm:inline">On a computer, drag a document straight onto the file box on the real site (Chrome/Edge), or tap Open to download it and attach manually.</span>
              <span className="sm:hidden">Tap Open, then use Share → Save to Files (or your downloads), and attach it from there when the site asks for it.</span>
            </p>
            {documentsByCategory.length === 0 && <p className="text-xs text-mute">No processed documents yet.</p>}
            {documentsByCategory.map(({ category, docs }) => (
              <div key={category}>
                <div className="mb-2 text-[10.5px] font-bold uppercase tracking-[.08em] text-teal">{CATEGORY_CONFIG[category].label}</div>
                <div className="flex flex-col gap-1.5">
                  {docs.map((doc) => (
                    <DocumentRow key={doc.id} id={doc.id} fileName={doc.originalFileName || "Document"} uploadedAt={doc.uploadedAt} signedUrl={signedUrls[doc.id]} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "noodles" && (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-hair bg-paper p-4">
            <div className="text-[12.5px] font-semibold text-ink">Stuck on a question the site is asking?</div>
            <p className="text-[11px] leading-5 text-mute">Ask Noodles — it already knows your SOUP profile and applications.</p>
            <Link href="/counselor" target="_blank" className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-[11.5px] font-semibold text-white">
              Open Noodles <ExternalLink size={12} />
            </Link>
          </div>
        )}
      </div>

      <Link href="/companion/connect" className="flex shrink-0 items-center gap-2.5 border-t border-hair bg-paper px-4 py-3 text-left">
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] font-semibold text-ink">Want this filled in for you?</span>
          <span className="block text-[11px] text-mute">The free desktop app fills forms automatically</span>
        </span>
        <ExternalLink size={13} className="shrink-0 text-ink" />
      </Link>
    </div>
  );
}
