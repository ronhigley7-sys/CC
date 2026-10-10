-- Supabase hardening for project xnsdvdfceflmagfhpycw
-- NOT APPLIED. Review, then run in the Supabase SQL editor.
-- Checked first: index.html never calls these 4 views or run_cc_weekly_backup(),
-- and the weekly backup runs from pg_cron as postgres, so these changes do not touch the app.

-- 1) Backup function: stop anon / signed-in users from calling it through /rest/v1/rpc
revoke execute on function public.run_cc_weekly_backup() from public, anon, authenticated;
-- postgres (pg_cron) and service_role keep EXECUTE.

-- 2) The 4 views: run with the caller's permissions instead of the view owner's
alter view public.needs_sentiment_review   set (security_invoker = true);
alter view public.pending_card_approval    set (security_invoker = true);
alter view public.ready_recognition_cards  set (security_invoker = true);
alter view public.employee_directory_public set (security_invoker = true);

-- 3) Make the views read-only for API roles (anon currently has INSERT/UPDATE/DELETE/TRUNCATE).
--    employee_directory_public is a simple view, so anon could UPDATE employee_directory through it.
revoke insert, update, delete, truncate, references, trigger
  on public.needs_sentiment_review, public.pending_card_approval,
     public.ready_recognition_cards, public.employee_directory_public
  from anon, authenticated;

-- NOTE: employee_directory has RLS on with no policy, so after step 2 anon sees no directory rows
-- through these views (the card views still return rows, with employee_name/email empty).
-- Edge functions using the service_role key are unaffected. If another app reads these views
-- with the anon key, tell me before running step 2.

-- ROLLBACK
-- alter view public.needs_sentiment_review    set (security_invoker = false);
-- alter view public.pending_card_approval     set (security_invoker = false);
-- alter view public.ready_recognition_cards   set (security_invoker = false);
-- alter view public.employee_directory_public set (security_invoker = false);
-- grant execute on function public.run_cc_weekly_backup() to anon, authenticated;
