import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Eye, Phone, Send, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Chat from '@/components/Chat'
import OfferSummary from '@/components/OfferSummary'
import CallScript from '@/components/CallScript'
import DocumentSend from '@/components/DocumentSend'
import { documents as docsApi, offers as offersApi } from '@/lib/api'
import { cn } from '@/lib/utils'

const AGENT_ID = 'demo-agent'
const AGENT_NAME = 'Your Name' // replace with auth session

const STEPS = [
  { id: 'intake', label: 'AI Intake', icon: FileText },
  { id: 'review', label: 'Review PDF', icon: Eye },
  { id: 'script', label: 'Call Script', icon: Phone },
  { id: 'send', label: 'Send Package', icon: Send },
]

export default function NewOffer() {
  const navigate = useNavigate()
  const [step, setStep] = useState('intake')
  const [offerData, setOfferData] = useState(null)
  const [offerId, setOfferId] = useState(null)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const stepIndex = STEPS.findIndex(s => s.id === step)

  const handleOfferComplete = async (data, _sessionId) => {
    setOfferData(data)
  }

  const goToReview = async () => {
    setPreviewLoading(true)
    try {
      // Save offer to DB
      const saved = await offersApi.create(offerData, AGENT_ID)
      setOfferId(saved.id)

      // Generate PDF preview
      const url = await docsApi.preview(offerData)
      setPdfUrl(url)
      setStep('review')
    } catch (err) {
      console.error(err)
      alert('Error generating preview: ' + err.message)
    } finally {
      setPreviewLoading(false)
    }
  }

  const isStepComplete = (id) => {
    const idx = STEPS.findIndex(s => s.id === id)
    return idx < stepIndex
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Step header */}
      <div className="border-b bg-background px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const active = s.id === step
            const done = isStepComplete(s.id)
            return (
              <div key={s.id} className="flex items-center">
                <button
                  disabled={!done && !active}
                  onClick={() => done && setStep(s.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                    active && 'bg-primary text-primary-foreground',
                    done && !active && 'text-muted-foreground hover:text-foreground cursor-pointer',
                    !done && !active && 'text-muted-foreground/40 cursor-not-allowed'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {s.label}
                </button>
                {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/40 mx-0.5" />}
              </div>
            )
          })}
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>← Back to Dashboard</Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">

        {/* STEP 1: AI Intake */}
        {step === 'intake' && (
          <div className="flex h-full">
            {/* Chat panel */}
            <div className="flex-1 flex flex-col min-w-0 border-r">
              <Chat onOfferComplete={handleOfferComplete} />
            </div>
            {/* Summary panel */}
            <div className="w-80 xl:w-96 flex-shrink-0 flex flex-col">
              <div className="p-4 border-b bg-muted/30">
                <h3 className="text-sm font-semibold">Extracted Fields</h3>
                <p className="text-xs text-muted-foreground">Updates as Claude collects information</p>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <OfferSummary offerData={offerData} />
              </div>
              {offerData && (
                <div className="p-4 border-t">
                  <Button className="w-full" onClick={goToReview} disabled={previewLoading}>
                    {previewLoading
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating PDF…</>
                      : <><Eye className="w-4 h-4 mr-2" /> Preview & Continue</>
                    }
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: Review PDF */}
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

        {/* STEP 3: Call Script */}
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

        {/* STEP 4: Send Package */}
        {step === 'send' && (
          <div className="flex h-full">
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-xl mx-auto">
                <DocumentSend offerData={offerData} offerId={offerId} agentName={AGENT_NAME} />
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
