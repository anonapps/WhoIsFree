import { createClient } from "@/lib/supabase/server"

export async function purgeExpiredEvents() {
  const supabase = await createClient()

  const { error } = await supabase.rpc("purge_expired_events")

  if (!error) {
    return
  }

  const isMissingRpc = error.code === "PGRST202" || error.message?.includes("purge_expired_events")

  if (isMissingRpc) {
    return
  }

  console.error("Failed to purge expired events:", error)
}
