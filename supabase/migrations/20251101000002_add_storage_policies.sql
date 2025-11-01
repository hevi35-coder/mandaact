-- Storage RLS policies for mandalart-images bucket
-- Note: RLS is already enabled on storage.objects by default

-- Policy: Allow authenticated users to upload images to mandalart-images bucket
CREATE POLICY "Authenticated users can upload mandalart images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'mandalart-images'
);

-- Policy: Allow public read access to mandalart-images
CREATE POLICY "Public read access to mandalart images"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'mandalart-images'
);

-- Policy: Allow users to update their own images
CREATE POLICY "Users can update own mandalart images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'mandalart-images' AND owner = auth.uid()
)
WITH CHECK (
  bucket_id = 'mandalart-images' AND owner = auth.uid()
);

-- Policy: Allow users to delete their own images
CREATE POLICY "Users can delete own mandalart images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'mandalart-images' AND owner = auth.uid()
);
