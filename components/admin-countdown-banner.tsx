"use client"

import { useEffect, useMemo, useState } from "react"

interface AdminCountdownBannerProps {
  votingDeadline: string
  deletionTime: string
}

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

function formatRemaining(targetTime: number, now: number) {
  const remainingMs = targetTime - now

  if (remainingMs <= 0) {
    return "Less than 1 hour"
  }

  if (remainingMs < HOUR_MS) {
    return "Less than 1 hour"
  }

  const days = Math.floor(remainingMs / DAY_MS)
  const hours = Math.floor((remainingMs % DAY_MS) / HOUR_MS)

  const dayLabel = `${days} day${days === 1 ? "" : "s"}`
  const hourLabel = `${hours} hour${hours === 1 ? "" : "s"}`

  return `${dayLabel}, ${hourLabel}`
}

export function AdminCountdownBanner({ votingDeadline, deletionTime }: AdminCountdownBannerProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), MINUTE_MS)
    return () => window.clearInterval(interval)
  }, [])

  const votingDeadlineMs = useMemo(() => new Date(votingDeadline).getTime(), [votingDeadline])
  const deletionTimeMs = useMemo(() => new Date(deletionTime).getTime(), [deletionTime])

  const votingLine =
    now >= votingDeadlineMs
      ? "Voting is closed"
      : `Time remaining for voting is ${formatRemaining(votingDeadlineMs, now)}`
  const deletionLine = `Event will be deleted in ${formatRemaining(deletionTimeMs, now)}`

  return (
    <section className="rounded-lg border border-primary/20 bg-primary/10 p-4 mb-6">
      <p className="text-sm font-medium">{votingLine}</p>
      <p className="text-sm text-muted-foreground mt-1">{deletionLine}</p>
    </section>
  )
}
