import { PartnerLogo } from "@/components/partners/PartnerLogo";

const NETWORKS: Record<string, { label: string; website: string }> = {
  AHZ: { label: "AHZ", website: "https://www.ahzassociates.com/" },
  APPLYBOARD: { label: "ApplyBoard", website: "https://www.applyboard.com/" },
  GUS: { label: "GUS", website: "https://www.globaluniversitysystems.com/" },
  GUS_INUNI: { label: "GUS / InUni", website: "https://www.globaluniversitysystems.com/network/partners" },
  IEO: { label: "IEO", website: "https://events.educationireland.net/" },
  ABN_GLOBAL: { label: "ABN Global", website: "https://www.abnglobal.com/" },
  CONNECTEDHE: { label: "ConnectedHE", website: "https://connectedhe.com/" },
  EEUA: { label: "EEUA", website: "https://www.eeca.university/" },
};

function metadataNetworks(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [] as string[];
  const raw = (value as Record<string, unknown>).networks;
  if (!Array.isArray(raw)) return [] as string[];
  return raw.map((item) => String(item || "").trim().toUpperCase()).filter(Boolean);
}

export function ApplicationNetworkPanel({ metadata }: { metadata: unknown }) {
  const routes = Array.from(new Set(metadataNetworks(metadata)))
    .filter((route) => route !== "DIRECT_SOUP")
    .map((route) => ({ key: route, ...NETWORKS[route] }))
    .filter((route): route is { key: string; label: string; website: string } => Boolean(route.label && route.website));

  return (
    <aside className="w-full rounded-2xl border border-hair bg-paper/60 p-3.5 sm:w-[260px]" aria-label="Application network">
      <div className="text-[9px] font-semibold uppercase tracking-[.14em] text-teal">Application network</div>
      <p className="mt-1 text-[11px] leading-4 text-mute">Your application is managed through SOUP with LearnersDen.</p>
      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-2 rounded-xl border border-hair bg-white px-2.5 py-2">
          <PartnerLogo name="LearnersDen.eu" websiteUrl="https://learnersden.eu/" size={28}/>
          <div className="min-w-0"><div className="text-[10px] font-semibold text-ink">SOUP / LearnersDen</div><div className="text-[9px] text-mute">Application management</div></div>
        </div>
        {routes.map((route) => (
          <div key={route.key} className="flex items-center gap-2 rounded-xl border border-hair bg-white px-2.5 py-2">
            <PartnerLogo name={route.label} websiteUrl={route.website} size={28}/>
            <div className="min-w-0"><div className="text-[10px] font-semibold text-ink">{route.label}</div><div className="text-[9px] text-mute">Network access</div></div>
          </div>
        ))}
      </div>
    </aside>
  );
}
