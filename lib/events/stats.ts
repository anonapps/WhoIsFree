import { createClient } from "@/lib/supabase/server"

const STATS_ROW_ID = 1

type AggregateCounts = {
  totalEvents: number
  totalParticipants: number
}

const isMissingDatabaseObjectError = (error: { code?: string; message?: string } | null) => {
  if (!error) return false

  const message = error.message?.toLowerCase() ?? ""

  return (
    error.code === "42P01" ||
    error.code === "42883" ||
    message.includes("does not exist") ||
    message.includes("could not find the function")
  )
}

async function getLiveAggregateCounts(): Promise<AggregateCounts> {
  const supabase = await createClient()

  const [{ count: eventsCount }, { count: participantsCount }] = await Promise.all([
    supabase.from("events").select("id", { count: "exact", head: true }),
    supabase.from("participants").select("id", { count: "exact", head: true }),
  ])

  return {
    totalEvents: eventsCount ?? 0,
    totalParticipants: participantsCount ?? 0,
  }
}

export async function incrementTotalEvents() {
  const supabase = await createClient()
  const { error } = await supabase.rpc("increment_total_events")

  if (error && !isMissingDatabaseObjectError(error)) {
    console.error("Failed to increment total events:", error)
  }
}

export async function incrementTotalParticipants() {
  const supabase = await createClient()
  const { error } = await supabase.rpc("increment_total_participants")

  if (error && !isMissingDatabaseObjectError(error)) {
    console.error("Failed to increment total participants:", error)
  }
}

export async function getGlobalStats() {
  const supabase = await createClient()
  const [statsResult, liveCounts] = await Promise.all([
    supabase
      .from("stats_global")
      .select("total_events,total_participants")
      .eq("id", STATS_ROW_ID)
      .single(),
    getLiveAggregateCounts(),
  ])

  if (statsResult.error) {
    if (!isMissingDatabaseObjectError(statsResult.error)) {
      console.error("Failed to fetch global stats:", statsResult.error)
    }

    return liveCounts
  }

  return {
    totalEvents: Math.max(statsResult.data?.total_events ?? 0, liveCounts.totalEvents),
    totalParticipants: Math.max(statsResult.data?.total_participants ?? 0, liveCounts.totalParticipants),
  }
}
