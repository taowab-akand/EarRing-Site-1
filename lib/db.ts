import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { AdminAccessError } from './auth-errors';
export const configured = () =>
  !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
export async function db(strictCookies = false) {
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (items) => {
          try {
            items.forEach(({ name, value, options }) =>
              jar.set(name, value, options),
            );
          } catch {
            if (strictCookies) throw new AdminAccessError('session');
            /* Server component cannot write cookies. */
          }
        },
      },
    },
  );
}
export function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
export async function requireAdmin(existing?: Awaited<ReturnType<typeof db>>) {
  if (!configured()) throw new Error("Configure Supabase first.");
  const client = existing ?? await db();
  const {
    data: { user }, error: sessionError,
  } = await client.auth.getUser();
  if (sessionError || !user) throw new AdminAccessError('session');
  const { data, error } = await client
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new AdminAccessError('database');
  if (!data) throw new AdminAccessError('permission');
  return client;
}
