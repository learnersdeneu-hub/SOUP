// Fixed dropdown for the Extracurricular & Recommendations Activities list
// (src/components/profile/ActivitiesForm.tsx), modeled on the Common App
// Activities section's own category list.
export const ACTIVITY_TYPES = [
  "Academic",
  "Art",
  "Athletics (Club)",
  "Athletics (JV/Varsity)",
  "Career-Oriented",
  "Community Service / Volunteer",
  "Computer / Technology",
  "Cultural",
  "Dance",
  "Debate / Speech",
  "Environmental",
  "Family Responsibilities",
  "Internship",
  "Journalism / Publication",
  "Music (Instrumental)",
  "Music (Vocal)",
  "Religious",
  "Research",
  "Robotics",
  "School Spirit",
  "Science / Math",
  "Social Justice",
  "Student Government",
  "Theater / Drama",
  "Work (Paid)",
  "Other",
] as const;

export const MAX_ACTIVITIES = 10;
export const ACTIVITY_DESCRIPTION_MAX_CHARS = 150;
