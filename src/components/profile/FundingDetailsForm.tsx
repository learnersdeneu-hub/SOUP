"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { saveFundingDetails } from "@/app/actions/coreProfile";
import type { FundingDetails } from "@/lib/applications/coreProfile";
import { ProfileSectionNav } from "@/components/profile/ProfileSectionNav";

const inputClass = "w-full rounded-xl border border-hair bg-white px-3 py-2.5 text-xs text-ink outline-none focus:border-navy/40";
const FUNDING_SOURCES = ["Self-funded", "Parents", "Student loan", "Scholarship", "Sponsor / employer", "Government"];
const SCHOLARSHIP_TYPES = ["Merit-based", "Need-based", "Country-specific"];
const PROOF_OF_FUNDS_STATUSES = [["NOT_UPLOADED", "Not uploaded"], ["IN_PROGRESS", "In progress"], ["UPLOADED", "Uploaded"]] as const;

export function FundingDetailsForm({ funding }: { funding: FundingDetails }) {
  const router = useRouter();
  const [fundingSource, setFundingSource] = useState(funding.fundingSource);
  const [sponsorName, setSponsorName] = useState(funding.sponsorName);
  const [sponsorRelationship, setSponsorRelationship] = useState(funding.sponsorRelationship);
  const [sponsorContact, setSponsorContact] = useState(funding.sponsorContact);
  const [annualBudgetEstimate, setAnnualBudgetEstimate] = useState(funding.annualBudgetEstimate);
  const [scholarshipInterested, setScholarshipInterested] = useState<boolean | null>(funding.scholarshipInterested);
  const [scholarshipTypes, setScholarshipTypes] = useState<string[]>(funding.scholarshipTypes);
  const [proofOfFundsStatus, setProofOfFundsStatus] = useState(funding.proofOfFundsStatus);
  const [loanStatus, setLoanStatus] = useState(funding.loanStatus);
  const [loanLender, setLoanLender] = useState(funding.loanLender);
  const [currencyPreference, setCurrencyPreference] = useState(funding.currencyPreference);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleScholarshipType(type: string) {
    setScholarshipTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const form = new FormData();
      form.set("fundingSource", fundingSource);
      form.set("sponsorName", sponsorName);
      form.set("sponsorRelationship", sponsorRelationship);
      form.set("sponsorContact", sponsorContact);
      form.set("annualBudgetEstimate", annualBudgetEstimate);
      form.set("scholarshipInterested", scholarshipInterested === null ? "" : String(scholarshipInterested));
      form.set("scholarshipTypes", JSON.stringify(scholarshipTypes));
      form.set("proofOfFundsStatus", proofOfFundsStatus);
      form.set("loanStatus", loanStatus);
      form.set("loanLender", loanLender);
      form.set("currencyPreference", currencyPreference);
      await saveFundingDetails(form);
      setSaved(true);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save your funding details.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-8">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs font-semibold text-navy"><ArrowLeft size={12}/>Dashboard</Link>
      <div className="mt-4">
        <div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">My Application Progress · Section 2</div>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Funding & Sponsorship</h1>
        <p className="mt-2 text-sm leading-6 text-mute">Fill this in once — it's reused across every university application you start.</p>
      </div>

      <div className="mt-6 space-y-6 rounded-2xl border border-hair bg-white p-5 sm:p-6">
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">How will your studies be funded?</span>
          <div className="flex flex-wrap gap-2">
            {FUNDING_SOURCES.map((source) => (
              <button key={source} type="button" onClick={() => setFundingSource(source)} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${fundingSource === source ? "border-navy bg-navy text-white" : "border-hair text-ink"}`}>{source}</button>
            ))}
          </div>
        </label>

        <div className="grid gap-3 border-t border-hair pt-4 sm:grid-cols-2">
          <label className="block"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Sponsor name (if applicable)</span><input value={sponsorName} onChange={(e) => setSponsorName(e.target.value)} className={inputClass}/></label>
          <label className="block"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Sponsor relationship</span><input value={sponsorRelationship} onChange={(e) => setSponsorRelationship(e.target.value)} className={inputClass}/></label>
          <label className="block sm:col-span-2"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Sponsor contact (email or phone)</span><input value={sponsorContact} onChange={(e) => setSponsorContact(e.target.value)} className={inputClass}/></label>
        </div>

        <div className="grid gap-3 border-t border-hair pt-4 sm:grid-cols-2">
          <label className="block"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Estimated annual budget (tuition + living)</span><input value={annualBudgetEstimate} onChange={(e) => setAnnualBudgetEstimate(e.target.value)} placeholder="e.g. 35,000" className={inputClass}/></label>
          <label className="block"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Currency preference</span><input value={currencyPreference} onChange={(e) => setCurrencyPreference(e.target.value)} placeholder="e.g. GBP" className={inputClass}/></label>
        </div>

        <div className="border-t border-hair pt-4">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Interested in scholarships?</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setScholarshipInterested(true)} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${scholarshipInterested === true ? "border-navy bg-navy text-white" : "border-hair text-ink"}`}>Yes</button>
            <button type="button" onClick={() => setScholarshipInterested(false)} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${scholarshipInterested === false ? "border-navy bg-navy text-white" : "border-hair text-ink"}`}>No</button>
          </div>
          {scholarshipInterested && (
            <div className="mt-3 flex flex-wrap gap-2">
              {SCHOLARSHIP_TYPES.map((type) => (
                <button key={type} type="button" onClick={() => toggleScholarshipType(type)} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${scholarshipTypes.includes(type) ? "border-teal bg-[#F0F7F5] text-teal" : "border-hair text-ink"}`}>{type}</button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-hair pt-4">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Bank statement / proof of funds</span>
          <div className="flex flex-wrap gap-2">
            {PROOF_OF_FUNDS_STATUSES.map(([value, label]) => (
              <button key={value} type="button" onClick={() => setProofOfFundsStatus(value)} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${proofOfFundsStatus === value ? "border-navy bg-navy text-white" : "border-hair text-ink"}`}>{label}</button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 border-t border-hair pt-4 sm:grid-cols-2">
          <label className="block"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Loan status (if applicable)</span><input value={loanStatus} onChange={(e) => setLoanStatus(e.target.value)} placeholder="e.g. Approved, Pending" className={inputClass}/></label>
          <label className="block"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Lender</span><input value={loanLender} onChange={(e) => setLoanLender(e.target.value)} className={inputClass}/></label>
        </div>

        <div className="flex items-center gap-3 border-t border-hair pt-4">
          <button onClick={save} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60">
            {saving && <Loader2 size={12} className="animate-spin"/>}
            {saving ? "Saving…" : "Save"}
          </button>
          {saved && <span className="text-[11px] font-medium text-teal">Saved.</span>}
          {error && <span className="text-[11px] font-medium text-[#9D3127]">{error}</span>}
        </div>
      </div>
      <ProfileSectionNav current="/profile/funding"/>
    </div>
  );
}
