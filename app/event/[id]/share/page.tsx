"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { Calendar, Copy, Check, AlertTriangle, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface SharePageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ admin?: string }>
}

export default function SharePage({ params, searchParams }: SharePageProps) {
  const { id } = use(params)
  const { admin } = use(searchParams)
  
  const [participantLinkCopied, setParticipantLinkCopied] = useState(false)
  const [adminLinkCopied, setAdminLinkCopied] = useState(false)
  const [baseUrl, setBaseUrl] = useState("")

  useEffect(() => {
    setBaseUrl(window.location.origin)
  }, [])

  const participantLink = `${baseUrl}/event/${id}`
  const adminLink = `${baseUrl}/event/${id}/admin?key=${admin}`

  const copyToClipboard = async (text: string, type: 'participant' | 'admin') => {
    await navigator.clipboard.writeText(text)
    if (type === 'participant') {
      setParticipantLinkCopied(true)
      setTimeout(() => setParticipantLinkCopied(false), 2000)
    } else {
      setAdminLinkCopied(true)
      setTimeout(() => setAdminLinkCopied(false), 2000)
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
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-accent" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Event Created!</h1>
          <p className="text-muted-foreground">
            Share the link below with your participants
          </p>
        </div>

        <div className="space-y-6">
          {/* Participant Link */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Participant Link</CardTitle>
              <CardDescription>
                Share this link with everyone who needs to vote on available times
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={participantLink}
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(participantLink, 'participant')}
                >
                  {participantLinkCopied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button asChild className="w-full">
                <a href={participantLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Participant View
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Admin Link */}
          <Card className="border-primary/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Admin Link</CardTitle>
              </div>
              <CardDescription>
                Save this link! It{"'"}s the only way to view results and manage your event. 
                This link cannot be recovered.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Bookmark this link or save it somewhere safe
                </Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={adminLink}
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(adminLink, 'admin')}
                  >
                    {adminLinkCopied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <Button asChild variant="secondary" className="w-full">
                <Link href={`/event/${id}/admin?key=${admin}`}>
                  Go to Admin Dashboard
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-base">Quick Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Participants can vote without creating an account</li>
                <li>• Times are automatically converted to each participant{"'"}s timezone</li>
                <li>• Check the admin dashboard to see who has responded</li>
                <li>• Events expire after 14 days</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
