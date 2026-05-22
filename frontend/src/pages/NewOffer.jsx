import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Eye, Phone, Send, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import OfferForm from '@/components/OfferForm'
import OfferSummary from '@/components/OfferSummary'
import CallScript from '@/components/CallScript'
import DocumentSend from '@/components/DocumentSend'
import { documents as docsApi, offers as offersApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import { loadSettings, agentFieldsFromSettings } from '@/lib/useSettings'

const AGENT_ID = 'demo-agent' // replace with auth session

const STEPS = [
  { id: 'intake', label: 'Fill Form',     icon: FileText },
  { id: 'review', label: 'Review PDF',    icon: Eye },
  { id: 'script', label: 'Call Script',   icon: Phone },
  { id: 'send',   label: 'Send Package',  icon: Send },
]

export default function NewOffer() {
  const navigate = useNavigate()
  const [step, setStep]                   = useState('intake')
  const [offerData, setOfferData]         = useState(null)
  const [offerId, setOfferId]             = useState(null)
  const [pdfUrl, setPdfUrl]               = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const stepIndex = STEPS.findIndex(s => s.id === step)
  const isStepComplete = (id) => STEPS.findIndex(s => s.id === id) < stepIndex

  // Called when the quick-fill form is submitted
  const handleFormSubmit = async (data) => {
    const settings = loadSettings()
    const merged   = { ...data, ...agentFieldsFromSettings(settings) }
    setOfferData(merged)
    setPreviewLoading(true)

    try {
      // Save to DB — non-fatal if Supabase isn't configured
      try {
        const saved = await offersApi.create(merged, AGENT_ID)
        setOfferId(saved.id)
      } catch (dbErr) {
        console.warn('DB save skipped (Supabase not configured):', dbErr.message)
      }

      // Generate the PDF preview and advance to review step
      const url = await docsApi.preview(merged)
      setPdfUrl(url)
      setStep('review')
    } catch (err) {
      console.error(err)
      alert('Error generating PDF: ' + err.message)
    } finally {
      setPreviewLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen">

      {/* ── Step header ─────────────────────────────────────────────────── */}
      <div className="border-b bg-background px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => {
            const Icon   = s.icon
            const active = s.id === step
            const done   = isStepComplete(s.id)
            return (
              <div key={s.id} className="flex items-center">
                <button
                  disabled={!done && !active}
                  onClick={() => done && setStep(s.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                    active           && 'bg-primary text-primary-foreground',
                    done  && !active && 'text-muted-foreground hover:text-foreground cursor-pointer',
                    !done && !active && 'text-muted-foreground/40 cursor-not-allowed',
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {s.label}
                </button>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-muted-foreground/40 mx-0.5" />
                )}
              </div>
            )
          })}
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>← Back to Dashboard</Button>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">

        {/* STEP 1 — Quick-fill form */}
        {step === 'intake' && (
          <div className="h-full overflow-y-auto">
            {previewLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center space-y-3">
                  <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground font-medium">Generating PDF…</p>
                  <p className="text-xs text-muted-foreground">Filling in all form fields, please wait</p>
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto px-4 py-6">
                <div className="mb-6">
                  <h1 className="text-2xl font-bold">New Offer</h1>
                  <p className="text-muted-foreground text-sm mt-1">
                    Fill in the details below — click <strong>Generate Offer PDF</strong> when ready.
                    Your agent info from Settings will be added automatically.
                  </p>
                </div>
                <OfferForm onSubmit={handleFormSubmit} />
              </div>
            )}
          </div>
        )}

        {/* STEP 2 — Review PDF */}
        {step === 'review' && (
          <div className="flex h-full">
            <div className="flex-1 bg-muted/50 flex flex-col">
              <div className="p-3 border-b bg-background flex items-center justify-between">
                <span className="text-sm font-medium">PA ASR Form Preview</span>
                {pdfUrl && (
                  <a href={pdfUrl} download="offer-preview.pdf">
                    <Button variant="outline" size="sm">Download PDF</Button>
                  </a>
                )}
              </div>
              {pdfUrl ? (
                <iframe src={pdfUrl} className="flex-1 w-full" title="PDF Preview" />
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="w-80 border-l flex flex-col">
              <div className="flex-1 overflow-y-auto p-3">
                <OfferSummary offerData={offerData} />
              </div>
              <div className="p-4 border-t space-y-2">
                <Button className="w-full" onClick={() => setStep('script')}>
                  <Phone className="w-4 h-4 mr-2" /> Generate Call Script
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setStep('send')}>
                  <Send className="w-4 h-4 mr-2" /> Skip to Send Package
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 — Call Script */}
        {step === 'script' && (
          <div className="flex h-full">
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-2xl mx-auto space-y-4">
                <CallScript offerData={offerData} offerId={offerId} />
                <Button className="w-full" size="lg" onClick={() => setStep('send')}>
                  <Send className="w-4 h-4 mr-2" /> Continue to Send Package
                </Button>
              </div>
            </div>
            <div className="w-80 border-l overflow-y-auto p-3">
              <OfferSummary offerData={offerData} />
            </div>
          </div>
        )}

        {/* STEP 4 — Send Package */}
        {step === 'send' && (
          <div className="flex h-full">
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-xl mx-auto">
                <DocumentSend
                  offerData={offerData}
                  offerId={offerId}
                  agentName={offerData?.agent_name || loadSettings().agentName || 'Your Name'}
                />
              </div>
            </div>
            <div className="w-80 border-l overflow-y-auto p-3">
              <OfferSummary offerData={offerData} />
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
