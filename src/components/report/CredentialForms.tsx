"use client";

import { useRef, useState, useTransition } from "react";
import {
  createEducationCredential,
  createEmploymentCredential,
  createIdentityCredential,
  createFinancialCredential,
} from "@/app/actions/credentials";

function FormShell({
  title,
  action,
  children,
}: {
  title: string;
  action: (formData: FormData) => Promise<void>;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      ref={ref}
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          try {
            await action(formData);
            ref.current?.reset();
          } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Something went wrong.");
          }
        });
      }}
      className="rounded-xl border border-hair p-4 space-y-2.5"
    >
      <div className="text-xs font-semibold tracking-wide text-mute">{title}</div>
      {children}
      {error && <div className="text-xs text-[#B3261E]">{error}</div>}
      <button
        type="submit"
        disabled={pending}
        className="text-xs font-medium rounded-lg px-3 py-2 text-white bg-navy disabled:opacity-50"
      >
        {pending ? "Submitting..." : "Submit for Verification"}
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-hair px-3 py-2 text-xs outline-none";

export function EducationForm() {
  return (
    <FormShell title="ADD EDUCATION CREDENTIAL" action={createEducationCredential}>
      <input name="institutionName" placeholder="Institution name" required className={inputClass} />
      <input name="degreeType" placeholder="Degree type (e.g. Bachelor's)" required className={inputClass} />
      <input name="fieldOfStudy" placeholder="Field of study (optional)" className={inputClass} />
      <input name="graduationDate" type="date" className={inputClass} />
      <input name="file" type="file" accept="application/pdf,image/*" className="text-xs" />
    </FormShell>
  );
}

export function EmploymentForm() {
  return (
    <FormShell title="ADD EMPLOYMENT CREDENTIAL" action={createEmploymentCredential}>
      <input name="employerName" placeholder="Employer name" required className={inputClass} />
      <input name="jobTitle" placeholder="Job title" required className={inputClass} />
      <input name="startDate" type="date" required className={inputClass} />
      <input name="file" type="file" accept="application/pdf,image/*" className="text-xs" />
    </FormShell>
  );
}

export function IdentityForm() {
  return (
    <FormShell title="ADD IDENTITY DOCUMENT" action={createIdentityCredential}>
      <select name="documentType" required className={inputClass}>
        <option value="">Document type</option>
        <option value="PASSPORT">Passport</option>
        <option value="NATIONAL_ID">National ID</option>
        <option value="DRIVING_LICENCE">Driving Licence</option>
        <option value="RESIDENCE_PERMIT">Residence Permit</option>
      </select>
      <input name="documentCountry" placeholder="Issuing country" required className={inputClass} />
      <input name="file" type="file" accept="application/pdf,image/*" required className="text-xs" />
    </FormShell>
  );
}

export function FinancialForm() {
  return (
    <FormShell title="ADD FINANCIAL ATTESTATION" action={createFinancialCredential}>
      <input name="attestingInstitutionName" placeholder="Bank / institution name" required className={inputClass} />
      <select name="attestationCategory" required className={inputClass}>
        <option value="">Attestation category</option>
        <option value="INCOME">Income</option>
        <option value="BALANCE">Account Balance</option>
        <option value="TAX_RETURN">Tax Return</option>
      </select>
      <input name="file" type="file" accept="application/pdf,image/*" className="text-xs" />
    </FormShell>
  );
}
