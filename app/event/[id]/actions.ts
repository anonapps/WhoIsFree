"use server"

import { headers } from "next/headers"
import { randomUUID } from "crypto"
import { purgeExpiredEvents } from "@/lib/events/maintenance"
import { incrementTotalParticipants } from "@/lib/events/stats"
import { checkRateLimit } from "@/lib/security/rate-limit"
import { createClient } from "@/lib/supabase/server"

interface SubmitVotesInput {
  eventId: string
  name: string
  votes: { slotId: string; voteType: "yes" | "preferred" }[]
}

type DatabaseErrorLike = {
  code?: string
  message?: string
}

const SUBMIT_VOTES_LIMIT = 20
const SUBMIT_VOTES_WINDOW_MS = 60 * 60 * 1000

const getRequesterIp = async () => {
  const headerStore = await headers()
  const forwardedFor = headerStore.get("x-forwarded-for")

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown"
  }

  return headerStore.get("x-real-ip") ?? "unknown"
}

const isMissingColumnError = (error: DatabaseErrorLike | null) => {
  if (!error) return false
  const message = error.message?.toLowerCase() ?? ""
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    (message.includes("column") && message.includes("does not exist")) ||
    (message.includes("schema cache") && message.includes("column"))
  )
}

export async function submitVotes(input: SubmitVotesInput) {
  await purgeExpiredEvents()

  const requesterIp = await getRequesterIp()
  const normalizedName = input.name.trim().toLowerCase()
  const rateLimit = checkRateLimit({
    key: `submit-votes:${input.eventId}:${requesterIp}:${normalizedName}`,
    limit: SUBMIT_VOTES_LIMIT,
    windowMs: SUBMIT_VOTES_WINDOW_MS,
  })

  if (!rateLimit.allowed) {
    return { error: "Too many vote submissions. Please try again shortly." }
  }

  const supabase = await createClient()
  let { data: event, error: eventError } = await supabase
    .from("events")
    .select("id,voting_deadline,deletion_time,expires_at")
    .eq("id", input.eventId)
    .single()

  if (eventError) {
    if (!isMissingColumnError(eventError)) {
      console.warn("Primary event lookup failed, retrying with legacy select:", eventError)
    }
    const fallbackResult = await supabase
      .from("events")
      .select("id,expires_at")
      .eq("id", input.eventId)
      .single()

    event = fallbackResult.data
      ? {
          ...fallbackResult.data,
          voting_deadline: null,
          deletion_time: null,
        }
      : null
    eventError = fallbackResult.error
  }

  if (eventError || !event) {
    return { error: "This event is no longer available." }
  }

  const deletionTime = event.deletion_time ?? event.expires_at

  if (deletionTime && new Date(deletionTime).getTime() <= Date.now()) {
    return { error: "This event is no longer available." }
  }

  if (event.voting_deadline && new Date(event.voting_deadline).getTime() <= Date.now()) {
    return { error: "Voting is closed for this event." }
  }

  const participantId = randomUUID()
  const { error: participantError } = await supabase
    .from("participants")
    .insert({
      id: participantId,
      event_id: input.eventId,
      name: input.name,
    })

  if (participantError) {
    console.error("Error creating participant:", participantError)
    return { error: "Failed to submit response" }
  }

  if (input.votes.length > 0) {
    const responses = input.votes.map((vote) => ({
      participant_id: participantId,
      time_slot_id: vote.slotId,
      vote_type: vote.voteType,
    }))

    const { error: responsesError } = await supabase.from("responses").insert(responses)

    if (responsesError) {
      console.error("Error creating responses:", responsesError)
      return { error: "Failed to submit votes" }
    }
  }

  const statsIncremented = await incrementTotalParticipants()

  if (!statsIncremented) {
    console.error("Participant was stored but aggregate statistics could not be incremented")
    return { error: "Failed to submit response" }
  }

  return { success: true }
}
