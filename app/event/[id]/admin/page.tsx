import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { AdminDashboard } from "./admin-dashboard"

interface AdminPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ key?: string }>
}

export default async function AdminPage({ params, searchParams }: AdminPageProps) {
  const { id } = await params
  const { key } = await searchParams
  
  if (!key) {
    redirect(`/event/${id}`)
  }

  const supabase = await createClient()

  // Fetch event and verify admin key
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .eq('admin_id', key)
    .single()

  if (eventError || !event) {
    notFound()
  }

  // Fetch time slots with responses
  const { data: timeSlots } = await supabase
    .from('time_slots')
    .select('*')
    .eq('event_id', id)
    .order('start_time', { ascending: true })

  // Fetch participants
  const { data: participants } = await supabase
    .from('participants')
    .select('*')
    .eq('event_id', id)
    .order('submitted_at', { ascending: true })

  // Fetch all responses
  const { data: responses } = await supabase
    .from('responses')
    .select('*')
    .in('participant_id', (participants || []).map(p => p.id))

  // Build the full data structure
  const timeSlotsWithResponses = (timeSlots || []).map(slot => {
    const slotResponses = (responses || [])
      .filter(r => r.time_slot_id === slot.id)
      .map(r => {
        const participant = participants?.find(p => p.id === r.participant_id)
        return {
          participant_id: r.participant_id,
          participant_name: participant?.name || 'Unknown',
          vote_type: r.vote_type as 'yes' | 'preferred',
        }
      })
    
    // Calculate weighted score (preferred = 2, yes = 1)
    const score = slotResponses.reduce((acc, r) => {
      return acc + (r.vote_type === 'preferred' ? 2 : 1)
    }, 0)

    return {
      ...slot,
      responses: slotResponses,
      score,
    }
  })

  return (
    <AdminDashboard
      event={event}
      timeSlots={timeSlotsWithResponses}
      participants={participants || []}
      adminKey={key}
    />
  )
}
