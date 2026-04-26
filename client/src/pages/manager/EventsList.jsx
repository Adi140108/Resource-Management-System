import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEvents } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import AppLayout from '../../components/AppLayout';
import Topbar from '../../components/Topbar';
import { Icons } from '../../components/Icons';

export default function EventsList() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    getEvents()
      .then(r => setEvents(r.data))
      .catch(() => addToast('Failed to load events', 'error'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <Topbar title="All Events" subtitle="Manage your volunteer events" />
      <div className="page-content">
        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:80, borderRadius:'var(--radius)' }}/>)}
          </div>
        ) : events.length === 0 ? (
          <div className="card"><div className="empty-state"><span style={{fontSize:'2.5rem'}}>📋</span><h3>No events</h3><p>Create your first event.</p>
            <button className="btn btn-primary" onClick={() => navigate('/manager/events/new')}><Icons.Plus /> Create Event</button>
          </div></div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            {events.map(ev => {
              const filled = ev.tasks.reduce((s,t) => s + t.assignedVolunteers.length, 0);
              const total = ev.tasks.reduce((s,t) => s + t.requiredCount, 0);
              const pct = total ? Math.round((filled/total)*100) : 0;
              return (
                <div key={ev.id} className="card" style={{ cursor:'pointer' }} onClick={() => navigate(`/manager/events/${ev.id}`)}>
                  <div className="card-body" style={{ display:'flex', alignItems:'center', gap:'1.5rem', flexWrap:'wrap' }}>
                    <div style={{ flex:1, minWidth:160 }}>
                      <div style={{ fontWeight:700, color:'var(--text)', marginBottom:'0.125rem' }}>{ev.name}</div>
                      <div style={{ fontSize:'0.8125rem', color:'var(--text-secondary)' }}>📅 {ev.date} {ev.time && `at ${ev.time}`}</div>
                    </div>
                    <div className="flex gap-3 items-center">
                      <span className="badge badge-grey">{ev.tasks.length} tasks</span>
                      <span className="badge badge-blue">{ev.volunteers.length} volunteers</span>
                      <span className={`badge ${pct===100?'badge-green':pct>0?'badge-yellow':'badge-red'}`}>{pct}% filled</span>
                    </div>
                    <Icons.ChevronRight />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
