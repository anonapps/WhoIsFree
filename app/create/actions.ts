"use server"

import { headers } from "next/headers"
import { randomBytes, randomUUID } from "crypto"
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

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 14)

  const eventBasePayload = {
    title: input.title,
    description: input.description,
    instructions: input.instructions,
    duration: input.duration,
    timezone: input.timezone,
    voting_deadline_days: input.votingDeadlineDays,
  }

  const insertEvent = async (adminId: string, includeExpiresAt: boolean) => {
    const payload = includeExpiresAt
      ? { ...eventBasePayload, admin_id: adminId, expires_at: expiresAt.toISOString() }
      : { ...eventBasePayload, admin_id: adminId }

    return supabase.from("events").insert(payload).select().single()
  }

  const attempts: Array<{ adminId: string; includeExpiresAt: boolean }> = [
    { adminId: generateAdminToken(), includeExpiresAt: true },
    { adminId: generateAdminToken(), includeExpiresAt: false },
    { adminId: randomUUID(), includeExpiresAt: true },
    { adminId: randomUUID(), includeExpiresAt: false },
  ]

  let event: { id: string; admin_id: string } | null = null
  let eventError: { code?: string; message?: string } | null = null

  for (const attempt of attempts) {
    const response = await insertEvent(attempt.adminId, attempt.includeExpiresAt)
    event = response.data
    eventError = response.error

    if (!eventError && event) {
      break
    }

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

  return {
    eventId: event.id,
    adminId: event.admin_id,
  }
}
