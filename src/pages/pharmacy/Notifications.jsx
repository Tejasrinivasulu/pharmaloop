import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { AlertBanner, Badge, Button, Card, CardHeader, EmptyState, LoadingScreen, PageHeader, } from '../../components/ui';
import { formatDateTime } from './format';
export default function PharmacyNotifications() {
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
    if (error)
        return <AlertBanner tone="danger" title="Unable to load notifications">{error}</AlertBanner>;
    const unread = items.filter((n) => !n.read).length;
    return (<div>
      <PageHeader title="Notifications" subtitle={`${unread} unread · ${items.length} total`}/>

      <Card>
        <CardHeader title="Inbox"/>
        {items.length === 0 ? (<EmptyState title="No notifications"/>) : (<ul className="divide-y divide-slate-100">
            {items.map((n) => (<li key={n.id} className={`flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:justify-between ${!n.read ? 'bg-brand-50/40' : ''}`}>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-sm font-semibold text-slate-900">{n.title}</p>
                    <Badge tone={n.read ? 'neutral' : 'brand'}>{n.read ? 'Read' : 'Unread'}</Badge>
                    <Badge tone="info">{n.type}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{n.body}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatDateTime(n.createdAt)}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {!n.read && (<Button size="sm" variant="secondary" onClick={() => markRead(n.id)}>
                      Mark read
                    </Button>)}
                  {n.href && (<Link to={n.href.replace('/pharmacy/settlements', '/pharmacy/settlement')} className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-brand-800 hover:bg-brand-50">
                      Open
                    </Link>)}
                </div>
              </li>))}
          </ul>)}
      </Card>
    </div>);
}
