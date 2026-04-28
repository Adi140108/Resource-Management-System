import { useEffect, useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { getEvents } from '../../utils/api';
import AppLayout from '../../components/AppLayout';
import Topbar from '../../components/Topbar';

export default function VolunteersPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const { lastMessage } = useSocket();
  const fetch = () => getEvents(user?.id).then(r => setEvents(r.data)).catch(()=>{});
  useEffect(() => { fetch(); }, []);
  useEffect(() => { if (lastMessage) fetch(); }, [lastMessage]);

  const allVols = {};
  events.forEach(ev => {
    ev.volunteers.forEach(v => {
      if (!allVols[v.userId]) allVols[v.userId] = { ...v, eventCount:0, events:[] };
      allVols[v.userId].eventCount++;
      allVols[v.userId].events.push({ eventName:ev.name, taskName: ev.tasks.find(t=>t.id===v.taskId)?.name });
    });
  });
  const list = Object.values(allVols);

  return (
    <AppLayout>
      <Topbar title="All Volunteers" subtitle={`${list.length} volunteers across all events`} />
      <div className="page-content">
        {list.length === 0 ? (
          <div className="card"><div className="empty-state"><span style={{fontSize:'2.5rem'}}>👥</span><p>No volunteers added to any event yet.</p></div></div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            {list.map(v => (
              <div key={v.userId} className="card">
                <div className="card-body" style={{ display:'flex', alignItems:'center', gap:'1rem', flexWrap:'wrap' }}>
                  <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,var(--primary),var(--primary-dark))', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, flexShrink:0 }}>
                    {v.name?.charAt(0)}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, color:'var(--text)' }}>{v.name}</div>
                    <div style={{ fontSize:'0.8125rem', color:'var(--text-muted)' }}>{v.email}</div>
                  </div>
                  <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                    {v.events.map((e,i) => (
                      <span key={i} className="badge badge-blue" style={{ fontSize:'0.75rem' }}>
                        {e.eventName}{e.taskName ? ` → ${e.taskName}` : ''}
                      </span>
                    ))}
                  </div>
                  {v.attendance && (
                    <span className={`badge ${v.attendance==='present'?'badge-green':'badge-red'}`}>
                      {v.attendance === 'present' ? '✅' : '❌'} {v.attendance}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
