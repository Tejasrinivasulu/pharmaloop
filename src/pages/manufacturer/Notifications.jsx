import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { api } from '../../lib/api';
import { AlertBanner, Badge, Button, Card, CardHeader, cn, EmptyState, LoadingScreen, PageHeader, } from '../../components/ui';
import { formatDateTime } from './format';
export default function Notifications() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const load = () => {
        setLoading(true);
        api('/api/notifications')
            .then((r) => setItems(r.notifications || []))
            .catch((e) => setError(e.message || 'Failed to load notifications'))
            .finally(() => setLoading(false));
    };
    useEffect(() => {
        load();
    }, []);
    async function markRead(id) {
        try {
            await api(`/api/notifications/${id}/read`, { method: 'POST' });
            setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
        }
        catch {
            /* ignore */
        }
    }
    if (loading)
        return <LoadingScreen label="Loading notifications…"/>;
    if (error)
        return <AlertBanner tone="danger" title="Unable to load">{error}</AlertBanner>;
    const unread = items.filter((n) => !n.read).length;
    return (<div>
      <PageHeader title="Notifications" subtitle={`${unread} unread · ${items.length} total`} actions={<Button variant="secondary" size="sm" onClick={load}>
            Refresh
          </Button>}/>

      <Card>
        <CardHeader title="Inbox"/>
        {items.length === 0 ? (<EmptyState title="No notifications"/>) : (<div className="divide-y divide-slate-100">
            {items.map((n) => (<div key={n.id} className={cn('flex items-start justify-between gap-3 px-5 py-4 hover:bg-slate-50', !n.read && 'bg-brand-50/40')}>
                <button type="button" onClick={() => markRead(n.id)} className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display font-semibold text-slate-800">{n.title}</p>
                    {!n.read && <Badge tone="brand">New</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{n.body || n.message}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatDateTime(n.createdAt)}</p>
                </button>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {n.type && <Badge tone="neutral">{n.type}</Badge>}
                  {n.href && (<Link to={n.href} onClick={() => markRead(n.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900">
                      Open <ExternalLink className="h-3 w-3"/>
                    </Link>)}
                </div>
              </div>))}
          </div>)}
      </Card>
    </div>);
}
