import { Calendar } from "lucide-react"
import Link from "next/link"
import { getGlobalStats } from "@/lib/events/stats"

const numberFormatter = new Intl.NumberFormat("en-US")

export default async function StatsPage() {
  const stats = await getGlobalStats()

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

      <main className="max-w-3xl mx-auto px-4 py-20">
        <div className="text-center">
          <p className="text-muted-foreground mb-8">Since launch</p>
          <p className="text-4xl sm:text-5xl font-bold mb-4">
            {numberFormatter.format(stats.totalEvents)} events created
          </p>
          <p className="text-4xl sm:text-5xl font-bold mb-10">
            {numberFormatter.format(stats.totalParticipants)} participants
          </p>
          <p className="text-muted-foreground">
            No accounts. No tracking. Fully anonymous.
          </p>
        </div>
      </main>
    </div>
  )
}
