"use server"

import { headers } from "next/headers"
import { purgeExpiredEvents } from "@/lib/events/maintenance"
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
  const { data, error } = await supabase.rpc("submit_whoisfree_votes", {
    p_event_id: input.eventId,
    p_name: input.name,
    p_votes: input.votes,
  })

  if (error) {
    console.error("Error submitting votes:", error)
    const message = error.message?.toLowerCase() ?? ""
    if (message.includes("voting") || message.includes("no longer available")) {
      return { error: error.message }
    }
    return { error: "Failed to submit response" }
  }

  const result = data as { success?: boolean } | null
  if (!result?.success) {
    return { error: "Failed to submit response" }
  }

  return { success: true }
}
