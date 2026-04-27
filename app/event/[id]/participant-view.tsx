"use client"

import { useMemo, useState, useEffect } from "react"
import Link from "next/link"
import { Calendar, Users, Clock, Info, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { COMMON_TIMEZONES, getUserTimezone, formatDateForDisplay, formatTimeRangeForDisplay } from "@/lib/timezone"
import type { Event, TimeSlot } from "@/lib/types"
import { submitVotes } from "./actions"

interface ParticipantViewProps {
  event: Event
  timeSlots: TimeSlot[]
  participantCount: number
}

type VoteState = 'none' | 'yes' | 'preferred'

export function ParticipantView({ event, timeSlots, participantCount }: ParticipantViewProps) {
  const [name, setName] = useState("")
  const [timezone, setTimezone] = useState("UTC")
  const [isHydrated, setIsHydrated] = useState(false)
  const [votes, setVotes] = useState<Record<string, VoteState>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Set timezone after hydration to avoid mismatch
  useEffect(() => {
    setTimezone(getUserTimezone())
    setIsHydrated(true)
  }, [])

  const timezoneOptions = useMemo(() => {
    const hasCurrentTimezone = COMMON_TIMEZONES.some((tz) => tz.value === timezone)

    if (hasCurrentTimezone) {
      return COMMON_TIMEZONES
    }

    return [
      { value: timezone, label: `${timezone} (Detected)` },
      ...COMMON_TIMEZONES,
    ]
  }, [timezone])

  // Group time slots by date
  const slotsByDate = timeSlots.reduce((acc, slot) => {
    const date = formatDateForDisplay(slot.start_time, timezone)
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(slot)
    return acc
  }, {} as Record<string, TimeSlot[]>)

  const cycleVote = (slotId: string) => {
    setVotes(prev => {
      const current = prev[slotId] || 'none'
      const next: VoteState = current === 'none' ? 'yes' : current === 'yes' ? 'preferred' : 'none'
      if (next === 'none') {
        const { [slotId]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [slotId]: next }
    })
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Please enter your name")
      return
    }

    const votedSlots = Object.entries(votes).filter(([, v]) => v !== 'none')
    if (votedSlots.length === 0) {
      setError("Please select at least one available time slot, or check 'None of these work' below")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await submitVotes({
        eventId: event.id,
        name: name.trim(),
        votes: votedSlots.map(([slotId, voteType]) => ({
          slotId,
          voteType: voteType as 'yes' | 'preferred',
        })),
      })

      if (result.error) {
        setError(result.error)
        setIsSubmitting(false)
        return
      }

      setIsSubmitted(true)
    } catch {
      setError("Something went wrong. Please try again.")
      setIsSubmitting(false)
    }
  }

  const handleNoneWork = async () => {
    if (!name.trim()) {
      setError("Please enter your name")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await submitVotes({
        eventId: event.id,
        name: name.trim(),
        votes: [],
      })

      if (result.error) {
        setError(result.error)
        setIsSubmitting(false)
        return
      }

      setIsSubmitted(true)
    } catch {
      setError("Something went wrong. Please try again.")
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Calendar className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg">WhoIsFree</span>
            </Link>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-accent" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Response Submitted!</h1>
          <p className="text-muted-foreground mb-8">
            Thank you for submitting your availability, {name}.
          </p>
          <Button asChild variant="outline">
            <Link href="/">Create Your Own Event</Link>
          </Button>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">WhoIsFree</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <form
          autoComplete="off"
          onSubmit={(e) => e.preventDefault()}
        >
        {/* Event Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">{event.title}</CardTitle>
            {event.description && (
              <CardDescription>{event.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>{event.duration} minutes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                <span>{participantCount} response{participantCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
            {event.instructions && (
              <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium mb-1">Instructions:</p>
                <p className="text-muted-foreground">{event.instructions}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Your Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Your Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name *</Label>
              <Input
                id="name"
                name="participant_input"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Your Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezoneOptions.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Time Slots */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Select Your Availability</CardTitle>
            <CardDescription>
              Click once for available, twice for preferred, third time to clear
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-2 p-3 bg-muted rounded-lg text-sm">
              <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <p className="text-muted-foreground">
                Times are shown in your timezone{isHydrated ? ` (${timezone})` : ""}.
              </p>
            </div>

            {Object.entries(slotsByDate).map(([date, slots]) => (
              <div key={date}>
                <h3 className="font-medium mb-3">{date}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {slots.map((slot) => {
                    const voteState = votes[slot.id] || 'none'
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => cycleVote(slot.id)}
                        className={`
                          p-3 rounded-lg border text-sm font-medium transition-all
                          ${voteState === 'none' ? 'border-border hover:border-primary/50 bg-card' : ''}
                          ${voteState === 'yes' ? 'border-primary bg-primary/10 text-primary' : ''}
                          ${voteState === 'preferred' ? 'border-primary bg-primary text-primary-foreground' : ''}
                        `}
                      >
                        <div>{formatTimeRangeForDisplay(slot.start_time, event.duration, timezone)}</div>
                        <div className="text-xs mt-1 opacity-70">
                          {voteState === 'none' && 'Click to select'}
                          {voteState === 'yes' && 'Available'}
                          {voteState === 'preferred' && 'Preferred'}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 border border-border rounded bg-card" />
                <span>Not selected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 border border-primary rounded bg-primary/10" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-primary" />
                <span>Preferred</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? "Submitting..." : "Submit Availability"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleNoneWork}
            disabled={isSubmitting}
          >
            None of These Work
          </Button>
        </div>
        </form>
      </main>
    </div>
  )
}
