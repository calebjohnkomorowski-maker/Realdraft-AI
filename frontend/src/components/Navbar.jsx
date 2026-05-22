import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FilePlus, Users, Settings, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const LINKS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clients', icon: Users, label: 'Clients' },
]

export default function Navbar() {
  const navigate = useNavigate()

  return (
    <aside className="w-56 bg-card border-r flex flex-col h-screen sticky top-0 flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-none">RealDraft AI</p>
            <p className="text-xs text-muted-foreground mt-0.5">PA Offer Automation</p>
          </div>
        </div>
      </div>

      {/* New Offer CTA */}
      <div className="px-3 pt-4">
        <Button className="w-full" size="sm" onClick={() => navigate('/new-offer')}>
          <FilePlus className="w-4 h-4 mr-2" />
          Write New Offer
        </Button>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 pt-4 space-y-1">
        {LINKS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Settings */}
      <div className="px-3 pb-4 border-t pt-3">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
              isActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )
          }
        >
          <Settings className="w-4 h-4" />
          Settings
        </NavLink>
      </div>
    </aside>
  )
}
