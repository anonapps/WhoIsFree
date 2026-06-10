import { createClient } from "@/lib/supabase/server"

const STATS_ROW_ID = 1

type GlobalStats = {
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

async function runStatsIncrement(functionName: "increment_total_events" | "increment_total_participants") {
  const supabase = await createClient()
  const { error } = await supabase.rpc(functionName)

  if (!error) {
    return true
  }

  if (isMissingDatabaseObjectError(error)) {
    console.error("Global stats database objects are missing. Run the latest migrations.", error)
  } else {
    console.error(`Failed to run ${functionName}:`, error)
  }

  return false
}

export async function incrementTotalEvents() {
  return runStatsIncrement("increment_total_events")
}

export async function incrementTotalParticipants() {
  return runStatsIncrement("increment_total_participants")
}

export async function getGlobalStats(): Promise<GlobalStats> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("global_stats")
    .select("events_created_total,participants_submitted_total")
    .eq("id", STATS_ROW_ID)
    .single()

  if (error) {
    if (isMissingDatabaseObjectError(error)) {
      console.error("Global stats table is missing. Run the latest migrations.", error)
    } else {
      console.error("Failed to fetch global stats:", error)
    }

    return {
      totalEvents: 0,
      totalParticipants: 0,
    }
  }

  return {
    totalEvents: Number(data?.events_created_total ?? 0),
    totalParticipants: Number(data?.participants_submitted_total ?? 0),
  }
}
