"use server"

import { headers } from "next/headers"
import { randomBytes } from "crypto"
import { purgeExpiredEvents } from "@/lib/events/maintenance"
import { checkRateLimit } from "@/lib/security/rate-limit"
import { createClient } from "@/lib/supabase/server"

interface CreateEventInput {
  title: string
  description: string | null
  instructions: string | null
  duration: number
  timezone: string
  votingDeadlineDays: number
  advancedModeEnabled?: boolean
  timeSlots: string[]
}

const CREATE_EVENT_LIMIT = 10
const CREATE_EVENT_WINDOW_MS = 60 * 60 * 1000

const getRequesterIp = async () => {
  const headerStore = await headers()
  const forwardedFor = headerStore.get("x-forwarded-for")

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown"
  }

  return headerStore.get("x-real-ip") ?? "unknown"
}

const generateAdminToken = () => randomBytes(32).toString("hex")

export async function createEvent(input: CreateEventInput) {
  await purgeExpiredEvents()

  const requesterIp = await getRequesterIp()
  const rateLimit = checkRateLimit({
    key: `create-event:${requesterIp}`,
    limit: CREATE_EVENT_LIMIT,
    windowMs: CREATE_EVENT_WINDOW_MS,
  })

  if (!rateLimit.allowed) {
    return { error: "Too many events created. Please try again shortly." }
  }

  const supabase = await createClient()
  const now = new Date()
  const votingDeadline = new Date(now)
  votingDeadline.setDate(votingDeadline.getDate() + input.votingDeadlineDays)
  const deletionTime = new Date(now)
  deletionTime.setDate(deletionTime.getDate() + 14)
  const adminId = generateAdminToken()

  const { data, error } = await supabase.rpc("create_whoisfree_event", {
    p_title: input.title,
    p_description: input.description,
    p_instructions: input.instructions,
    p_duration: input.duration,
    p_timezone: input.timezone,
    p_voting_deadline_days: input.votingDeadlineDays,
    p_advanced_mode_enabled: input.advancedModeEnabled ?? false,
    p_admin_id: adminId,
    p_voting_deadline: votingDeadline.toISOString(),
    p_deletion_time: deletionTime.toISOString(),
    p_time_slots: input.timeSlots,
  })

  if (error || !data) {
    console.error("Error creating event:", error)
    return { error: "Failed to create event" }
  }

  const result = data as { eventId?: string; adminId?: string }
  if (!result.eventId || !result.adminId) {
    console.error("Create event RPC returned an invalid result")
    return { error: "Failed to create event" }
  }

  return {
    eventId: result.eventId,
    adminId: result.adminId,
  }
}
