import { useEffect, useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import { getEvents } from '../../utils/api';
import AppLayout from '../../components/AppLayout';
import Topbar from '../../components/Topbar';
import { Icons } from '../../components/Icons';

function taskStatus(t) {
  if (t.assignedVolunteers.length >= t.requiredCount) return 'full';
  if (t.assignedVolunteers.length > 0) return 'partial';
  return 'empty';
}

export default function LiveMonitor() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { lastMessage, connected } = useSocket();
  const { addToast } = useToast();

  const fetch = async () => {
    try { const r = await getEvents(); setEvents(r.data); }
    catch { addToast('Failed to load', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);
  useEffect(() => { if (lastMessage) fetch(); }, [lastMessage]);

  const allTasks = events.flatMap(e => e.tasks.map(t => ({ ...t, eventName: e.name })));
  const full = allTasks.filter(t => taskStatus(t) === 'full').length;
  const partial = allTasks.filter(t => taskStatus(t) === 'partial').length;
  const empty = allTasks.filter(t => taskStatus(t) === 'empty').length;

  return (
    <AppLayout>
      <Topbar title="Live Monitor" subtitle="Real-time allocation overview" />
      <div className="page-content">

        {/* Summary stats */}
        <div className="grid-3" style={{ marginBottom:'2rem' }}>
          {[
            { label:'Fully Staffed', value:full, color:'var(--success)', bg:'var(--success-light)' },
            { label:'Partially Filled', value:partial, color:'var(--warning)', bg:'var(--warning-light)' },
            { label:'Needs Volunteers', value:empty, color:'var(--danger)', bg:'var(--danger-light)' },
          ].map(s => (
            <div key={s.label} style={{ background:s.bg, border:`1px solid ${s.color}22`, borderRadius:'var(--radius)', padding:'1.25rem' }}>
              <div style={{ fontSize:'2rem', fontWeight:800, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:'0.875rem', fontWeight:500, color:'var(--text)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ display:'grid', gap:'1rem' }}>
            {[1,2].map(i => <div key={i} className="skeleton" style={{ height:200, borderRadius:'var(--radius)' }}/>)}
          </div>
        ) : events.map(event => {
          const total = event.tasks.reduce((s,t) => s + t.requiredCount, 0);
          const filled = event.tasks.reduce((s,t) => s + t.assignedVolunteers.length, 0);
          const pct = total ? Math.round((filled/total)*100) : 0;
          return (
            <div key={event.id} className="card" style={{ marginBottom:'1.5rem' }}>
              <div className="card-header">
                <div>
                  <h3>{event.name}</h3>
                  <p style={{ fontSize:'0.8125rem', marginTop:'0.125rem' }}>📅 {event.date} · {event.volunteers.length} volunteers</p>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                  <span style={{ fontWeight:700, fontSize:'1.125rem', color: pct===100?'var(--success)':pct>0?'var(--warning)':'var(--danger)' }}>{pct}%</span>
                  <div className="progress-bar" style={{ width:120 }}>
                    <div className="progress-fill" style={{ width:`${pct}%`, background: pct===100?'var(--success)':pct>0?'var(--warning)':'var(--danger)' }}/>
                  </div>
                </div>
              </div>
              <div className="card-body" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'0.75rem' }}>
                {event.tasks.map(task => {
                  const s = taskStatus(task);
                  const color = s==='full'?'var(--success)':s==='partial'?'var(--warning)':'var(--danger)';
                  const pct2 = task.requiredCount ? Math.round((task.assignedVolunteers.length/task.requiredCount)*100) : 0;
                  return (
                    <div key={task.id} style={{ padding:'0.875rem', borderRadius:'var(--radius-sm)', border:`2px solid ${color}33`, background:`${color}0A` }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem' }}>
                        <span style={{ fontWeight:600, fontSize:'0.875rem', color:'var(--text)' }}>{task.name}</span>
                        <span style={{ fontSize:'0.75rem', fontWeight:700, color }}>{task.assignedVolunteers.length}/{task.requiredCount}</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width:`${pct2}%`, background:color }}/>
                      </div>
                      <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginTop:'0.375rem', display:'flex', alignItems:'center', gap:'0.375rem' }}>
                        <span style={{ width:6, height:6, borderRadius:'50%', background:color, display:'inline-block' }}/>
                        {s === 'full' ? 'Fully Staffed' : s === 'partial' ? 'Needs more' : 'Needs volunteers'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}
