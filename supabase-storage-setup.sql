-- ==============================================================================
-- Supabase Storage Setup: Public 'project-images' bucket & Access Policies
-- ==============================================================================

-- 1. Create or update the public storage bucket for project/hardware catalog images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-images',
  'project-images',
  true,
  5242880, -- 5 MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/gif'];

-- 2. Allow public access to view and read images from project-images
DROP POLICY IF EXISTS "Public can view project images" ON storage.objects;
CREATE POLICY "Public can view project images"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-images');

-- 3. Allow authenticated users / admins to upload images to project-images
DROP POLICY IF EXISTS "Authenticated users can upload project images" ON storage.objects;
CREATE POLICY "Authenticated users can upload project images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-images');

-- 4. Allow authenticated users / admins to update and replace images
DROP POLICY IF EXISTS "Authenticated users can update project images" ON storage.objects;
CREATE POLICY "Authenticated users can update project images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'project-images');

-- 5. Allow authenticated users / admins to delete project images
DROP POLICY IF EXISTS "Authenticated users can delete project images" ON storage.objects;
CREATE POLICY "Authenticated users can delete project images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'project-images');
