import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { ParticipantView } from "./participant-view"

interface EventPageProps {
  params: Promise<{ id: string }>
}

export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch event data
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (eventError || !event) {
    notFound()
  }

  // Check if event is expired
  if (event.expires_at && new Date(event.expires_at) < new Date()) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Event Expired</h1>
          <p className="text-muted-foreground">
            This event is no longer accepting responses.
          </p>
        </div>
      </div>
    )
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
    />
  )
}
