import type { AppRole } from "@prisma/client";

export const STAFF_ROLES: AppRole[] = ["COUNSELOR", "ADMISSIONS", "FINANCE", "ACCOMMODATION", "SUPPORT", "ADMIN", "SUPER_ADMIN"];
export const CASE_ROLES: AppRole[] = ["COUNSELOR", "ADMISSIONS", "SUPPORT", "ADMIN", "SUPER_ADMIN"];
export const APPLICATION_ROLES: AppRole[] = ["COUNSELOR", "ADMISSIONS", "SUPPORT", "ADMIN", "SUPER_ADMIN"];
export const APPLICATION_OPERATIONS_ROLES: AppRole[] = ["ADMISSIONS", "ADMIN", "SUPER_ADMIN"];
export const DOCUMENT_ROLES: AppRole[] = ["COUNSELOR", "ADMISSIONS", "SUPPORT", "ADMIN", "SUPER_ADMIN"];
export const SUPPORT_ROLES: AppRole[] = ["SUPPORT", "ADMIN", "SUPER_ADMIN"];
export const COMMERCIAL_ROLES: AppRole[] = ["FINANCE", "ACCOMMODATION", "ADMIN", "SUPER_ADMIN"];
export const ADMIN_ROLES: AppRole[] = ["ADMIN", "SUPER_ADMIN"];
export const SUPER_ADMIN_ROLES: AppRole[] = ["SUPER_ADMIN"];
