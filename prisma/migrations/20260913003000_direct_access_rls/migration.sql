-- Defense-in-depth RLS for any direct Supabase client access.
-- Prisma uses a trusted backend connection and continues to enforce authorization in server code.
-- These policies prevent an authenticated browser client from reading/writing another student's rows.

ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "support_tickets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "support_ticket_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "resumes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "resume_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "student_applications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "student_application_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "journey_checklists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "journey_checklist_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_own_row" ON "profiles";
CREATE POLICY "profiles_own_row" ON "profiles"
  FOR ALL TO authenticated
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

DROP POLICY IF EXISTS "documents_own_profile" ON "documents";
CREATE POLICY "documents_own_profile" ON "documents"
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "profiles" p
    WHERE p."id" = "documents"."profileId" AND p."userId" = auth.uid()::text
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "profiles" p
    WHERE p."id" = "documents"."profileId" AND p."userId" = auth.uid()::text
  ));

DROP POLICY IF EXISTS "chat_sessions_own_profile" ON "chat_sessions";
CREATE POLICY "chat_sessions_own_profile" ON "chat_sessions"
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "profiles" p
    WHERE p."id" = "chat_sessions"."profileId" AND p."userId" = auth.uid()::text
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "profiles" p
    WHERE p."id" = "chat_sessions"."profileId" AND p."userId" = auth.uid()::text
  ));

DROP POLICY IF EXISTS "chat_messages_own_session" ON "chat_messages";
CREATE POLICY "chat_messages_own_session" ON "chat_messages"
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "chat_sessions" s
    JOIN "profiles" p ON p."id" = s."profileId"
    WHERE s."id" = "chat_messages"."sessionId" AND p."userId" = auth.uid()::text
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "chat_sessions" s
    JOIN "profiles" p ON p."id" = s."profileId"
    WHERE s."id" = "chat_messages"."sessionId" AND p."userId" = auth.uid()::text
  ));

DROP POLICY IF EXISTS "notifications_own_profile" ON "notifications";
CREATE POLICY "notifications_own_profile" ON "notifications"
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "profiles" p
    WHERE p."id" = "notifications"."profileId" AND p."userId" = auth.uid()::text
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "profiles" p
    WHERE p."id" = "notifications"."profileId" AND p."userId" = auth.uid()::text
  ));

DROP POLICY IF EXISTS "support_tickets_own_profile" ON "support_tickets";
CREATE POLICY "support_tickets_own_profile" ON "support_tickets"
  FOR ALL TO authenticated
  USING ("customerUserId" = auth.uid()::text)
  WITH CHECK ("customerUserId" = auth.uid()::text);

DROP POLICY IF EXISTS "support_ticket_messages_own_ticket" ON "support_ticket_messages";
CREATE POLICY "support_ticket_messages_own_ticket" ON "support_ticket_messages"
  FOR SELECT TO authenticated
  USING (
    "isInternal" = false AND EXISTS (
      SELECT 1 FROM "support_tickets" t
      WHERE t."id" = "support_ticket_messages"."ticketId" AND t."customerUserId" = auth.uid()::text
    )
  );
DROP POLICY IF EXISTS "support_ticket_messages_insert_own_ticket" ON "support_ticket_messages";
CREATE POLICY "support_ticket_messages_insert_own_ticket" ON "support_ticket_messages"
  FOR INSERT TO authenticated
  WITH CHECK (
    "authorId" = auth.uid()::text AND "isInternal" = false AND EXISTS (
      SELECT 1 FROM "support_tickets" t
      WHERE t."id" = "support_ticket_messages"."ticketId" AND t."customerUserId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "resumes_own_profile" ON "resumes";
CREATE POLICY "resumes_own_profile" ON "resumes"
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "profiles" p
    WHERE p."id" = "resumes"."profileId" AND p."userId" = auth.uid()::text
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "profiles" p
    WHERE p."id" = "resumes"."profileId" AND p."userId" = auth.uid()::text
  ));

DROP POLICY IF EXISTS "resume_versions_own_resume" ON "resume_versions";
CREATE POLICY "resume_versions_own_resume" ON "resume_versions"
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "resumes" r
    JOIN "profiles" p ON p."id" = r."profileId"
    WHERE r."id" = "resume_versions"."resumeId" AND p."userId" = auth.uid()::text
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "resumes" r
    JOIN "profiles" p ON p."id" = r."profileId"
    WHERE r."id" = "resume_versions"."resumeId" AND p."userId" = auth.uid()::text
  ));

DROP POLICY IF EXISTS "student_applications_own_profile" ON "student_applications";
CREATE POLICY "student_applications_own_profile" ON "student_applications"
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "profiles" p
    WHERE p."id" = "student_applications"."profileId" AND p."userId" = auth.uid()::text
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "profiles" p
    WHERE p."id" = "student_applications"."profileId" AND p."userId" = auth.uid()::text
  ));

DROP POLICY IF EXISTS "student_application_documents_own_application" ON "student_application_documents";
CREATE POLICY "student_application_documents_own_application" ON "student_application_documents"
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "student_applications" a
    JOIN "profiles" p ON p."id" = a."profileId"
    WHERE a."id" = "student_application_documents"."applicationId" AND p."userId" = auth.uid()::text
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "student_applications" a
    JOIN "profiles" p ON p."id" = a."profileId"
    WHERE a."id" = "student_application_documents"."applicationId" AND p."userId" = auth.uid()::text
  ));

DROP POLICY IF EXISTS "journey_checklists_own_profile" ON "journey_checklists";
CREATE POLICY "journey_checklists_own_profile" ON "journey_checklists"
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "profiles" p
    WHERE p."id" = "journey_checklists"."profileId" AND p."userId" = auth.uid()::text
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "profiles" p
    WHERE p."id" = "journey_checklists"."profileId" AND p."userId" = auth.uid()::text
  ));

DROP POLICY IF EXISTS "journey_items_own_checklist" ON "journey_checklist_items";
CREATE POLICY "journey_items_own_checklist" ON "journey_checklist_items"
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "journey_checklists" c
    JOIN "profiles" p ON p."id" = c."profileId"
    WHERE c."id" = "journey_checklist_items"."checklistId" AND p."userId" = auth.uid()::text
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "journey_checklists" c
    JOIN "profiles" p ON p."id" = c."profileId"
    WHERE c."id" = "journey_checklist_items"."checklistId" AND p."userId" = auth.uid()::text
  ));

DROP POLICY IF EXISTS "payments_own_profile" ON "payments";
CREATE POLICY "payments_own_profile" ON "payments"
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "profiles" p
    WHERE p."id" = "payments"."profileId" AND p."userId" = auth.uid()::text
  ));
