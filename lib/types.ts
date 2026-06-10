export interface Event {
  id: string
  title: string
  description: string | null
  instructions: string | null
  duration: number
  timezone: string
  voting_deadline_days: number
  advanced_mode_enabled: boolean
  voting_deadline: string | null
  deletion_time: string | null
  admin_id: string
  is_closed: boolean
  created_at: string
  expires_at: string | null
}

export interface TimeSlot {
  id: string
  event_id: string
  start_time: string
  is_disabled: boolean
  created_at: string
}

export interface Participant {
  id: string
  event_id: string
  name: string
  submitted_at: string
}

export interface Response {
  id: string
  participant_id: string
  time_slot_id: string
  vote_type: 'yes' | 'preferred'
  created_at: string
}

export interface TimeSlotWithResponses extends TimeSlot {
  responses: {
    participant_id: string
    participant_name: string
    vote_type: 'yes' | 'preferred'
  }[]
  score: number
}

export interface EventWithData extends Event {
  time_slots: TimeSlotWithResponses[]
  participants: Participant[]
}
