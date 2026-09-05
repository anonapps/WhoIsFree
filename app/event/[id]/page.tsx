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

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single()

  if (eventError || !event) {
    notFound()
  }

  const now = Date.now()
  const deletionTime = event.deletion_time ?? event.expires_at

  if (deletionTime && new Date(deletionTime).getTime() <= now) {
    redirect("/")
  }

  const { data: timeSlots } = await supabase
    .from("time_slots")
    .select("*")
    .eq("event_id", id)
    .eq("is_disabled", false)
    .order("start_time", { ascending: true })

  const { data: participantCount, error: participantCountError } = await supabase.rpc(
    "get_whoisfree_participant_count",
    { p_event_id: id },
  )

  if (participantCountError) {
    console.error("Failed to fetch participant count:", participantCountError)
  }

  return (
    <ParticipantView
      event={event}
      timeSlots={timeSlots || []}
      participantCount={Number(participantCount ?? 0)}
      initialTimezone={visitorTimezone}
    />
  )
}
