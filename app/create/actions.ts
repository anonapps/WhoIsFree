"use server"

import { headers } from "next/headers"
import { randomBytes } from "crypto"
import { purgeExpiredEvents } from "@/lib/events/maintenance"
import { incrementTotalEvents } from "@/lib/events/stats"
import { checkRateLimit } from "@/lib/security/rate-limit"
import { createClient } from "@/lib/supabase/server"

interface CreateEventInput {
  title: string
  description: string | null
  instructions: string | null
  duration: number
  timezone: string
  votingDeadlineDays: number
  timeSlots: string[]
}

type DatabaseErrorLike = {
  code?: string
  message?: string
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

const isMissingColumnError = (error: DatabaseErrorLike | null) => {
  if (!error) return false
  return error.code === "42703" || error.message?.includes("column") && error.message?.includes("does not exist")
}

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

  const eventInsertPayload = {
    title: input.title,
    description: input.description,
    instructions: input.instructions,
    duration: input.duration,
    timezone: input.timezone,
    voting_deadline_days: input.votingDeadlineDays,
    voting_deadline: votingDeadline.toISOString(),
    deletion_time: deletionTime.toISOString(),
    admin_id: generateAdminToken(),
    expires_at: deletionTime.toISOString(),
  }

  let { data: event, error: eventError } = await supabase
    .from("events")
    .insert(eventInsertPayload)
    .select()
    .single()

  // Backward compatibility for environments where new columns are not migrated yet.
  if (isMissingColumnError(eventError)) {
    const { voting_deadline: _votingDeadline, deletion_time: _deletionTime, ...legacyPayload } = eventInsertPayload
    const fallbackResult = await supabase.from("events").insert(legacyPayload).select().single()
    event = fallbackResult.data
    eventError = fallbackResult.error
  }

  if (eventError || !event) {
    console.error("Error creating event:", eventError)
    return { error: "Failed to create event" }
  }

  const timeSlots = input.timeSlots.map((startTime) => ({
    event_id: event.id,
    start_time: startTime,
  }))

  const { error: slotsError } = await supabase.from("time_slots").insert(timeSlots)

  if (slotsError) {
    console.error("Error creating time slots:", slotsError)
    await supabase.from("events").delete().eq("id", event.id)
    return { error: "Failed to create time slots" }
  }

  await incrementTotalEvents()

  return {
    eventId: event.id,
    adminId: event.admin_id,
  }
}
