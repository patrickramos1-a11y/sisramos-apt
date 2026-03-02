

# Fix: Momento APT Lock Not Propagating in Real-Time

## Problem
When a gestor/admin activates "Momento APT", collaborators can still mark statuses until they manually refresh the page. The lock state is only fetched once on component mount.

## Solution
Add a Supabase Realtime subscription to the `momento_apt_settings` table so all connected clients receive lock/unlock changes instantly.

## Technical Changes

### 1. Enable Realtime on `momento_apt_settings` table (Database Migration)
Run SQL to add the table to the realtime publication:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.momento_apt_settings;
```

### 2. Update `src/hooks/useMomentoAPT.ts`
Add a `useEffect` that subscribes to `postgres_changes` on the `momento_apt_settings` table. On any INSERT/UPDATE/DELETE event, call `fetchSettings()` to refresh the local state. Clean up the subscription on unmount.

This ensures that when a gestor toggles the lock, every other user's browser receives the change within seconds -- no refresh needed.

