
-- Drop dependent tables first (they reference notifications)
DROP TABLE IF EXISTS public.notification_reads;
DROP TABLE IF EXISTS public.notification_dismissals;

-- Drop main notifications table
DROP TABLE IF EXISTS public.notifications;

-- Drop cleanup function
DROP FUNCTION IF EXISTS public.cleanup_old_notifications();
