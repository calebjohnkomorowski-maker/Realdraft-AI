import { useState, useRef, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import ReactMarkdown from 'react-markdown'
import { Send, Loader2, Bot, User, CheckCircle2, Mic } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { chat } from '@/lib/api'

const WELCOME = `👋 Hi! I'm your RealDraft AI assistant. Tell me about the offer and I'll handle the rest.

**Try something like:**
> "Write an offer for 123 Main St, Philadelphia. Buyer is Sarah Johnson, seller is Mike Thompson. Offering $450,000, $15k deposit, settlement July 30th, conventional mortgage, 10-day inspection, they want the garage refrigerator and basement bar included."

I'll ask follow-up questions for anything missing, then generate your PA ASR form automatically.`

function Message({ role, content, isTyping }) {
  const isAI = role === 'assistant'
  return (
    <div className={cn('flex gap-3 message-enter', isAI ? 'justify-start' : 'justify-end')}>
      {isAI && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center mt-1">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-3 text-sm',
          isAI
            ? 'bg-muted rounded-tl-none'
            : 'bg-primary text-primary-foreground rounded-tr-none'
        )}
      >
        {isTyping ? (
          <div className="flex gap-1 py-1">
            <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
        ) : isAI ? (
          <ReactMarkdown
            className="prose prose-sm max-w-none dark:prose-invert [&_p]:mb-2 [&_ul]:pl-4 [&_code]:bg-background [&_code]:px-1 [&_code]:rounded"
          >
            {content}
          </ReactMarkdown>
        ) : (
          <p className="whitespace-pre-wrap">{content}</p>
        )}
      </div>
      {!isAI && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center mt-1">
          <User className="w-4 h-4 text-secondary-foreground" />
        </div>
      )}
    </div>
  )
}

export default function Chat({ onOfferComplete }) {
  const [sessionId] = useState(() => uuidv4())
  const [messages, setMessages] = useState([{ role: 'assistant', content: WELCOME }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const userMsg = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg, { role: 'assistant', content: '', isTyping: true }])
    setLoading(true)

    try {
      const result = await chat.intake(sessionId, text)
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: result.message }
        return updated
      })

      if (result.isComplete && result.offerData) {
        onOfferComplete?.(result.offerData, sessionId)
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `⚠️ Something went wrong: ${err.message}. Please try again.`,
        }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <Message key={i} role={msg.role} content={msg.content} isTyping={msg.isTyping} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4 bg-background">
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the offer… (Enter to send, Shift+Enter for new line)"
            className="flex-1 min-h-[52px] max-h-[160px] resize-none"
            rows={2}
            disabled={loading}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            size="icon"
            className="h-[52px] w-[52px] flex-shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Powered by Claude · PA ASR Form Auto-Fill
        </p>
      </div>
    </div>
  )
}
