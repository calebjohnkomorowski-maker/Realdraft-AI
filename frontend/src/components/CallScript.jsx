import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Loader2, Phone, Copy, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { scripts } from '@/lib/api'

export default function CallScript({ offerData, offerId }) {
  const [agentName, setAgentName] = useState(offerData?.agent_name || '')
  const [script, setScript] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const generate = async () => {
    if (!agentName.trim()) return
    setLoading(true)
    try {
      const res = await scripts.generate(offerId, offerData, agentName)
      setScript(res.script)
    } catch (err) {
      setScript(`⚠️ Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(script)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Phone className="w-4 h-4 text-primary" />
          Call Script Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <Label htmlFor="agent-name" className="text-xs">Your Name</Label>
            <Input
              id="agent-name"
              value={agentName}
              onChange={e => setAgentName(e.target.value)}
              placeholder="Agent name for the script"
              className="mt-1"
            />
          </div>
          <Button onClick={generate} disabled={loading || !agentName.trim()} className="flex-shrink-0">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Phone className="w-4 h-4 mr-2" />}
            Generate Script
          </Button>
        </div>

        {script && (
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 z-10 h-7 text-xs"
              onClick={copy}
            >
              {copied ? <CheckCheck className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <div className="bg-muted rounded-lg p-4 pr-20 text-sm max-h-[500px] overflow-y-auto">
              <ReactMarkdown
                className="prose prose-sm max-w-none [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-primary [&_h2]:mt-4 [&_h2]:mb-2 [&_p]:mb-2 [&_ul]:pl-4 [&_li]:mb-1"
              >
                {script}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {!script && !loading && (
          <p className="text-sm text-muted-foreground text-center py-6">
            Generate a personalized call script with talking points, anticipated Q&A, and an SMS follow-up template.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
