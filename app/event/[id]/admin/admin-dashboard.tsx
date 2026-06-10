"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Calendar, Users, Clock, Copy, Check, RefreshCw, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AdminCountdownBanner } from "@/components/admin-countdown-banner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { COMMON_TIMEZONES, getUserTimezone, formatDateForDisplay, formatTimeForDisplay } from "@/lib/timezone"
import type { Event, Participant, TimeSlotWithResponses } from "@/lib/types"
import { useRouter } from "next/navigation"

interface AdminDashboardProps {
  event: Event
  timeSlots: TimeSlotWithResponses[]
  participants: Participant[]
  adminKey: string
}

export function AdminDashboard({ event, timeSlots, participants, adminKey }: AdminDashboardProps) {
  const router = useRouter()
  const [timezone, setTimezone] = useState(() => getUserTimezone())
  const [linkCopied, setLinkCopied] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)

  const isAdvancedMode = event.advanced_mode_enabled === true

  const participantLink = typeof window !== 'undefined' 
    ? `${window.location.origin}/event/${event.id}`
    : `/event/${event.id}`

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(participantLink)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    router.refresh()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  // Calculate max score for heatmap scaling
  const maxScore = useMemo(() => {
    return Math.max(...timeSlots.map(s => s.score), 1)
  }, [timeSlots])

  // Group time slots by date
  const slotsByDate = useMemo(() => {
    return timeSlots.reduce((acc, slot) => {
      const date = formatDateForDisplay(slot.start_time, timezone)
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(slot)
      return acc
    }, {} as Record<string, TimeSlotWithResponses[]>)
  }, [timeSlots, timezone])

  // Get best slots (top 3 by score)
  const bestSlots = useMemo(() => {
    return [...timeSlots]
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
  }, [timeSlots])

  const selectedParticipant = useMemo(() => {
    if (!isAdvancedMode || !selectedParticipantId) return null
    return participants.find((participant) => participant.id === selectedParticipantId) ?? null
  }, [isAdvancedMode, participants, selectedParticipantId])

  const selectedSlot = useMemo(() => {
    if (!isAdvancedMode || !selectedSlotId) return null
    return timeSlots.find((slot) => slot.id === selectedSlotId) ?? null
  }, [isAdvancedMode, selectedSlotId, timeSlots])

  const selectedSlotResponses = selectedSlot?.responses ?? []

  const handleParticipantClick = (participantId: string) => {
    if (!isAdvancedMode) return
    setSelectedParticipantId((currentParticipantId) =>
      currentParticipantId === participantId ? null : participantId,
    )
    setSelectedSlotId(null)
  }

  const handleSlotClick = (slotId: string) => {
    if (!isAdvancedMode) return
    setSelectedSlotId((currentSlotId) => (currentSlotId === slotId ? null : slotId))
    setSelectedParticipantId(null)
  }

  const clearAdvancedSelection = () => {
    setSelectedParticipantId(null)
    setSelectedSlotId(null)
  }

  // Get heatmap color based on score
  const getHeatmapColor = (score: number): string => {
    if (score === 0) return 'bg-muted'
    const intensity = score / maxScore
    if (intensity >= 0.8) return 'bg-primary'
    if (intensity >= 0.6) return 'bg-primary/80'
    if (intensity >= 0.4) return 'bg-primary/60'
    if (intensity >= 0.2) return 'bg-primary/40'
    return 'bg-primary/20'
  }

  const getSlotParticipantResponse = (slot: TimeSlotWithResponses) => {
    if (!selectedParticipantId) return null
    return slot.responses.find((response) => response.participant_id === selectedParticipantId) ?? null
  }

  const getAdvancedSlotClassName = (slot: TimeSlotWithResponses) => {
    const selectedClassName = selectedSlotId === slot.id ? 'ring-2 ring-primary ring-offset-2' : ''

    if (!selectedParticipantId) {
      return `${getHeatmapColor(slot.score)} ${slot.score > 0 ? 'text-primary-foreground' : 'text-muted-foreground'} ${selectedClassName}`
    }

    const participantResponse = getSlotParticipantResponse(slot)

    if (participantResponse?.vote_type === 'preferred') {
      return `bg-primary text-primary-foreground ${selectedClassName}`
    }

    if (participantResponse?.vote_type === 'yes') {
      return `bg-primary/30 text-primary ${selectedClassName}`
    }

    return 'bg-muted/40 text-muted-foreground opacity-50'
  }

  const getSlotDetailText = (slot: TimeSlotWithResponses) => {
    if (isAdvancedMode && selectedParticipantId) {
      const participantResponse = getSlotParticipantResponse(slot)
      if (participantResponse?.vote_type === 'preferred') return 'Preferred'
      if (participantResponse?.vote_type === 'yes') return 'Available'
      return 'No selection'
    }

    return `${slot.responses.length} vote${slot.responses.length !== 1 ? 's' : ''}`
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">WhoIsFree</span>
          </Link>
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {event.voting_deadline && event.deletion_time && (
          <AdminCountdownBanner
            votingDeadline={event.voting_deadline}
            deletionTime={event.deletion_time}
          />
        )}

        {/* Event Info */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">{event.title}</h1>
          {event.description && (
            <p className="text-muted-foreground mb-4">{event.description}</p>
          )}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{event.duration} minutes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span>{participants.length} response{participants.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Heatmap */}
          <div className="lg:col-span-2 space-y-6">
            {/* Share Link */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Share Link</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={participantLink}
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" onClick={copyToClipboard}>
                    {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={participantLink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Heatmap */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Availability Heatmap</CardTitle>
                    <CardDescription>
                      Darker colors indicate more availability
                    </CardDescription>
                  </div>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {isAdvancedMode && selectedParticipant && (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-muted p-3 text-sm">
                    <span>Showing selections for {selectedParticipant.name}</span>
                    <button type="button" className="text-primary hover:underline" onClick={clearAdvancedSelection}>
                      Clear
                    </button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {participants.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No responses yet</p>
                    <p className="text-sm">Share the link to start collecting availability</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(slotsByDate).map(([date, slots]) => (
                      <div key={date}>
                        <h3 className="font-medium mb-3">{date}</h3>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                          {slots.map((slot) => (
                            <div
                              key={slot.id}
                              className={`
                                p-3 rounded-lg text-center transition-all
                                ${isAdvancedMode ? 'cursor-pointer hover:ring-2 hover:ring-primary/40' : 'cursor-default'}
                                ${isAdvancedMode
                                  ? getAdvancedSlotClassName(slot)
                                  : `${getHeatmapColor(slot.score)} ${slot.score > 0 ? 'text-primary-foreground' : 'text-muted-foreground'}`}
                              `}
                              title={`${slot.responses.length} response(s), Score: ${slot.score}`}
                              onClick={() => handleSlotClick(slot.id)}
                            >
                              <div className="text-sm font-medium">
                                {formatTimeForDisplay(slot.start_time, timezone)}
                              </div>
                              <div className="text-xs mt-1 opacity-80">
                                {getSlotDetailText(slot)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Legend */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-4 border-t">
                      <span>Less</span>
                      <div className="flex gap-1">
                        <div className="w-4 h-4 rounded bg-muted" />
                        <div className="w-4 h-4 rounded bg-primary/20" />
                        <div className="w-4 h-4 rounded bg-primary/40" />
                        <div className="w-4 h-4 rounded bg-primary/60" />
                        <div className="w-4 h-4 rounded bg-primary/80" />
                        <div className="w-4 h-4 rounded bg-primary" />
                      </div>
                      <span>More</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Stats & Participants */}
          <div className="space-y-6">
            {/* Best Times */}
            {bestSlots.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Best Times</CardTitle>
                  <CardDescription>
                    Based on weighted availability (preferred = 2, available = 1)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {bestSlots.map((slot, index) => (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`
                            w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                            ${index === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20'}
                          `}>
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium text-sm">
                              {formatTimeForDisplay(slot.start_time, timezone)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDateForDisplay(slot.start_time, timezone)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-sm">Score: {slot.score}</div>
                          <div className="text-xs text-muted-foreground">
                            {slot.responses.length} vote{slot.responses.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Participants */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Participants</CardTitle>
                <CardDescription>
                  {isAdvancedMode && selectedSlot
                    ? `Showing voters for ${formatTimeForDisplay(selectedSlot.start_time, timezone)}`
                    : `${participants.length} response${participants.length !== 1 ? 's' : ''} received`}
                </CardDescription>
                {isAdvancedMode && selectedSlot && (
                  <button type="button" className="mt-2 text-left text-sm text-primary hover:underline" onClick={clearAdvancedSelection}>
                    Clear selection
                  </button>
                )}
              </CardHeader>
              <CardContent>
                {participants.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No responses yet</p>
                ) : isAdvancedMode && selectedSlot ? (
                  selectedSlotResponses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No one voted for this slot</p>
                  ) : (
                    <ul className="space-y-2">
                      {selectedSlotResponses.map((response) => (
                        <li
                          key={`${selectedSlot.id}-${response.participant_id}`}
                          className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm"
                        >
                          <span className="font-medium">{response.participant_name}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            response.vote_type === 'preferred'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-primary/10 text-primary'
                          }`}>
                            {response.vote_type === 'preferred' ? 'Preferred' : 'Available'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )
                ) : (
                  <ul className="space-y-2">
                    {participants.map((p) => {
                      const participantVotes = timeSlots.flatMap(s => 
                        s.responses.filter(r => r.participant_id === p.id)
                      )
                      return (
                        <li
                          key={p.id}
                          className={`flex items-center justify-between p-2 rounded bg-muted/50 text-sm ${
                            isAdvancedMode
                              ? `cursor-pointer transition-colors hover:bg-muted ${selectedParticipantId === p.id ? 'ring-2 ring-primary' : ''}`
                              : ''
                          }`}
                          onClick={() => handleParticipantClick(p.id)}
                        >
                          <span className="font-medium">{p.name}</span>
                          <span className="text-muted-foreground">
                            {participantVotes.length} slot{participantVotes.length !== 1 ? 's' : ''}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Admin Link Reminder */}
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">
                  Bookmark this page to access your results later. 
                  The admin link cannot be recovered if lost.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
