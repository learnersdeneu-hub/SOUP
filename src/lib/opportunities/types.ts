import type { CareerGoalType } from "@prisma/client";

export type OpportunityKind = "JOB" | "INTERNSHIP" | "SCHOLARSHIP" | "COMPETITION" | "UNIVERSITY";

export type Opportunity = {
  externalId: string;
  provider: string;
  kind: OpportunityKind;
  title: string;
  organization: string;
  location?: string;
  url: string;
  deadline?: string;
  summary?: string;
  sourceUpdatedAt?: string;
};

export type OpportunitySearchContext = {
  goalType: CareerGoalType;
  targetTitle: string;
  targetOrganization?: string | null;
  targetCountry?: string | null;
  skills: string[];
};

export interface OpportunityProvider {
  readonly name: string;
  readonly kinds: OpportunityKind[];
  search(context: OpportunitySearchContext): Promise<Opportunity[]>;
}
