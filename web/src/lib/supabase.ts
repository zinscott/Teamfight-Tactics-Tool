import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Incorrect Supabase URL");
}
if (!supabaseKey) {
  throw new Error("Incorrect Supabase Service Role Key");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
