-- Move expire-bookings from Vercel cron to Supabase pg_cron
-- Runs every hour: marks pending bookings past payment_deadline as expired

-- Enable pg_cron extension (already available on all Supabase plans)
create extension if not exists pg_cron with schema extensions;

-- Schedule the job: run every hour
select cron.schedule(
  'expire-unpaid-bookings',
  '0 * * * *',  -- every hour at :00
  $$
  update bookings
  set status = 'expired', updated_at = now()
  where status = 'pending'
    and payment_deadline < now()
  $$
);
