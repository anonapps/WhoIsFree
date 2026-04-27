import { createClient } from "@/lib/supabase/server"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { ParticipantView } from "./participant-view"

interface EventPageProps {
  params: Promise<{ id: string }>
}

export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const requestHeaders = await headers()
  const visitorTimezone = requestHeaders.get("x-vercel-ip-timezone")

  // Fetch event data
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (eventError || !event) {
    notFound()
  }

  const now = Date.now()
  const deletionTime = event.deletion_time ?? event.expires_at

  // Hard-delete and redirect when deletion window is reached
  if (deletionTime && new Date(deletionTime).getTime() <= now) {
    await supabase.from("events").delete().eq("id", id)
    redirect("/")
  }

  // Fetch time slots
  const { data: timeSlots } = await supabase
    .from('time_slots')
    .select('*')
    .eq('event_id', id)
    .eq('is_disabled', false)
    .order('start_time', { ascending: true })

  // Fetch existing participants count
  const { count: participantCount } = await supabase
    .from('participants')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', id)

  return (
    <ParticipantView
      event={event}
      timeSlots={timeSlots || []}
      participantCount={participantCount || 0}
      initialTimezone={visitorTimezone}
    />
  )
}
