-- Fix: Update any remaining Sunrise Capital DS references to FleetVest
-- Run this in Supabase SQL Editor if notifications show old branding

-- Update notifications with old branding
UPDATE public.notifications
SET 
  title = REPLACE(title, 'Sunrise Capital DS', 'FleetVest'),
  title = REPLACE(title, 'Sunrise Capital', 'FleetVest'),
  message = REPLACE(message, 'Sunrise Capital DS', 'FleetVest'),
  message = REPLACE(message, 'Sunrise Capital', 'FleetVest')
WHERE 
  title LIKE '%Sunrise Capital%' OR 
  message LIKE '%Sunrise Capital%'
  RETURNING id, title, message;

-- Verify the fix
SELECT id, title, message FROM public.notifications 
WHERE title LIKE '%FleetVest%' OR message LIKE '%FleetVest%' 
LIMIT 10;
