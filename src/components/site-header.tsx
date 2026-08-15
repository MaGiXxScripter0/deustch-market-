import { getCurrentProfile } from "@/lib/supabase/server";
import { SiteHeaderClient } from "./site-header-client";

export async function SiteHeader() {
  const auth = await getCurrentProfile();
  const displayName = auth?.profile?.full_name?.trim() || undefined;

  return <SiteHeaderClient account={{ isAuthenticated: Boolean(auth), displayName }} />;
}
