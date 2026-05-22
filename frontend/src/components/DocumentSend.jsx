import { useState } from 'react'
import { Loader2, Send, Plus, Trash2, Mail, Phone, CheckCircle2, AlertCircle, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { documents } from '@/lib/api'
import { loadSettings } from '@/lib/useSettings'
import { useNavigate } from 'react-router-dom'

const DEFAULT_SIGNER = { name: '', email: '', phone: '', role: 'buyer' }

export default function DocumentSend({ offerData, offerId, agentName }) {
  const navigate = useNavigate()
  const settings = loadSettings()

  const [signers, setSigners] = useState([
    { ...DEFAULT_SIGNER, name: offerData?.buyer_name  || '', email: offerData?.buyer_email  || '', role: 'buyer' },
    { ...DEFAULT_SIGNER, name: offerData?.seller_name || '', email: offerData?.seller_email || '', role: 'seller' },
  ])
  const [ccEmail,  setCcEmail]  = useState(offerData?.agent_email || settings.agentEmail || '')
  const [sending,  setSending]  = useState(false)
  const [sent,     setSent]     = useState(null)   // { sentTo: [] }
  const [error,    setError]    = useState('')

  const hasEmailConfig = !!(settings.smtpUser && settings.smtpPass)

  const updateSigner = (i, field, value) =>
    setSigners(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s))

  const addSigner    = () => setSigners(prev => [...prev, { ...DEFAULT_SIGNER }])
  const removeSigner = (i) => setSigners(prev => prev.filter((_, idx) => idx !== i))

  const send = async () => {
    const missing = signers.filter(s => !s.name || !s.email)
    if (missing.length) { setError('Every recipient needs a name and email.'); return }
    if (!hasEmailConfig) { setError('Set your Gmail address and App Password in Settings first.'); return }

    setError('')
    setSending(true)
    try {
      const res = await documents.send(
        offerId,
        offerData,
        signers,
        ccEmail ? [ccEmail] : [],
        agentName || settings.agentName,
        settings.agentEmail,
        settings.smtpUser,
        settings.smtpPass,
        'email',
      )
      setSent(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
          <h3 className="font-semibold text-lg">Package Sent!</h3>
          <p className="text-muted-foreground text-sm">
            PDF emailed to: <strong>{(sent.sentTo || []).join(', ')}</strong>
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
          Send Offer Package
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Email config warning */}
        {!hasEmailConfig && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="text-xs">
              <p className="font-medium mb-1">Email not configured</p>
              <p>Add your Gmail address and App Password in Settings to enable sending.</p>
              <button onClick={() => navigate('/settings')} className="underline font-medium mt-1 flex items-center gap-1">
                <Settings className="w-3 h-3" /> Go to Settings
              </button>
            </div>
          </div>
        )}

        {/* Recipients */}
        {signers.map((signer, i) => (
          <div key={i} className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Recipient {i + 1}
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
                <Input className="mt-1" value={signer.name}
                  onChange={e => updateSigner(i, 'name', e.target.value)} placeholder="Full name" />
              </div>
              <div>
                <Label className="text-xs">Role</Label>
                <select className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={signer.role} onChange={e => updateSigner(i, 'role', e.target.value)}>
                  <option value="buyer">Buyer</option>
                  <option value="seller">Seller</option>
                  <option value="agent">Agent</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs flex items-center gap-1"><Mail className="w-3 h-3" /> Email</Label>
                <Input className="mt-1" type="email" value={signer.email}
                  onChange={e => updateSigner(i, 'email', e.target.value)} placeholder="email@example.com" />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</Label>
                <Input className="mt-1" type="tel" value={signer.phone}
                  onChange={e => updateSigner(i, 'phone', e.target.value)} placeholder="+1 412-555-0100" />
              </div>
            </div>
          </div>
        ))}

        <Button variant="outline" size="sm" onClick={addSigner} className="w-full">
          <Plus className="w-3 h-3 mr-2" /> Add Recipient
        </Button>

        <div>
          <Label className="text-xs">CC (your email)</Label>
          <Input className="mt-1" type="email" value={ccEmail}
            onChange={e => setCcEmail(e.target.value)} placeholder="you@brokerage.com" />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <Button onClick={send} disabled={sending || !hasEmailConfig} className="w-full" size="lg">
          {sending
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</>
            : <><Send className="w-4 h-4 mr-2" /> Email PDF to Recipients</>
          }
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          PDF sent as email attachment from {settings.smtpUser || 'your Gmail (configure in Settings)'}
        </p>
      </CardContent>
    </Card>
  )
}
