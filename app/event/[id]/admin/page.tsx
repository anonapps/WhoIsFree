import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { AdminDashboard } from "./admin-dashboard"
import type { Event, Participant, Response, TimeSlot, TimeSlotWithResponses } from "@/lib/types"

interface AdminPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ key?: string }>
}

type AdminData = {
  event: Event
  time_slots: TimeSlot[]
  participants: Participant[]
  responses: Response[]
}

export default async function AdminPage({ params, searchParams }: AdminPageProps) {
  const { id } = await params
  const { key } = await searchParams

  if (!key) {
    redirect(`/event/${id}`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("get_whoisfree_admin_data", {
    p_event_id: id,
    p_admin_key: key,
  })

  if (error || !data) {
    console.error("Failed to load admin dashboard:", error)
    notFound()
  }

  const adminData = data as AdminData
  const event = adminData.event

  const now = Date.now()
  const deletionTime = event.deletion_time ?? event.expires_at
  if (deletionTime && new Date(deletionTime).getTime() <= now) {
    redirect("/")
  }

  const votingDeadline =
    event.voting_deadline ??
    new Date(
      new Date(event.created_at).getTime() + event.voting_deadline_days * 24 * 60 * 60 * 1000,
    ).toISOString()

  const participants = adminData.participants || []
  const responses = adminData.responses || []
  const timeSlots = adminData.time_slots || []

  const timeSlotsWithResponses: TimeSlotWithResponses[] = timeSlots.map((slot) => {
    const slotResponses = responses
      .filter((response) => response.time_slot_id === slot.id)
      .map((response) => {
        const participant = participants.find((candidate) => candidate.id === response.participant_id)
        return {
          participant_id: response.participant_id,
          participant_name: participant?.name || "Unknown",
          vote_type: response.vote_type,
        }
      })

    const score = slotResponses.reduce(
      (acc, response) => acc + (response.vote_type === "preferred" ? 2 : 1),
      0,
    )

    return {
      ...slot,
      responses: slotResponses,
      score,
    }
  })

  return (
    <AdminDashboard
      event={{
        ...event,
        voting_deadline: votingDeadline,
        deletion_time: deletionTime,
      }}
      timeSlots={timeSlotsWithResponses}
      participants={participants}
      adminKey={key}
    />
  )
}
