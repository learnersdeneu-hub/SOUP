"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, X } from "lucide-react";
import { updateCustomerProfile } from "@/app/actions/account";
import { saveCoreProfileDetails } from "@/app/actions/coreProfile";
import type { CoreProfileDetails } from "@/lib/applications/coreProfile";
import { ProfileSectionNav } from "@/components/profile/ProfileSectionNav";
import { COUNTRIES } from "@/lib/constants/countries";

const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"];

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-mute">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[10px] leading-4 text-mute">{hint}</span>}
    </label>
  );
}

const inputClass = "w-full rounded-xl border border-hair bg-white px-3 py-2.5 text-xs text-ink outline-none focus:border-navy/40";

export function ProfileDetailsForm({
  core,
  fullName,
  dateOfBirth,
  nationality,
  currentCountry,
}: {
  core: CoreProfileDetails;
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  currentCountry: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(fullName);
  const [dob, setDob] = useState(dateOfBirth);
  const [nat, setNat] = useState(nationality);
  const [customNat, setCustomNat] = useState(() => Boolean(nationality) && !(COUNTRIES as readonly string[]).includes(nationality));
  const [country, setCountry] = useState(currentCountry);
  const [preferredName, setPreferredName] = useState(core.preferredName);
  const [gender, setGender] = useState(core.gender);
  const [customGender, setCustomGender] = useState(() => Boolean(core.gender) && !GENDERS.includes(core.gender));
  const [citizenships, setCitizenships] = useState<string[]>(core.citizenships);
  const [citizenshipInput, setCitizenshipInput] = useState("");
  const [passportNumber, setPassportNumber] = useState(core.passportNumber);
  const [passportExpiry, setPassportExpiry] = useState(core.passportExpiry);
  const [phoneCountryCode, setPhoneCountryCode] = useState(core.phoneCountryCode);
  const [phone, setPhone] = useState(core.phone);
  const [whatsapp, setWhatsapp] = useState(core.whatsapp);
  const [currentAddress, setCurrentAddress] = useState(core.currentAddress);
  const [permanentAddress, setPermanentAddress] = useState(core.permanentAddress);
  const [sameAsCurrent, setSameAsCurrent] = useState(core.permanentAddressSameAsCurrent);
  const [guardianName, setGuardianName] = useState(core.guardianName);
  const [guardianRelationship, setGuardianRelationship] = useState(core.guardianRelationship);
  const [guardianOccupation, setGuardianOccupation] = useState(core.guardianOccupation);
  const [guardianEmail, setGuardianEmail] = useState(core.guardianEmail);
  const [guardianPhone, setGuardianPhone] = useState(core.guardianPhone);
  const [emergencyName, setEmergencyName] = useState(core.emergencyContactName);
  const [emergencyRelationship, setEmergencyRelationship] = useState(core.emergencyContactRelationship);
  const [emergencyPhone, setEmergencyPhone] = useState(core.emergencyContactPhone);
  const [firstGeneration, setFirstGeneration] = useState<boolean | null>(core.firstGeneration);
  const [languagesAtHome, setLanguagesAtHome] = useState(core.languagesAtHome);
  const [accommodationNeeds, setAccommodationNeeds] = useState(core.accommodationNeeds);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addCitizenship() {
    const value = citizenshipInput.trim();
    if (value && !citizenships.includes(value)) setCitizenships([...citizenships, value]);
    setCitizenshipInput("");
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const profileForm = new FormData();
      profileForm.set("fullName", name);
      profileForm.set("dateOfBirth", dob);
      profileForm.set("nationality", nat);
      profileForm.set("currentCountry", country);
      await updateCustomerProfile(profileForm);

      const detailsForm = new FormData();
      detailsForm.set("preferredName", preferredName);
      detailsForm.set("gender", gender);
      detailsForm.set("citizenships", JSON.stringify(citizenships));
      detailsForm.set("passportNumber", passportNumber);
      detailsForm.set("passportExpiry", passportExpiry);
      detailsForm.set("phoneCountryCode", phoneCountryCode);
      detailsForm.set("phone", phone);
      detailsForm.set("whatsapp", whatsapp);
      detailsForm.set("currentAddress", currentAddress);
      detailsForm.set("permanentAddress", sameAsCurrent ? currentAddress : permanentAddress);
      detailsForm.set("permanentAddressSameAsCurrent", String(sameAsCurrent));
      detailsForm.set("guardianName", guardianName);
      detailsForm.set("guardianRelationship", guardianRelationship);
      detailsForm.set("guardianOccupation", guardianOccupation);
      detailsForm.set("guardianEmail", guardianEmail);
      detailsForm.set("guardianPhone", guardianPhone);
      detailsForm.set("emergencyContactName", emergencyName);
      detailsForm.set("emergencyContactRelationship", emergencyRelationship);
      detailsForm.set("emergencyContactPhone", emergencyPhone);
      detailsForm.set("firstGeneration", firstGeneration === null ? "" : String(firstGeneration));
      detailsForm.set("languagesAtHome", languagesAtHome);
      detailsForm.set("accommodationNeeds", accommodationNeeds);
      await saveCoreProfileDetails(detailsForm);

      setSaved(true);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save your details.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-8">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs font-semibold text-navy"><ArrowLeft size={12}/>Dashboard</Link>
      <div className="mt-4">
        <div className="text-xs font-semibold uppercase tracking-[.16em] text-teal">My Application Progress · Section 1</div>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Profile & Details</h1>
        <p className="mt-2 text-sm leading-6 text-mute">Fill this in once — it's reused across every university application you start, instead of being asked again per school.</p>
      </div>

      <div className="mt-6 space-y-6 rounded-2xl border border-hair bg-white p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Legal name (as on passport)"><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass}/></Field>
          <Field label="Preferred name (if different)"><input value={preferredName} onChange={(e) => setPreferredName(e.target.value)} className={inputClass}/></Field>
          <Field label="Date of birth"><input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={inputClass}/></Field>
          <Field label="Gender">
            <select value={customGender ? "__other__" : (GENDERS.includes(gender) ? gender : "")} onChange={(e) => { if (e.target.value === "__other__") { setCustomGender(true); setGender(""); } else { setCustomGender(false); setGender(e.target.value); } }} className={inputClass}>
              <option value="" disabled>Select…</option>
              {GENDERS.map((option) => <option key={option} value={option}>{option}</option>)}
              <option value="__other__">Other</option>
            </select>
            {customGender && <input value={gender} onChange={(e) => setGender(e.target.value)} placeholder="Enter gender" className={`${inputClass} mt-2`}/>}
          </Field>
          <Field label="Nationality">
            <select value={customNat ? "__other__" : ((COUNTRIES as readonly string[]).includes(nat) ? nat : "")} onChange={(e) => { if (e.target.value === "__other__") { setCustomNat(true); setNat(""); } else { setCustomNat(false); setNat(e.target.value); } }} className={inputClass}>
              <option value="" disabled>Select…</option>
              {COUNTRIES.map((option) => <option key={option} value={option}>{option}</option>)}
              <option value="__other__">Other</option>
            </select>
            {customNat && <input value={nat} onChange={(e) => setNat(e.target.value)} placeholder="Enter nationality" className={`${inputClass} mt-2`}/>}
          </Field>
          <Field label="Country of residence"><input value={country} onChange={(e) => setCountry(e.target.value)} className={inputClass}/></Field>
        </div>

        <div className="border-t border-hair pt-4">
          <Field label="Additional citizenships (dual citizenship)" hint="Add each one — press Enter or the + button.">
            <div className="flex gap-2">
              <input value={citizenshipInput} onChange={(e) => setCitizenshipInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCitizenship(); } }} placeholder="e.g. Canada" className={inputClass}/>
              <button type="button" onClick={addCitizenship} className="shrink-0 rounded-xl border border-hair px-3 text-ink"><Plus size={14}/></button>
            </div>
            {citizenships.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{citizenships.map((c) => <span key={c} className="inline-flex items-center gap-1 rounded-full bg-paper px-2.5 py-1 text-[11px] text-ink">{c}<button type="button" onClick={() => setCitizenships(citizenships.filter((v) => v !== c))} aria-label={`Remove ${c}`}><X size={11}/></button></span>)}</div>}
          </Field>
        </div>

        <div className="grid gap-3 border-t border-hair pt-4 sm:grid-cols-2">
          <Field label="Passport number"><input value={passportNumber} onChange={(e) => setPassportNumber(e.target.value)} className={inputClass}/></Field>
          <Field label="Passport expiry"><input type="date" value={passportExpiry} onChange={(e) => setPassportExpiry(e.target.value)} className={inputClass}/></Field>
        </div>

        <div className="grid gap-3 border-t border-hair pt-4 sm:grid-cols-3">
          <Field label="Phone country code"><input value={phoneCountryCode} onChange={(e) => setPhoneCountryCode(e.target.value)} placeholder="+44" className={inputClass}/></Field>
          <Field label="Phone number"><input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass}/></Field>
          <Field label="WhatsApp (optional)"><input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className={inputClass}/></Field>
        </div>

        <div className="grid gap-3 border-t border-hair pt-4 sm:grid-cols-2">
          <Field label="Current address"><textarea value={currentAddress} onChange={(e) => setCurrentAddress(e.target.value)} rows={2} className={inputClass}/></Field>
          <Field label="Permanent address">
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] text-mute"><input type="checkbox" checked={sameAsCurrent} onChange={(e) => setSameAsCurrent(e.target.checked)}/>Same as current address</label>
            {!sameAsCurrent && <textarea value={permanentAddress} onChange={(e) => setPermanentAddress(e.target.value)} rows={2} className={inputClass}/>}
          </Field>
        </div>

        <div className="border-t border-hair pt-4">
          <div className="text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Parent / guardian</div>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <Field label="Name"><input value={guardianName} onChange={(e) => setGuardianName(e.target.value)} className={inputClass}/></Field>
            <Field label="Relationship"><input value={guardianRelationship} onChange={(e) => setGuardianRelationship(e.target.value)} className={inputClass}/></Field>
            <Field label="Occupation"><input value={guardianOccupation} onChange={(e) => setGuardianOccupation(e.target.value)} className={inputClass}/></Field>
            <Field label="Email"><input value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)} className={inputClass}/></Field>
            <Field label="Phone"><input value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)} className={inputClass}/></Field>
          </div>
        </div>

        <div className="border-t border-hair pt-4">
          <div className="text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Emergency contact</div>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <Field label="Name"><input value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} className={inputClass}/></Field>
            <Field label="Relationship"><input value={emergencyRelationship} onChange={(e) => setEmergencyRelationship(e.target.value)} className={inputClass}/></Field>
            <Field label="Phone"><input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} className={inputClass}/></Field>
          </div>
        </div>

        <div className="grid gap-3 border-t border-hair pt-4 sm:grid-cols-2">
          <Field label="First-generation student?">
            <div className="flex gap-2">
              <button type="button" onClick={() => setFirstGeneration(true)} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${firstGeneration === true ? "border-navy bg-navy text-white" : "border-hair text-ink"}`}>Yes</button>
              <button type="button" onClick={() => setFirstGeneration(false)} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${firstGeneration === false ? "border-navy bg-navy text-white" : "border-hair text-ink"}`}>No</button>
            </div>
          </Field>
          <Field label="Language(s) spoken at home"><input value={languagesAtHome} onChange={(e) => setLanguagesAtHome(e.target.value)} className={inputClass}/></Field>
        </div>

        <Field label="Disability / accommodation needs (optional)" hint="For visa or university disclosure only where you choose to share it.">
          <textarea value={accommodationNeeds} onChange={(e) => setAccommodationNeeds(e.target.value)} rows={2} className={inputClass}/>
        </Field>

        <div className="flex items-center gap-3 border-t border-hair pt-4">
          <button onClick={save} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60">
            {saving && <Loader2 size={12} className="animate-spin"/>}
            {saving ? "Saving…" : "Save"}
          </button>
          {saved && <span className="text-[11px] font-medium text-teal">Saved.</span>}
          {error && <span className="text-[11px] font-medium text-[#9D3127]">{error}</span>}
        </div>
      </div>
      <ProfileSectionNav current="/profile/details"/>
    </div>
  );
}
