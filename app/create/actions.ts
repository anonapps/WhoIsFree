"use server"

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

export async function createEvent(input: CreateEventInput) {
  const supabase = await createClient()

  // Calculate expiry date (14 days from now)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 14)

  // Create the event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      title: input.title,
      description: input.description,
      instructions: input.instructions,
      duration: input.duration,
      timezone: input.timezone,
      voting_deadline_days: input.votingDeadlineDays,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (eventError || !event) {
    console.error('Error creating event:', eventError)
    return { error: 'Failed to create event' }
  }

  // Create time slots
  const timeSlots = input.timeSlots.map(startTime => ({
    event_id: event.id,
    start_time: startTime,
  }))

  const { error: slotsError } = await supabase
    .from('time_slots')
    .insert(timeSlots)

  if (slotsError) {
    console.error('Error creating time slots:', slotsError)
    // Clean up the event
    await supabase.from('events').delete().eq('id', event.id)
    return { error: 'Failed to create time slots' }
  }

  return {
    eventId: event.id,
    adminId: event.admin_id,
  }
}
