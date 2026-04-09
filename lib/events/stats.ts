import { createClient } from "@/lib/supabase/server"

const STATS_ROW_ID = 1

export async function incrementTotalEvents() {
  const supabase = await createClient()
  const { error } = await supabase.rpc("increment_total_events")

  if (error) {
    console.error("Failed to increment total events:", error)
  }
}

export async function incrementTotalParticipants() {
  const supabase = await createClient()
  const { error } = await supabase.rpc("increment_total_participants")

  if (error) {
    console.error("Failed to increment total participants:", error)
  }
}

export async function getGlobalStats() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("stats_global")
    .select("total_events,total_participants")
    .eq("id", STATS_ROW_ID)
    .single()

  if (error || !data) {
    console.error("Failed to fetch global stats:", error)
    return { totalEvents: 0, totalParticipants: 0 }
  }

  return {
    totalEvents: data.total_events ?? 0,
    totalParticipants: data.total_participants ?? 0,
  }
}
