import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, Phone, Send, Loader2, FileText, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import OfferSummary from '@/components/OfferSummary'
import CallScript from '@/components/CallScript'
import DocumentSend from '@/components/DocumentSend'
import { offers as offersApi, documents as docsApi } from '@/lib/api'
import { STATUS_COLORS, STATUS_LABELS, cn } from '@/lib/utils'
import { loadSettings, agentFieldsFromSettings } from '@/lib/useSettings'

const TABS = [
  { id: 'pdf',    label: 'PDF Preview', icon: FileText },
  { id: 'script', label: 'Call Script', icon: Phone },
  { id: 'send',   label: 'Send Package', icon: Send },
]

export default function OfferDetail() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const [offer, setOffer]         = useState(null)
  const [tab, setTab]             = useState('pdf')
  const [pdfUrl, setPdfUrl]       = useState(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError]   = useState('')

  // Load offer then immediately kick off PDF generation
  useEffect(() => {
    offersApi.get(id)
      .then(data => {
        setOffer(data)
        generatePdf(data)
      })
      .catch(err => console.error('Failed to load offer:', err))
  }, [id])

  const generatePdf = async (data) => {
    setPdfLoading(true)
    setPdfError('')
    try {
      const settings  = loadSettings()
      const enriched  = { ...agentFieldsFromSettings(settings), ...(data.fields || {}) }
      const url = await docsApi.preview(enriched)
      setPdfUrl(url)
    } catch (err) {
      setPdfError(err.message)
    } finally {
      setPdfLoading(false)
    }
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (!offer) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  )

  const offerData = offer.fields || {}
  const address   = offer.properties?.address || offerData.property_address || 'Offer'
  const status    = offer.status || 'draft'

  return (
    <div className="flex flex-col h-screen">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="border-b bg-background px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate('/')}>
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate(`/offers/${id}/edit`)}>
          <Pencil className="w-3.5 h-3.5" /> Edit Offer
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-semibold text-sm truncate">{address}</h1>
            <Badge className={`${STATUS_COLORS[status]} text-xs`}>
              {STATUS_LABELS[status]}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {offerData.buyer_name && `Buyer: ${offerData.buyer_name}`}
            {offerData.buyer_name && offerData.seller_name && ' · '}
            {offerData.seller_name && `Seller: ${offerData.seller_name}`}
          </p>
        </div>

        {/* Tab pills in header */}
        <div className="flex items-center gap-1">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  tab === t.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex">

        {/* ── PDF Preview ─────────────────────────────────────────────────── */}
        {tab === 'pdf' && (
          <>
            <div className="flex-1 bg-muted/50 flex flex-col">
              <div className="p-2 border-b bg-background flex items-center justify-between">
                <span className="text-xs text-muted-foreground">PA ASR Form</span>
                {pdfUrl && (
                  <a href={pdfUrl} download={`offer-${address.replace(/\s+/g, '-')}.pdf`}>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                      <Download className="w-3 h-3" /> Download PDF
                    </Button>
                  </a>
                )}
              </div>

              {pdfLoading && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                    <p className="text-sm text-muted-foreground">Generating PDF…</p>
                  </div>
                </div>
              )}
              {pdfError && (
                <div className="flex-1 flex items-center justify-center p-8 text-center text-destructive text-sm">
                  Failed to generate PDF: {pdfError}
                </div>
              )}
              {pdfUrl && !pdfLoading && (
                <iframe src={pdfUrl} className="flex-1 w-full" title="PDF Preview" />
              )}
            </div>

            {/* Sidebar */}
            <div className="w-80 border-l flex flex-col flex-shrink-0">
              <div className="flex-1 overflow-y-auto p-3">
                <OfferSummary offerData={offerData} />
              </div>
              <div className="p-4 border-t space-y-2">
                <Button className="w-full" onClick={() => setTab('send')}>
                  <Send className="w-4 h-4 mr-2" /> Send Package
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setTab('script')}>
                  <Phone className="w-4 h-4 mr-2" /> Generate Call Script
                </Button>
              </div>
            </div>
          </>
        )}

        {/* ── Call Script ─────────────────────────────────────────────────── */}
        {tab === 'script' && (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-2xl mx-auto space-y-4">
                <CallScript offerData={offerData} offerId={id} />
                <Button className="w-full" onClick={() => setTab('send')}>
                  <Send className="w-4 h-4 mr-2" /> Continue to Send Package
                </Button>
              </div>
            </div>
            <div className="w-80 border-l overflow-y-auto p-3">
              <OfferSummary offerData={offerData} />
            </div>
          </div>
        )}

        {/* ── Send Package ─────────────────────────────────────────────────── */}
        {tab === 'send' && (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-xl mx-auto">
                <DocumentSend
                  offerData={offerData}
                  offerId={id}
                  agentName={offerData.agent_name || loadSettings().agentName || 'Your Name'}
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
