/**
 * Optional cloud sync (Supabase). Safe to commit: use the anon key only (never the service role).
 * 1) Create a project at https://supabase.com
 * 2) Run SQL from ./supabase/user_marks.sql in the SQL editor
 * 3) Enable Auth → Providers → Email (magic link)
 * 4) Auth → URL configuration: add your site URL to Redirect URLs
 * 5) Paste URL + anon key below, redeploy or reload
 */
window.GEO_ATLAS_CLOUD = {
  supabaseUrl: "",
  supabaseAnonKey: "",
};
