import { ServicePartnerDirectory } from "@/components/services/ServicePartnerDirectory";
export default async function ScholarshipPartnersPage({ searchParams: searchParamsPromise }: { searchParams: Promise<{ source?: string }> }) {
  const searchParams = await searchParamsPromise;
  return <ServicePartnerDirectory type="SCHOLARSHIP" title="Scholarship partners through SOUP" intro="Review active SOUP scholarship partner routes where SOUP has a real relationship. Independent scholarships recommended by the Counselor remain external applications." counselorIntent="scholarships" source={searchParams.source}/>;
}
