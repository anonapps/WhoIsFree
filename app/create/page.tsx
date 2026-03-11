"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Calendar, ArrowLeft, ArrowRight, Info } from "lucide-react"
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

export default function CreateEventPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [instructions, setInstructions] = useState("")
  const [duration, setDuration] = useState("60")
  const [timezone, setTimezone] = useState(() => getUserTimezone())
  const [votingDeadlineDays, setVotingDeadlineDays] = useState("3")
  const [selectedSlots, setSelectedSlots] = useState<Date[]>([])

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
        timeSlots: selectedSlots.map(d => d.toISOString()),
      })

      if (result.error) {
        setError(result.error)
        setIsSubmitting(false)
        return
      }

      router.push(`/event/${result.eventId}/share?admin=${result.adminId}`)
    } catch {
      setError("Something went wrong. Please try again.")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">MeetSync</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Progress indicator */}
        <div className="flex items-center justify-center mb-8 gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}>
            1
          </div>
          <div className={`h-0.5 w-12 ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}>
            2
          </div>
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
              <CardDescription>
                Tell us about your meeting or event
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Team Weekly Sync"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
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
                <Button
                  onClick={() => setStep(2)}
                  disabled={!title.trim()}
                >
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
              <CardDescription>
                Click and drag to select the time slots you want to propose
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-2 p-3 bg-muted rounded-lg text-sm">
                <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <p className="text-muted-foreground">
                  Times are shown in your timezone ({timezone}). Participants will see times 
                  converted to their local timezone.
                </p>
              </div>

              <TimeSlotSelector
                timezone={timezone}
                duration={parseInt(duration)}
                selectedSlots={selectedSlots}
                onSlotsChange={setSelectedSlots}
              />

              {error && (
                <p className="text-destructive text-sm">{error}</p>
              )}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || selectedSlots.length === 0}
                >
                  {isSubmitting ? "Creating..." : "Create Event"}
                  {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
