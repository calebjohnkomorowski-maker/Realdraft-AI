import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, Phone, Send, ExternalLink, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import OfferSummary from '@/components/OfferSummary'
import CallScript from '@/components/CallScript'
import DocumentSend from '@/components/DocumentSend'
import { offers as offersApi, documents as docsApi } from '@/lib/api'
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/utils'

const AGENT_NAME = 'Your Name'

export default function OfferDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [offer, setOffer] = useState(null)
  const [tab, setTab] = useState('summary')
  const [pdfUrl, setPdfUrl] = useState(null)
  const [pdfLoading, setPdfLoading] = useState(false)

  useEffect(() => {
    offersApi.get(id).then(setOffer).catch(console.error)
  }, [id])

  const loadPdf = async () => {
    if (pdfUrl) return
    setPdfLoading(true)
    try {
      const url = await docsApi.preview(offer.fields)
      setPdfUrl(url)
    } catch (err) { console.error(err) }
    finally { setPdfLoading(false) }
  }

  if (!offer) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  )

  const offerData = offer.fields || {}
  const address = offer.properties?.address || offerData.property_address || 'Offer'
  const status = offer.status || 'draft'

  const TABS = [
    { id: 'summary', label: 'Summary' },
    { id: 'pdf', label: 'PDF Preview' },
    { id: 'script', label: 'Call Script' },
    { id: 'send', label: 'Send Package' },
  ]

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold truncate">{address}</h1>
            <Badge className={`${STATUS_COLORS[status]} text-xs`}>{STATUS_LABELS[status]}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Buyer: {offerData.buyer_name} · Seller: {offerData.seller_name}
          </p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 border-b pb-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); if (t.id === 'pdf') loadPdf() }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'summary' && (
        <div className="max-w-lg">
          <OfferSummary offerData={offerData} />
        </div>
      )}

      {tab === 'pdf' && (
        <div className="border rounded-lg overflow-hidden" style={{ height: '70vh' }}>
          {pdfLoading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {pdfUrl && !pdfLoading && (
            <iframe src={pdfUrl} className="w-full h-full" title="PDF Preview" />
          )}
        </div>
      )}

      {tab === 'script' && (
        <div className="max-w-2xl">
          <CallScript offerData={offerData} offerId={id} />
        </div>
      )}

      {tab === 'send' && (
        <div className="max-w-xl">
          <DocumentSend offerData={offerData} offerId={id} agentName={AGENT_NAME} />
        </div>
      )}
    </div>
  )
}
