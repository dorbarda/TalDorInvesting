-- Create private attachments storage bucket
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- Allow anon users to upload files
create policy "attachments_insert"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'attachments');

-- Allow anon users to read / generate signed URLs
create policy "attachments_select"
  on storage.objects for select
  to anon
  using (bucket_id = 'attachments');

-- Allow anon users to delete files
create policy "attachments_delete"
  on storage.objects for delete
  to anon
  using (bucket_id = 'attachments');
