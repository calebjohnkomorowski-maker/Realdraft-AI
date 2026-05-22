import { useState } from 'react'
import { Save, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

export default function Settings() {
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    agentName: '',
    licenseNumber: '',
    brokerage: '',
    agentEmail: '',
    agentPhone: '',
    signingOrder: 'buyer_first',
    esignProvider: 'hellosign',
  })

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = () => {
    localStorage.setItem('realdraft_settings', JSON.stringify(form))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">Configure your agent profile and integrations</p>
      </div>

      {/* Agent Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agent Profile</CardTitle>
          <CardDescription>Used in generated documents and call scripts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Full Name</Label>
              <Input className="mt-1" value={form.agentName} onChange={e => update('agentName', e.target.value)} placeholder="Jane Smith" />
            </div>
            <div>
              <Label>PA License #</Label>
              <Input className="mt-1" value={form.licenseNumber} onChange={e => update('licenseNumber', e.target.value)} placeholder="RS123456" />
            </div>
          </div>
          <div>
            <Label>Brokerage</Label>
            <Input className="mt-1" value={form.brokerage} onChange={e => update('brokerage', e.target.value)} placeholder="Keller Williams Realty" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Email</Label>
              <Input className="mt-1" type="email" value={form.agentEmail} onChange={e => update('agentEmail', e.target.value)} placeholder="jane@kw.com" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input className="mt-1" type="tel" value={form.agentPhone} onChange={e => update('agentPhone', e.target.value)} placeholder="+1 215-555-0100" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* E-Signature */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">E-Signature Provider</CardTitle>
          <CardDescription>Configured via backend .env — shown here for reference</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Provider</Label>
              <select
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={form.esignProvider}
                onChange={e => update('esignProvider', e.target.value)}
              >
                <option value="hellosign">HelloSign (Dropbox Sign)</option>
                <option value="docusign">DocuSign</option>
              </select>
            </div>
            <div>
              <Label>Signing Order</Label>
              <select
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={form.signingOrder}
                onChange={e => update('signingOrder', e.target.value)}
              >
                <option value="buyer_first">Buyer signs first</option>
                <option value="seller_first">Seller signs first</option>
                <option value="simultaneous">Simultaneous</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} className="w-full">
        {saved ? (
          <><CheckCircle2 className="w-4 h-4 mr-2" /> Saved!</>
        ) : (
          <><Save className="w-4 h-4 mr-2" /> Save Settings</>
        )}
      </Button>
    </div>
  )
}
