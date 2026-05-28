import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FileText, Eye, Phone, Send, ChevronRight, Loader2, Pencil, Upload, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import OfferForm from '@/components/OfferForm'
import OfferSummary from '@/components/OfferSummary'
import CallScript from '@/components/CallScript'
import DocumentSend from '@/components/DocumentSend'
import { documents, offers as offersApi } from '@/lib/api'
const docsApi = documents
import { cn } from '@/lib/utils'
import { loadSettings, agentFieldsFromSettings } from '@/lib/useSettings'

const AGENT_ID = 'demo-agent' // replace with auth session

const STEPS = [
  { id: 'intake', label: 'Fill Form',    icon: FileText },
  { id: 'review', label: 'Review PDF',   icon: Eye },
  { id: 'script', label: 'Call Script',  icon: Phone },
  { id: 'send',   label: 'Send Package', icon: Send },
]

export default function NewOffer() {
  const navigate  = useNavigate()
  const { id: editId } = useParams()          // present on /offers/:id/edit
  const isEditing = !!editId

  const [step, setStep]                     = useState('intake')
  const [offerData, setOfferData]           = useState(null)
  const [offerId, setOfferId]               = useState(editId || null)
  const [existingFields, setExistingFields] = useState(null)  // pre-fill for edit mode
  const [loadingOffer, setLoadingOffer]     = useState(isEditing)
  const [pdfUrl, setPdfUrl]                 = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [mlsFields, setMlsFields]           = useState(null)   // parsed from MLS upload
  const [mlsParsing, setMlsParsing]         = useState(false)
  const [mlsError, setMlsError]             = useState('')
  const [mlsFile, setMlsFile]               = useState('')      // filename for display
  const mlsInputRef = useRef(null)

  const stepIndex      = STEPS.findIndex(s => s.id === step)
  const isStepComplete = (id) => STEPS.findIndex(s => s.id === id) < stepIndex

  // Edit mode — fetch existing offer and pre-fill the form
  useEffect(() => {
    if (!isEditing) return
    offersApi.get(editId)
      .then(offer => setExistingFields(offer.fields || {}))
      .catch(err  => { console.error('Failed to load offer:', err); alert('Could not load offer.') })
      .finally(() => setLoadingOffer(false))
  }, [editId])

  const handleMLSUpload = async (file) => {
    if (!file) return
    setMlsFile(file.name)
    setMlsParsing(true)
    setMlsError('')
    try {
      const { fields } = await documents.parseMLS(file)
      setMlsFields(fields)
    } catch (err) {
      setMlsError(err.message)
      setMlsFile('')
    } finally {
      setMlsParsing(false)
    }
  }

  const handleFormSubmit = async (data) => {
    const settings = loadSettings()
    const merged   = { ...data, ...agentFieldsFromSettings(settings) }
    setOfferData(merged)
    setPreviewLoading(true)

    try {
      // Save / update in DB — non-fatal if Supabase isn't configured
      try {
        if (isEditing && offerId) {
          await offersApi.update(offerId, { fields: merged })
        } else {
          const saved = await offersApi.create(merged, AGENT_ID)
          setOfferId(saved.id)
        }
      } catch (dbErr) {
        console.warn('DB save skipped:', dbErr.message)
      }

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

  // Loading spinner while fetching existing offer
  if (loadingOffer) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading offer…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">

      {/* ── Step header ───────────────────────────────────────────────────── */}
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
        <Button variant="ghost" size="sm" onClick={() => navigate(isEditing ? `/offers/${editId}` : '/')}>
          ← {isEditing ? 'Back to Offer' : 'Back to Dashboard'}
        </Button>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">

        {/* STEP 1 — Form */}
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
                  <div className="flex items-center gap-2">
                    {isEditing && <Pencil className="w-5 h-5 text-primary" />}
                    <h1 className="text-2xl font-bold">{isEditing ? 'Edit Offer' : 'New Offer'}</h1>
                  </div>
                  <p className="text-muted-foreground text-sm mt-1">
                    {isEditing
                      ? 'Update the details below and click Regenerate PDF to apply changes.'
                      : 'Upload an MLS sheet to auto-fill, or fill in manually below.'
                    }
                  </p>
                </div>

                {/* ── MLS Upload Banner ──────────────────────────────────── */}
                {!isEditing && (
                  <div
                    className={`mb-6 rounded-xl border-2 border-dashed transition-colors ${
                      mlsFields ? 'border-green-400 bg-green-50' : 'border-primary/30 bg-primary/5 hover:border-primary/60'
                    }`}
                  >
                    <input
                      ref={mlsInputRef}
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={e => handleMLSUpload(e.target.files?.[0])}
                    />
                    {mlsParsing ? (
                      <div className="flex items-center justify-center gap-3 py-6 text-sm text-muted-foreground">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        <span>Reading MLS sheet — extracting fields…</span>
                      </div>
                    ) : mlsFields ? (
                      <div className="flex items-center justify-between px-5 py-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-green-800">MLS imported — {mlsFile}</p>
                            <p className="text-xs text-green-700">
                              Property, seller, utilities, and inclusions pre-filled. Review and edit below.
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => mlsInputRef.current?.click()}
                          className="text-xs text-green-700 underline shrink-0 ml-4"
                        >
                          Upload different file
                        </button>
                      </div>
                    ) : (
                      <button
                        className="w-full flex flex-col items-center gap-2 py-6 text-center"
                        onClick={() => mlsInputRef.current?.click()}
                      >
                        <Upload className="w-8 h-8 text-primary/60" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">Upload MLS Sheet</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Drop your MLS PDF here — property, seller, utilities & inclusions fill in automatically
                          </p>
                        </div>
                        <span className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-full">
                          Choose PDF
                        </span>
                      </button>
                    )}
                    {mlsError && (
                      <div className="flex items-center gap-2 px-5 pb-4 text-xs text-destructive">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {mlsError}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Offer Form — key forces re-init when MLS data arrives ── */}
                <OfferForm
                  key={mlsFields ? 'mls' : 'empty'}
                  onSubmit={handleFormSubmit}
                  initialValues={mlsFields || existingFields}
                  submitLabel={isEditing ? 'Regenerate PDF' : 'Generate Offer PDF'}
                />
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
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setStep('intake')}>
                    <Pencil className="w-3 h-3 mr-1.5" /> Edit
                  </Button>
                  {pdfUrl && (
                    <a href={pdfUrl} download="offer-preview.pdf">
                      <Button variant="outline" size="sm">Download PDF</Button>
                    </a>
                  )}
                </div>
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
