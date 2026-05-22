import { Save, CheckCircle2, User, Building2, Mail, Shield, Wifi, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSettings } from '@/lib/useSettings'
import { documents } from '@/lib/api'
import { useState } from 'react'

function Field({ label, type = 'text', value, onChange, placeholder }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1 block">{label}</Label>
      <Input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

export default function Settings() {
  const [settings, setSettings] = useSettings()
  const [saved, setSaved]           = useState(false)
  const [emailTest, setEmailTest]   = useState(null)  // null | 'testing' | 'ok' | 'fail'
  const [emailErr,  setEmailErr]    = useState('')

  const testEmail = async () => {
    setEmailTest('testing')
    setEmailErr('')
    try {
      const r = await documents.testEmail(settings.smtpUser, settings.smtpPass)
      setEmailTest(r.ok ? 'ok' : 'fail')
      if (!r.ok) setEmailErr(r.error)
    } catch (e) {
      setEmailTest('fail')
      setEmailErr(e.message)
    }
  }

  const set = (key) => (val) => setSettings({ [key]: val })

  const save = () => {
    // settings already persisted by useSettings hook on every change
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Your info auto-fills every PA ASR form. Set it once, never type it again.
        </p>
      </div>

      {/* ── Agent Profile ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" /> Agent Profile
          </CardTitle>
          <CardDescription>Appears on Page 1 of every offer form</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Full Name" value={settings.agentName} onChange={set('agentName')} placeholder="Jane Smith" />
            <Field label="PA License #" value={settings.licenseNumber} onChange={set('licenseNumber')} placeholder="RS-123456" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Direct Phone" value={settings.agentPhone} onChange={set('agentPhone')} placeholder="(412) 555-0100" />
            <Field label="Cell Phone" value={settings.agentCell} onChange={set('agentCell')} placeholder="(412) 555-0101" />
          </div>
          <Field label="Email" type="email" value={settings.agentEmail} onChange={set('agentEmail')} placeholder="jane@brokerage.com" />
        </CardContent>
      </Card>

      {/* ── Brokerage / Company ───────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Brokerage
          </CardTitle>
          <CardDescription>Company info fills the Broker section of the form</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company Name" value={settings.brokerage} onChange={set('brokerage')} placeholder="Keller Williams Realty" />
            <Field label="Company License #" value={settings.brokerLicense} onChange={set('brokerLicense')} placeholder="RB-067890" />
          </div>
          <Field label="Company Address" value={settings.brokerAddress} onChange={set('brokerAddress')} placeholder="100 Main St, Pittsburgh, PA 15222" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company Phone" value={settings.brokerPhone} onChange={set('brokerPhone')} placeholder="(412) 555-0200" />
            <Field label="Company Fax" value={settings.brokerFax} onChange={set('brokerFax')} placeholder="(412) 555-0201" />
          </div>
        </CardContent>
      </Card>

      {/* ── Email (Send Package) ──────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="w-4 h-4" /> Email — Send Package
          </CardTitle>
          <CardDescription>
            Gmail address + App Password to send offer PDFs to clients.{' '}
            <a
              href="https://support.google.com/accounts/answer/185833"
              target="_blank"
              rel="noreferrer"
              className="underline text-primary"
            >
              How to get an App Password ↗
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="Gmail Address" type="email" value={settings.smtpUser} onChange={set('smtpUser')} placeholder="you@gmail.com" />
          <Field label="Gmail App Password" type="password" value={settings.smtpPass} onChange={set('smtpPass')} placeholder="xxxx xxxx xxxx xxxx" />
          <p className="text-xs text-muted-foreground">
            App Passwords are 16-character codes — not your regular Gmail password.
            Go to Google Account → Security → 2-Step Verification → App Passwords.
          </p>
          <Button variant="outline" size="sm" onClick={testEmail}
            disabled={!settings.smtpUser || !settings.smtpPass || emailTest === 'testing'}>
            {emailTest === 'testing' ? 'Testing…'
              : emailTest === 'ok'   ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-green-600" />Connected!</>
              : emailTest === 'fail' ? <><XCircle className="w-3.5 h-3.5 mr-1.5 text-destructive" />Failed — try again</>
              : <><Wifi className="w-3.5 h-3.5 mr-1.5" />Test Connection</>
            }
          </Button>
          {emailErr && <p className="text-xs text-destructive">{emailErr}</p>}
        </CardContent>
      </Card>

      {/* ── E-Signature ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" /> E-Signature
          </CardTitle>
          <CardDescription>API keys are set in the backend .env file</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Provider</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={settings.esignProvider}
                onChange={e => setSettings({ esignProvider: e.target.value })}
              >
                <option value="hellosign">HelloSign (Dropbox Sign)</option>
                <option value="docusign">DocuSign</option>
              </select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Signing Order</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={settings.signingOrder}
                onChange={e => setSettings({ signingOrder: e.target.value })}
              >
                <option value="buyer_first">Buyer signs first</option>
                <option value="seller_first">Seller signs first</option>
                <option value="simultaneous">Simultaneous</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} className="w-full" size="lg">
        {saved
          ? <><CheckCircle2 className="w-4 h-4 mr-2" /> Saved!</>
          : <><Save className="w-4 h-4 mr-2" /> Save Settings</>
        }
      </Button>
    </div>
  )
}
