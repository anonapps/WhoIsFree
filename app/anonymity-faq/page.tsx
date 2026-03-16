import Link from "next/link"
import { Calendar } from "lucide-react"

const creatorData = [
  { data: "Event title", stored: "Yes", purpose: "Display to participants" },
  { data: "Event description", stored: "Yes (optional)", purpose: "Context for participants" },
  { data: "Instructions", stored: "Yes (optional)", purpose: "Guidance for voting" },
  { data: "Duration preference", stored: "Yes", purpose: "Calculate time ranges" },
  { data: "Selected time slots", stored: "Yes (as UTC timestamps)", purpose: "Voting options" },
  { data: "Timezone", stored: "Yes", purpose: "Display conversion" },
]

const participantData = [
  { data: "Name", stored: "Yes", purpose: "Identify responses to admin" },
  { data: "Time slot votes", stored: "Yes", purpose: "Aggregate availability" },
  { data: "Submission timestamp", stored: "Yes", purpose: "Record keeping" },
]

export default function AnonymityFaqPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">WhoIsFree</span>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <section>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">ANONYMITY FAQ</h1>
          <p className="text-muted-foreground">How WhoIsFree handles data, tracking, and privacy.</p>
        </section>

        <section className="rounded-lg border border-border bg-card p-6 space-y-3">
          <h2 className="text-2xl font-semibold">Cookies</h2>
          <p>
            <strong>This app does NOT use cookies for tracking users.</strong> The only cookie-related code is in the
            Supabase server client setup, but since the app doesn&apos;t use Supabase Auth (no login/signup), no session
            cookies are actually set. The cookie handling code is boilerplate from the Supabase SSR pattern but remains
            unused.
          </p>
        </section>

        <section className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-2xl font-semibold">Data Collected</h2>

          <div className="space-y-3">
            <h3 className="text-xl font-semibold">From Event Creators (Admin):</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-2 pr-3">Data</th>
                    <th className="py-2 pr-3">Stored</th>
                    <th className="py-2">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {creatorData.map((row) => (
                    <tr key={row.data} className="border-b border-border/50">
                      <td className="py-2 pr-3">{row.data}</td>
                      <td className="py-2 pr-3">{row.stored}</td>
                      <td className="py-2">{row.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              <strong>No personal information</strong> is collected from creators - no email, no name, no IP address,
              no account.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-xl font-semibold">From Participants:</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-2 pr-3">Data</th>
                    <th className="py-2 pr-3">Stored</th>
                    <th className="py-2">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {participantData.map((row) => (
                    <tr key={row.data} className="border-b border-border/50">
                      <td className="py-2 pr-3">{row.data}</td>
                      <td className="py-2 pr-3">{row.stored}</td>
                      <td className="py-2">{row.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              <strong>No email, no account, no IP address</strong> is stored for participants.
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-2xl font-semibold">Privacy Level: Highly Anonymous</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li><strong>No accounts required</strong> - Pure link-based access</li>
            <li><strong>No cookies for tracking</strong> - No persistent user identification</li>
            <li>
              <strong>No IP logging</strong> - The app code doesn&apos;t capture IPs (though hosting infra may have access
              logs)
            </li>
            <li><strong>Minimal data</strong> - Only what&apos;s needed to coordinate the meeting</li>
            <li>
              <strong>14-day auto-expiration</strong> - Events are designed to expire (though the purge job isn&apos;t
              implemented yet)
            </li>
            <li>
              <strong>Link-based security</strong> - Knowing the event ID = access to vote; knowing admin ID = access to
              results
            </li>
          </ol>
          <p>
            The only identifier linking a participant to their votes is the name they choose to enter, which can be
            anything (even a pseudonym).
          </p>
        </section>
      </main>
    </div>
  )
}
