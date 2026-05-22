import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from '@/components/Navbar'
import Home from '@/pages/Home'
import NewOffer from '@/pages/NewOffer'
import OfferDetail from '@/pages/OfferDetail'
import Clients from '@/pages/Clients'
import Settings from '@/pages/Settings'

// NewOffer gets its own full-screen layout (no sidebar)
function FullScreen({ children }) {
  return <div className="h-screen overflow-hidden">{children}</div>
}

// Standard layout with sidebar
function WithSidebar({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Navbar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/new-offer" element={<FullScreen><NewOffer /></FullScreen>} />
        <Route path="*" element={
          <WithSidebar>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/offers/:id" element={<OfferDetail />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </WithSidebar>
        } />
      </Routes>
    </BrowserRouter>
  )
}
