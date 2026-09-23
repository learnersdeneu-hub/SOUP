import Link from "next/link";
import { Header } from "@/components/Header";
import { requireProfile } from "@/lib/auth/currentUser";
import { prisma } from "@/lib/prisma";
import { updateCustomerProfile, updateCommunicationPreferences } from "@/app/actions/account";

export default async function AccountPage() {
  const { user, profile, authUser } = await requireProfile();
  const studentCase = await prisma.studentCase.findUnique({ where: { profileId: profile.id }, select: { academicBackgroundSummary: true } });
  const prefs = profile.communicationPreferences && typeof profile.communicationPreferences === "object" && !Array.isArray(profile.communicationPreferences) ? profile.communicationPreferences as Record<string, unknown> : {};
  return (
    <div className="min-h-screen bg-paper">
      <Header signedIn />
      <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[.16em] text-mute">My SOUP</div>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Account settings</h1>
          <p className="mt-2 text-sm leading-6 text-mute">Keep the basic information used across your customer workspace current.</p>
        </div>
        <form action={updateCustomerProfile} className="mt-6 rounded-2xl border border-hair bg-white p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="mb-1.5 block text-xs font-medium text-ink">Full name</span><input name="fullName" required defaultValue={user.fullName} className="w-full rounded-xl border border-hair px-3.5 py-2.5 text-sm outline-none focus:border-navy" /></label>
            <label className="block"><span className="mb-1.5 block text-xs font-medium text-ink">Email</span><input value={authUser.email || user.email} disabled className="w-full rounded-xl border border-hair bg-[#F7F8F9] px-3.5 py-2.5 text-sm text-mute" /></label>
            <label className="block"><span className="mb-1.5 block text-xs font-medium text-ink">Nationality</span><input name="nationality" defaultValue={user.nationality || ""} className="w-full rounded-xl border border-hair px-3.5 py-2.5 text-sm outline-none focus:border-navy" /></label>
            <label className="block"><span className="mb-1.5 block text-xs font-medium text-ink">Current country</span><input name="currentCountry" defaultValue={user.currentCountry || ""} className="w-full rounded-xl border border-hair px-3.5 py-2.5 text-sm outline-none focus:border-navy" /></label>
            <label className="block"><span className="mb-1.5 block text-xs font-medium text-ink">Date of birth</span><input type="date" name="dateOfBirth" defaultValue={user.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : ""} className="w-full rounded-xl border border-hair px-3.5 py-2.5 text-sm outline-none focus:border-navy" /></label>
            <label className="block"><span className="mb-1.5 block text-xs font-medium text-ink">Institution name</span><input name="institutionName" required defaultValue={user.institutionName || ""} placeholder="School, college, university..." className="w-full rounded-xl border border-hair px-3.5 py-2.5 text-sm outline-none focus:border-navy" /></label>
          </div>
          <label className="mt-4 block"><span className="mb-1.5 block text-xs font-medium text-ink">Profile headline</span><textarea name="headlineSummary" rows={3} defaultValue={profile.headlineSummary || ""} className="w-full rounded-xl border border-hair px-3.5 py-2.5 text-sm leading-6 outline-none focus:border-navy" /></label>
          <label className="mt-4 block"><span className="mb-1.5 block text-xs font-medium text-ink">Academic background</span><span className="mb-1.5 block text-[11px] text-mute">Used as your core academic summary across every SOUP-managed application, not just this one.</span><textarea name="academicBackgroundSummary" rows={3} defaultValue={studentCase?.academicBackgroundSummary || ""} className="w-full rounded-xl border border-hair px-3.5 py-2.5 text-sm leading-6 outline-none focus:border-navy" /></label>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <Link href="/forgot-password" className="text-xs font-semibold text-navy">Reset password</Link>
            <button className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white">Save account</button>
          </div>
        </form>
        <form action={updateCommunicationPreferences} className="mt-5 rounded-2xl border border-hair bg-white p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-ink">Communication preferences</h2>
          <p className="mt-2 text-xs leading-5 text-mute">In-app case updates always remain available. Choose how you want non-essential and important updates delivered outside SOUP.</p>
          <div className="mt-4 space-y-3">
            <label className="flex items-start gap-3"><input type="checkbox" name="emailImportant" defaultChecked={prefs.emailImportant !== false} className="mt-0.5"/><span><span className="block text-xs font-semibold text-ink">Important email updates</span><span className="mt-0.5 block text-[11px] text-mute">Deadlines, offers, application actions and support replies.</span></span></label>
            <label className="flex items-start gap-3"><input type="checkbox" name="emailGeneral" defaultChecked={prefs.emailGeneral !== false} className="mt-0.5"/><span><span className="block text-xs font-semibold text-ink">General email updates</span><span className="mt-0.5 block text-[11px] text-mute">Non-critical journey and service updates.</span></span></label>
            <label className="flex items-start gap-3"><input type="checkbox" name="whatsappImportant" defaultChecked={prefs.whatsappImportant === true} className="mt-0.5"/><span><span className="block text-xs font-semibold text-ink">Important WhatsApp reminders</span><span className="mt-0.5 block text-[11px] text-mute">Preference is stored now; automated WhatsApp delivery requires the production WhatsApp Business integration.</span></span></label>
          </div>
          <button className="mt-5 rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white">Save notification preferences</button>
        </form>
        <section className="mt-5 rounded-2xl border border-hair bg-white p-5">
          <h2 className="text-sm font-semibold text-ink">Privacy & ownership</h2>
          <p className="mt-2 text-xs leading-5 text-mute">Your customer workspace is scoped to your authenticated profile. Sensitive documents are accessed through short-lived signed links rather than public storage URLs.</p>
          <div className="mt-4 flex flex-wrap gap-3"><Link href="/documents" className="text-xs font-semibold text-navy">Review my documents</Link><Link href="/support" className="text-xs font-semibold text-navy">Contact support</Link></div>
        </section>
      </main>
    </div>
  );
}
