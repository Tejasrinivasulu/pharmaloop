import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, Search, X, } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Button, cn } from './ui';
export function DashboardLayout({ title, nav, }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [showNotifs, setShowNotifs] = useState(false);
    const [notifs, setNotifs] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const unread = useMemo(() => notifs.filter((n) => !n.read).length, [notifs]);
    const loadNotifs = () => {
        api('/api/notifications')
            .then((r) => setNotifs(r.notifications || []))
            .catch(() => setNotifs([]));
    };
    useEffect(() => {
        loadNotifs();
        const t = setInterval(loadNotifs, 12000);
        return () => clearInterval(t);
    }, []);
    useEffect(() => {
        if (query.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        const t = setTimeout(() => {
            api(`/api/search?q=${encodeURIComponent(query)}`)
                .then((r) => {
                const flat = [
                    ...(r.results?.batches || []).map((b) => ({
                        type: 'batch',
                        id: b.id,
                        title: b.batchNumber,
                        subtitle: `${b.productName} · ${b.status}`,
                        batchNumber: b.batchNumber,
                    })),
                    ...(r.results?.returns || []).map((x) => ({
                        type: 'return',
                        id: x.id,
                        title: x.returnCode,
                        subtitle: `${x.batchNumber} · ${x.status}`,
                        batchNumber: x.batchNumber,
                    })),
                    ...(r.results?.inventory || []).map((i) => ({
                        type: 'inventory',
                        id: i.id,
                        title: i.productName,
                        subtitle: `${i.batchNumber} · ${i.status}`,
                        batchNumber: i.batchNumber,
                    })),
                    ...(r.results?.organizations || []).map((o) => ({
                        type: 'organization',
                        id: o.id,
                        title: o.name,
                        subtitle: o.orgType,
                    })),
                    ...(r.results?.alerts || []).map((a) => ({
                        type: 'alert',
                        id: a.id,
                        title: a.title,
                        subtitle: a.severity,
                    })),
                ];
                setSearchResults(flat);
            })
                .catch(() => setSearchResults([]));
        }, 250);
        return () => clearTimeout(t);
    }, [query]);
    const onLogout = () => {
        logout();
        navigate('/login');
    };
    const markRead = async (id, href) => {
        try {
            await api(`/api/notifications/${id}/read`, { method: 'POST' });
            setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
        }
        catch {
            /* ignore */
        }
        setShowNotifs(false);
        if (href)
            navigate(href);
    };
    const markAllRead = async () => {
        try {
            await api('/api/notifications/read-all', { method: 'POST' });
            setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
        }
        catch {
            /* ignore */
        }
    };
    return (<div className="min-h-screen bg-slate-50">
      <aside className={cn('fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200 bg-brand-950 text-white transition-transform lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex h-[4.25rem] items-center gap-2.5 border-b border-white/10 px-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 shadow-sm">
            <span className="font-display text-sm font-extrabold tracking-tight">PL</span>
          </div>
          <div>
            <p className="font-display text-sm font-extrabold tracking-tight">PharmaLoop</p>
            <p className="text-[11px] font-medium text-white/45">{title}</p>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setOpen(false)} aria-label="Close">
            <X className="h-5 w-5"/>
          </button>
        </div>
        <nav className="space-y-0.5 overflow-y-auto p-3" style={{ maxHeight: 'calc(100vh - 8rem)' }}>
          {nav.map((item) => (<NavLink key={item.to} to={item.to} end={item.end} onClick={() => setOpen(false)} className={({ isActive }) => cn('flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition', isActive
                ? 'bg-white/15 text-white'
                : 'text-white/65 hover:bg-white/8 hover:text-white')}>
              <item.icon className="h-4 w-4 shrink-0 opacity-80"/>
              {item.label}
            </NavLink>))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-3">
          <button onClick={onLogout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-white/70 hover:bg-white/10 hover:text-white">
            <LogOut className="h-4 w-4"/>
            Logout
          </button>
        </div>
      </aside>

      {open && (<button className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" aria-label="Close sidebar" onClick={() => setOpen(false)}/>)}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
          <div className="flex h-[4.25rem] items-center gap-3 px-4 sm:px-6">
            <button className="rounded-lg border border-slate-200 p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5"/>
            </button>

            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search batch, medicine, return ID…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-600 focus:bg-white focus:ring-4 focus:ring-brand-600/10"/>
              {searchResults.length > 0 && (<div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  {searchResults.slice(0, 8).map((r) => (<button key={`${r.type}-${r.id}`} className="block w-full px-4 py-2.5 text-left hover:bg-slate-50" onClick={() => {
                    setQuery('');
                    setSearchResults([]);
                    if (r.batchNumber) {
                        const base = user?.role === 'Manufacturer'
                            ? '/manufacturer'
                            : user?.role === 'Pharmacy'
                                ? '/pharmacy'
                                : user?.role === 'Distributor'
                                    ? '/distributor'
                                    : '/admin';
                        navigate(`${base}/batch/${encodeURIComponent(r.batchNumber)}`);
                    }
                }}>
                      <p className="text-sm font-medium text-slate-800">{r.title}</p>
                      <p className="text-xs text-slate-500">
                        {r.type}
                        {r.subtitle ? ` · ${r.subtitle}` : ''}
                      </p>
                    </button>))}
                </div>)}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <Button variant="ghost" size="sm" className="relative" onClick={() => setShowNotifs((v) => !v)} aria-label="Notifications">
                  <Bell className="h-5 w-5"/>
                  {unread > 0 && (<span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {unread}
                    </span>)}
                </Button>
                {showNotifs && (<div className="absolute right-0 top-full z-30 mt-1 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <span className="font-display text-sm font-semibold">Notifications</span>
                      {unread > 0 && (<button type="button" className="text-xs font-semibold text-brand-800 hover:underline" onClick={() => void markAllRead()}>
                          Mark all read
                        </button>)}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifs.length === 0 && (<p className="px-4 py-6 text-center text-sm text-slate-500">No notifications</p>)}
                      {notifs.map((n) => (<button key={n.id} className={cn('block w-full border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50', !n.read && 'bg-brand-50/40')} onClick={() => void markRead(n.id, n.href)}>
                          <p className="text-sm font-medium text-slate-800">{n.title}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{n.message || n.body}</p>
                        </button>))}
                    </div>
                  </div>)}
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.org}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 xl:px-10">
          <Outlet />
        </main>
      </div>
    </div>);
}
