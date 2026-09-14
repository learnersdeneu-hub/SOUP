-- SOUP private document bucket policies.
-- Run in the SQL editor of the NEW SOUP Supabase project only.
-- The bucket itself must be private and named `documents`.

-- A student may upload only inside their own first-level folder: <auth.uid()>/...
create policy "SOUP users upload own documents"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- A student may read only their own stored objects. The application normally
-- uses short-lived signed URLs; this policy is still required for user-scoped operations.
create policy "SOUP users read own documents"
on storage.objects for select
to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to replace/delete only files in their own folder if a future
-- workflow needs it. Current SOUP flows normally create new immutable file refs.
create policy "SOUP users update own documents"
on storage.objects for update
to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "SOUP users delete own documents"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Staff access is NOT granted by these RLS policies. Staff document preview/upload
-- is authorized in the application first and then uses SUPABASE_SECRET_KEY on the server.
