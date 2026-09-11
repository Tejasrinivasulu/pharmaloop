import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Badge, Button, Card, CardHeader, EmptyState, LoadingScreen, PageHeader, cn, } from '../../components/ui';
export default function Notifications() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const load = () => api('/api/notifications')
        .then((r) => setItems(r.notifications || []))
        .finally(() => setLoading(false));
    useEffect(() => {
        load();
    }, []);
    const markRead = async (id) => {
        try {
            await api(`/api/notifications/${id}/read`, { method: 'POST' });
            setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
        }
        catch {
            /* ignore */
        }
    };
    if (loading)
        return <LoadingScreen label="Loading notifications…"/>;
    const unread = items.filter((n) => !n.read).length;
    return (<div>
      <PageHeader title="Notifications" subtitle={`${unread} unread · ${items.length} total`}/>

      <Card>
        <CardHeader title="Inbox" subtitle="Distributor operational alerts"/>
        {items.length === 0 ? (<EmptyState title="No notifications" text="You’re all caught up."/>) : (<ul className="divide-y divide-slate-100">
            {items.map((n) => (<li key={n.id} className={cn('flex items-start gap-3 px-5 py-4', !n.read && 'bg-brand-50/40')}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-sm font-semibold text-slate-900">{n.title}</p>
                    {!n.read && <Badge tone="brand">New</Badge>}
                    <Badge tone="neutral">{n.type}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{n.body || n.message}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                  {n.href && (<Link to={n.href} className="mt-2 inline-block text-sm font-semibold text-brand-800 hover:underline">
                      Open
                    </Link>)}
                </div>
                {!n.read && (<Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>
                    Mark read
                  </Button>)}
              </li>))}
          </ul>)}
      </Card>
    </div>);
}
