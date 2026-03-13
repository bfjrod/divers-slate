-- Create the dive-files storage bucket (private)
insert into storage.buckets (id, name, public)
values ('dive-files', 'dive-files', false)
on conflict (id) do nothing;

-- Users can upload files to their own prefix only
create policy "Users upload own dive files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'dive-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can read their own dive files
create policy "Users read own dive files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'dive-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);
