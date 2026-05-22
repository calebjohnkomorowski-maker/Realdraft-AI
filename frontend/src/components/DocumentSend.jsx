import { useState } from 'react'
import { Loader2, Send, Plus, Trash2, Mail, Phone, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { documents } from '@/lib/api'

const DEFAULT_SIGNER = { name: '', email: '', phone: '', role: 'buyer', order: 1 }

export default function DocumentSend({ offerData, offerId, agentName }) {
  const [signers, setSigners] = useState([
    { ...DEFAULT_SIGNER, name: offerData?.buyer_name || '', role: 'buyer', order: 1 },
    { ...DEFAULT_SIGNER, name: offerData?.seller_name || '', role: 'seller', order: 2 },
  ])
  const [ccEmail, setCcEmail] = useState(offerData?.agent_email || '')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const updateSigner = (i, field, value) => {
    setSigners(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }

  const addSigner = () => {
    setSigners(prev => [...prev, { ...DEFAULT_SIGNER, order: prev.length + 1 }])
  }

  const removeSigner = (i) => {
    setSigners(prev => prev.filter((_, idx) => idx !== i))
  }

  const send = async () => {
    const missing = signers.filter(s => !s.name || !s.email)
    if (missing.length) { setError('All signers need a name and email.'); return }
    setError('')
    setSending(true)
    try {
      await documents.send(offerId, signers, ccEmail ? [ccEmail] : [], agentName)
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-1">Package Sent!</h3>
          <p className="text-muted-foreground text-sm">
            Email and SMS notifications sent to all signers.
            You'll be notified when they view and sign.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Send className="w-4 h-4 text-primary" />
          Send Signing Package
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {signers.map((signer, i) => (
          <div key={i} className="p-4 border rounded-lg space-y-3 relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Signer {i + 1} — {signer.role}
              </span>
              {signers.length > 1 && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeSigner(i)}>
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Full Name</Label>
                <Input className="mt-1" value={signer.name} onChange={e => updateSigner(i, 'name', e.target.value)} placeholder="Full legal name" />
              </div>
              <div>
                <Label className="text-xs">Role</Label>
                <select
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={signer.role}
                  onChange={e => updateSigner(i, 'role', e.target.value)}
                >
                  <option value="buyer">Buyer</option>
                  <option value="seller">Seller</option>
                  <option value="agent">Agent</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs flex items-center gap-1"><Mail className="w-3 h-3" /> Email</Label>
                <Input className="mt-1" type="email" value={signer.email} onChange={e => updateSigner(i, 'email', e.target.value)} placeholder="email@example.com" />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> Phone (for SMS)</Label>
                <Input className="mt-1" type="tel" value={signer.phone} onChange={e => updateSigner(i, 'phone', e.target.value)} placeholder="+1 215-555-0100" />
              </div>
            </div>
          </div>
        ))}

        <Button variant="outline" size="sm" onClick={addSigner} className="w-full">
          <Plus className="w-3 h-3 mr-2" /> Add Signer
        </Button>

        <div>
          <Label className="text-xs">CC (Agent Email)</Label>
          <Input className="mt-1" type="email" value={ccEmail} onChange={e => setCcEmail(e.target.value)} placeholder="agent@brokerage.com" />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button onClick={send} disabled={sending} className="w-full" size="lg">
          {sending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</>
          ) : (
            <><Send className="w-4 h-4 mr-2" /> Send via Email + SMS</>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Signing request sent via {process.env.ESIGN_PROVIDER || 'HelloSign'} · SMS via Twilio
        </p>
      </CardContent>
    </Card>
  )
}
