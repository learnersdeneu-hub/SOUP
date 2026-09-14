import { ServicePartnerDirectory } from "@/components/services/ServicePartnerDirectory";
export default function FinancePartnersPage({ searchParams }: { searchParams: { source?: string } }) {
  return <ServicePartnerDirectory type="STUDENT_FINANCE" title="Student finance through SOUP" intro="Review active SOUP finance partners after the Counselor has established what you need to fund or document and where you plan to study." counselorIntent="finance" source={searchParams.source}/>;
}
