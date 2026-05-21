"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Calendar, ArrowLeft, ArrowRight, Info, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { COMMON_TIMEZONES, getUserTimezone } from "@/lib/timezone"
import { TimeSlotSelector } from "@/components/time-slot-selector"
import { createEvent } from "./actions"

const DRAFT_KEY = "event_draft"
const DRAFT_EXPIRY_MS = 60 * 60 * 1000

type CreateDraft = {
  currentStep: number
  title: string
  description: string
  instructions: string
  duration: string
  timezone: string
  votingDeadlineDays: string
  selectedSlots: string[]
  draftTimestamp: string
}

export default function CreateEventPage() {
  const router = useRouter()
  const isRestoringRef = useRef(false)
  const hasBootstrappedHistory = useRef(false)
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false)
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [instructions, setInstructions] = useState("")
  const [duration, setDuration] = useState("60")
  const [timezone, setTimezone] = useState(() => getUserTimezone())
  const [votingDeadlineDays, setVotingDeadlineDays] = useState("3")
  const [selectedSlots, setSelectedSlots] = useState<Date[]>([])

  useEffect(() => {
    if (typeof window === "undefined") return

    const rawDraft = window.sessionStorage.getItem(DRAFT_KEY)
    if (rawDraft) {
      try {
        const parsedDraft = JSON.parse(rawDraft) as CreateDraft
        const draftTimestamp = new Date(parsedDraft.draftTimestamp).getTime()
        const isExpired = !Number.isFinite(draftTimestamp) || Date.now() - draftTimestamp > DRAFT_EXPIRY_MS

        if (isExpired) {
          window.sessionStorage.removeItem(DRAFT_KEY)
        } else {
          isRestoringRef.current = true
          setStep(Math.min(Math.max(parsedDraft.currentStep ?? 1, 1), 3))
          setTitle(parsedDraft.title ?? "")
          setDescription(parsedDraft.description ?? "")
          setInstructions(parsedDraft.instructions ?? "")
          setDuration(parsedDraft.duration ?? "60")
          setTimezone(parsedDraft.timezone ?? getUserTimezone())
          setVotingDeadlineDays(parsedDraft.votingDeadlineDays ?? "3")
          setSelectedSlots((parsedDraft.selectedSlots ?? []).map((slot) => new Date(slot)).filter((slot) => !Number.isNaN(slot.getTime())))
        }
      } catch {
        window.sessionStorage.removeItem(DRAFT_KEY)
      }
    }

    setHasLoadedDraft(true)
    isRestoringRef.current = false
  }, [])

  useEffect(() => {
    if (!hasLoadedDraft || typeof window === "undefined") return

    const draft: CreateDraft = {
      currentStep: step,
      title,
      description,
      instructions,
      duration,
      timezone,
      votingDeadlineDays,
      selectedSlots: selectedSlots.map((slot) => slot.toISOString()),
      draftTimestamp: new Date().toISOString(),
    }

    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }, [hasLoadedDraft, step, title, description, instructions, duration, timezone, votingDeadlineDays, selectedSlots])

  useEffect(() => {
    if (!hasLoadedDraft || typeof window === "undefined") return

    if (!hasBootstrappedHistory.current) {
      window.history.replaceState({ createStep: step }, "")
      hasBootstrappedHistory.current = true
    } else if (!isRestoringRef.current) {
      window.history.pushState({ createStep: step }, "")
    }
  }, [hasLoadedDraft, step])

  useEffect(() => {
    if (typeof window === "undefined") return

    const onPopState = (event: PopStateEvent) => {
      const nextStep = event.state?.createStep
      if (typeof nextStep === "number" && nextStep >= 1 && nextStep <= 3) {
        isRestoringRef.current = true
        setStep(nextStep)
        setError(null)
      }
    }

    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  const slotsByDay = useMemo(() => {
    return selectedSlots
      .slice()
      .sort((a, b) => a.getTime() - b.getTime())
      .reduce<Record<string, string[]>>((acc, slot) => {
        const dayKey = new Intl.DateTimeFormat("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          timeZone: timezone,
        }).format(slot)
        const timeLabel = new Intl.DateTimeFormat("en-US", {
          hour: "numeric",
          minute: "2-digit",
          timeZone: timezone,
        }).format(slot)

        if (!acc[dayKey]) {
          acc[dayKey] = []
        }

        acc[dayKey].push(timeLabel)
        return acc
      }, {})
  }, [selectedSlots, timezone])

  const handleSubmit = async () => {
    if (selectedSlots.length === 0) {
      setError("Please select at least one time slot")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await createEvent({
        title,
        description: description || null,
        instructions: instructions || null,
        duration: parseInt(duration),
        timezone,
        votingDeadlineDays: parseInt(votingDeadlineDays),
        timeSlots: selectedSlots.map((d) => d.toISOString()),
      })

      if (result.error) {
        setError(result.error)
        setIsSubmitting(false)
        return
      }

      window.sessionStorage.removeItem(DRAFT_KEY)
      router.push(`/event/${result.eventId}/share?admin=${result.adminId}`)
    } catch {
      setError("Something went wrong. Please try again.")
      setIsSubmitting(false)
    }
  }

  const progressCount = 3

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

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center mb-8 gap-2">
          {Array.from({ length: progressCount }).map((_, idx) => {
            const stepNumber = idx + 1
            return (
              <div key={stepNumber} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= stepNumber ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {stepNumber}
                </div>
                {stepNumber < progressCount && (
                  <div className={`h-0.5 w-12 ${step > stepNumber ? "bg-primary" : "bg-muted"}`} />
                )}
              </div>
            )
          })}
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
              <CardDescription>Tell us about your meeting or event</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title *</Label>
                <Input id="title" placeholder="e.g., Team Weekly Sync" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="What is this meeting about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">Instructions for Participants (optional)</Label>
                <Textarea
                  id="instructions"
                  placeholder="Any special instructions for participants..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Meeting Duration</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger id="duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deadline">Voting Deadline</Label>
                  <Select value={votingDeadlineDays} onValueChange={setVotingDeadlineDays}>
                    <SelectTrigger id="deadline">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 day</SelectItem>
                      <SelectItem value="2">2 days</SelectItem>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="5">5 days</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Your Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger id="timezone">
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

              <div className="flex justify-end pt-4">
                <Button onClick={() => setStep(2)} disabled={!title.trim()}>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Available Times</CardTitle>
              <CardDescription>Click and drag to select the time slots you want to propose</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-2 p-3 bg-muted rounded-lg text-sm">
                <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <p className="text-muted-foreground">
                  Times are shown in your timezone ({timezone}). Participants will see times converted to their local timezone.
                </p>
              </div>

              <TimeSlotSelector
                timezone={timezone}
                duration={parseInt(duration)}
                selectedSlots={selectedSlots}
                onSlotsChange={setSelectedSlots}
              />

              {error && <p className="text-destructive text-sm">{error}</p>}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={() => setStep(3)} disabled={selectedSlots.length === 0}>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Review & Confirm</CardTitle>
              <CardDescription>Review your event details before creating an immutable event.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Meeting name</p>
                  <p className="font-medium">{title}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Meeting notes</p>
                  <p className="font-medium">{description || "None"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Participant instructions</p>
                  <p className="font-medium">{instructions || "None"}</p>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Meeting duration</p>
                    <p className="font-medium">{duration} minutes</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Voting expiration</p>
                    <p className="font-medium">{votingDeadlineDays} day{votingDeadlineDays === "1" ? "" : "s"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Timezone</p>
                    <p className="font-medium">{timezone}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Selected slots</p>
                  <div className="space-y-3">
                    {Object.entries(slotsByDay).map(([day, times]) => (
                      <div key={day}>
                        <p className="font-medium">{day}</p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground">
                          {times.map((time, index) => (
                            <li key={`${day}-${time}-${index}`}>{time}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {error && <p className="text-destructive text-sm">{error}</p>}

              <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-900 p-3 text-sm flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>Once created, this event cannot be modified.</p>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting || selectedSlots.length === 0}>
                  {isSubmitting ? "Creating..." : "Confirm & Create"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
