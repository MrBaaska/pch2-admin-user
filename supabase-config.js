/**
 * supabase-config.js
 * ----------------------------------------------------------------
 * Fill in these three values, then this Admin Dashboard will read
 * project links + submitted data straight from Supabase.
 *
 * SUPABASE_URL / SUPABASE_ANON_KEY : Project Settings -> API in your
 *   Supabase dashboard. Only ever use the "anon public" key here —
 *   NEVER the "service_role" key (that key bypasses RLS entirely and
 *   must stay server-side only).
 *
 * USER_PROJECT_BASE_URL : the GitHub Pages URL of the user-facing
 *   project that reads "?id=" from the query string, ending in "/".
 * ----------------------------------------------------------------
 */

const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co"; // TODO: replace
const SUPABASE_ANON_KEY = "YOUR-PUBLIC-ANON-KEY"; // TODO: replace
const USER_PROJECT_BASE_URL = "https://YOUR-GITHUB-PAGE/"; // TODO: replace (must end with "/")

// Storage bucket that holds files/images uploaded by the user project (if any).
const SUBMISSION_FILES_BUCKET = "submission-files";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
