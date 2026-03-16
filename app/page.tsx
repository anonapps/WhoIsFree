import Link from "next/link"
import { Calendar, Users, Clock, ArrowRight, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">WhoIsFree</span>
          </Link>
          <Button asChild>
            <Link href="/create">
              Create Event
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-16 md:py-24">
          <div className="max-w-5xl mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-balance mb-6">
              Find the perfect meeting time
              <span className="text-primary block mt-2">for everyone</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 text-pretty">
              Stop the endless back-and-forth. Create an event, share a link, and let participants 
              mark their availability. See results instantly with a visual heatmap.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/create">
                  <Calendar className="mr-2 h-5 w-5" />
                  Create Your Event
                </Link>
              </Button>
              <p className="text-sm text-muted-foreground">
                No sign-up required. Free forever.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 bg-card border-y border-border">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              How It Works
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-primary font-bold">1</span>
                </div>
                <h3 className="font-semibold mb-2">Create Your Event</h3>
                <p className="text-muted-foreground text-sm">
                  Set your event details and select the time slots you want to propose.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-primary font-bold">2</span>
                </div>
                <h3 className="font-semibold mb-2">Share the Link</h3>
                <p className="text-muted-foreground text-sm">
                  Send the participant link to everyone who needs to respond.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-primary font-bold">3</span>
                </div>
                <h3 className="font-semibold mb-2">Find the Best Time</h3>
                <p className="text-muted-foreground text-sm">
                  View results in a heatmap to see when everyone is available.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              Why WhoIsFree?
            </h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="flex gap-4 p-4 rounded-lg border border-border bg-card">
                <CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">No Account Required</h3>
                  <p className="text-sm text-muted-foreground">
                    Just create an event and share the link. No sign-ups, no passwords.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 p-4 rounded-lg border border-border bg-card">
                <Clock className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">Timezone Smart</h3>
                  <p className="text-sm text-muted-foreground">
                    Times are automatically converted to each participant{"'"}s local timezone.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 p-4 rounded-lg border border-border bg-card">
                <Users className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">Preference Voting</h3>
                  <p className="text-sm text-muted-foreground">
                    Participants can mark times as available or preferred for better results.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 p-4 rounded-lg border border-border bg-card">
                <Calendar className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">Visual Heatmap</h3>
                  <p className="text-sm text-muted-foreground">
                    Instantly see the best times with a color-coded availability heatmap.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-primary text-primary-foreground">
          <div className="max-w-5xl mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Ready to schedule your meeting?
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              Create your event in under a minute. No sign-up needed.
            </p>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/create">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8">
        <div className="max-w-5xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>WhoIsFree - Free group scheduling tool. No account required.</p>
        </div>
      </footer>
    </div>
  )
}
