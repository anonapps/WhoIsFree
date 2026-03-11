"use server"

import { createClient } from "@/lib/supabase/server"

interface SubmitVotesInput {
  eventId: string
  name: string
  votes: { slotId: string; voteType: 'yes' | 'preferred' }[]
}

export async function submitVotes(input: SubmitVotesInput) {
  const supabase = await createClient()

  // Create participant
  const { data: participant, error: participantError } = await supabase
    .from('participants')
    .insert({
      event_id: input.eventId,
      name: input.name,
    })
    .select()
    .single()

  if (participantError || !participant) {
    console.error('Error creating participant:', participantError)
    return { error: 'Failed to submit response' }
  }

  // Create responses if there are votes
  if (input.votes.length > 0) {
    const responses = input.votes.map(vote => ({
      participant_id: participant.id,
      time_slot_id: vote.slotId,
      vote_type: vote.voteType,
    }))

    const { error: responsesError } = await supabase
      .from('responses')
      .insert(responses)

    if (responsesError) {
      console.error('Error creating responses:', responsesError)
      // Clean up participant
      await supabase.from('participants').delete().eq('id', participant.id)
      return { error: 'Failed to submit votes' }
    }
  }

  return { success: true }
}
