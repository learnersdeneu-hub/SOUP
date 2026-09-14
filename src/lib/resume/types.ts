export type ResumeTemplateKey =
  | "STUDENT"
  | "GRADUATE"
  | "PROFESSIONAL"
  | "INTERNATIONAL_STUDENT"
  | "JOB_SEEKER";

export type ResumeExperience = {
  employer: string;
  title: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  bullets: string[];
};

export type ResumeEducation = {
  institution: string;
  qualification: string;
  field?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  details?: string[];
};

export type ResumeProject = {
  name: string;
  description: string;
  link?: string;
};

export type ResumeContent = {
  template: ResumeTemplateKey;
  targetRole: string;
  personal: {
    fullName: string;
    email: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    portfolio?: string;
    photoDataUrl?: string;
    headline: string;
    summary: string;
  };
  experience: ResumeExperience[];
  education: ResumeEducation[];
  projects: ResumeProject[];
  skills: string[];
  achievements: string[];
  certifications: string[];
  languages: string[];
};

export type ResumeImprovementTip = {
  title: string;
  why: string;
};

export type GeneratedResume = {
  content: ResumeContent;
  coverLetter: string;
  previewTips: ResumeImprovementTip[];
};

export type ResumeQuestionnaire = {
  template: ResumeTemplateKey;
  targetRole: string;
  goal: string;
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  portfolio?: string;
  education: string;
  experience: string;
  projects?: string;
  skills: string;
  achievements?: string;
  certifications?: string;
  languages?: string;
  additionalContext?: string;
};
