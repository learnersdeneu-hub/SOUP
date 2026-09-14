import { ServicePartnerDirectory } from "@/components/services/ServicePartnerDirectory";
export default function AccommodationPartnersPage({ searchParams }: { searchParams: { source?: string } }) {
  return <ServicePartnerDirectory type="ACCOMMODATION" title="Accommodation through SOUP" intro="Review active SOUP accommodation partners after the Counselor has helped establish your city, dates, university location and budget." counselorIntent="accommodation" source={searchParams.source}/>;
}
