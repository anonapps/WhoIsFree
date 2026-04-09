"use server"

import { headers } from "next/headers"
import { purgeExpiredEvents } from "@/lib/events/maintenance"
import { incrementTotalParticipants } from "@/lib/events/stats"
import { checkRateLimit } from "@/lib/security/rate-limit"
import { createClient } from "@/lib/supabase/server"

interface SubmitVotesInput {
  eventId: string
  name: string
  votes: { slotId: string; voteType: "yes" | "preferred" }[]
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
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id,voting_deadline,deletion_time")
    .eq("id", input.eventId)
    .single()

  if (eventError || !event) {
    return { error: "This event is no longer available." }
  }

  if (event.deletion_time && new Date(event.deletion_time).getTime() <= Date.now()) {
    await supabase.from("events").delete().eq("id", input.eventId)
    return { error: "This event is no longer available." }
  }

  if (event.voting_deadline && new Date(event.voting_deadline).getTime() <= Date.now()) {
    return { error: "Voting is closed for this event." }
  }

  const { data: participant, error: participantError } = await supabase
    .from("participants")
    .insert({
      event_id: input.eventId,
      name: input.name,
    })
    .select()
    .single()

  if (participantError || !participant) {
    console.error("Error creating participant:", participantError)
    return { error: "Failed to submit response" }
  }

  if (input.votes.length > 0) {
    const responses = input.votes.map((vote) => ({
      participant_id: participant.id,
      time_slot_id: vote.slotId,
      vote_type: vote.voteType,
    }))

    const { error: responsesError } = await supabase.from("responses").insert(responses)

    if (responsesError) {
      console.error("Error creating responses:", responsesError)
      await supabase.from("participants").delete().eq("id", participant.id)
      return { error: "Failed to submit votes" }
    }
  }

  await incrementTotalParticipants()

  return { success: true }
}
