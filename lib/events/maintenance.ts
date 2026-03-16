import { createClient } from "@/lib/supabase/server"

export async function purgeExpiredEvents() {
  const supabase = await createClient()

  const { error } = await supabase.rpc("purge_expired_events")

  if (error) {
    console.error("Failed to purge expired events:", error)
  }
}
