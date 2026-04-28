import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { getEvents, deleteEvent, toggleEventLive } from '../../utils/api';
import AppLayout from '../../components/AppLayout';
import Topbar from '../../components/Topbar';
import { Icons } from '../../components/Icons';

function fillPercent(event) {
  const total = event.tasks.reduce((s, t) => s + t.requiredCount, 0);
  const filled = event.tasks.reduce((s, t) => s + t.assignedVolunteers.length, 0);
  return total === 0 ? 0 : Math.round((filled / total) * 100);
}

function EventCard({ event, onOpen, onDelete, onToggleLive }) {
  const pct = fillPercent(event);
  const tasksFull = event.tasks.filter((t) => t.assignedVolunteers.length >= t.requiredCount).length;
  const statusColor = pct === 100 ? 'var(--success)' : pct > 0 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div className="card" style={{ cursor:'pointer' }} onClick={() => onOpen(event.id)}>
      <div className="card-body">
        {/* Live indicator + toggle */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.75rem' }}>
          <div className={`live-badge ${event.isLive ? 'live-badge-on' : 'live-badge-off'}`}>
            <div className="live-badge-dot" />
            {event.isLive ? 'Live' : 'Offline'}
          </div>
          <label className="toggle-switch" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={event.isLive || false}
              onChange={(e) => { e.stopPropagation(); onToggleLive(event.id); }}
            />
            <div className="toggle-track" />
            <div className="toggle-knob" />
          </label>
        </div>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1rem' }}>
          <div>
            <h3 style={{ marginBottom:'0.25rem', color:'var(--text)' }}>{event.name}</h3>
            <p style={{ fontSize:'0.8125rem', lineHeight:'1.4' }}>{event.description}</p>
          </div>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            style={{ color:'var(--danger)', flexShrink:0 }}
            onClick={(e) => { e.stopPropagation(); onDelete(event); }}
          >
            <Icons.Trash />
          </button>
        </div>

        <div style={{ display:'flex', gap:'1rem', marginBottom:'1rem', flexWrap:'wrap' }}>
          <div style={{ fontSize:'0.8125rem', color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:'0.375rem' }}>
            <Icons.Calendar /> {event.date} {event.time && `at ${event.time}`}
          </div>
          <div style={{ fontSize:'0.8125rem', color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:'0.375rem' }}>
            <Icons.CheckSquare /> {event.tasks.length} tasks ({tasksFull} full)
          </div>
          <div style={{ fontSize:'0.8125rem', color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:'0.375rem' }}>
            <Icons.Users /> {event.volunteers.length} volunteers
          </div>
        </div>

        {/* Fill bar */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.375rem' }}>
            <span style={{ fontSize:'0.75rem', fontWeight:600, color:'var(--text-secondary)' }}>Volunteer Fill</span>
            <span style={{ fontSize:'0.75rem', fontWeight:700, color: statusColor }}>{pct}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width:`${pct}%`, background: statusColor }} />
          </div>
        </div>

        <button
          className="btn btn-primary btn-sm w-full"
          style={{ marginTop:'1rem' }}
          onClick={(e) => { e.stopPropagation(); onOpen(event.id); }}
        >
          Open Control Panel <Icons.ChevronRight />
        </button>
      </div>
    </div>
  );
}

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { lastMessage } = useSocket();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const fetchEvents = async () => {
    try { 
      const r = await getEvents(user?.id); 
      setEvents(r.data); 
    }
    catch { addToast('Failed to load events', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchEvents(); }, []);

  useEffect(() => {
    if (lastMessage?.type === 'EVENT_CREATED' || lastMessage?.type === 'EVENT_DELETED' || lastMessage?.type === 'VOLUNTEER_ADDED' || lastMessage?.type === 'VOLUNTEER_REMOVED' || lastMessage?.type === 'EVENT_LIVE_TOGGLED') {
      fetchEvents();
    }
  }, [lastMessage]);

  const handleDelete = async () => {
    try {
      await deleteEvent(deleteTarget.id);
      addToast('Event deleted', 'info');
      setDeleteTarget(null);
      fetchEvents();
    } catch { addToast('Failed to delete event', 'error'); }
  };

  const handleToggleLive = async (eventId) => {
    try {
      const r = await toggleEventLive(eventId);
      addToast(r.data.isLive ? 'Event is now Live!' : 'Event is now Offline', r.data.isLive ? 'success' : 'info');
      fetchEvents();
    } catch { addToast('Failed to toggle live status', 'error'); }
  };

  const totalVolunteers = [...new Set(events.flatMap((e) => e.volunteers.map((v) => v.userId)))].length;
  const totalTasks = events.reduce((s, e) => s + e.tasks.length, 0);
  const fullEvents = events.filter((e) => fillPercent(e) === 100).length;

  return (
    <AppLayout>
      <Topbar
        title="Manager Dashboard"
        subtitle="Overview of all events and volunteer allocation"
      />
      <div className="page-content">

        {/* Stats */}
        <div className="grid-3" style={{ marginBottom:'2rem' }}>
          {[
            { icon:Icons.Calendar, value:events.length, label:'Total Events', color:'stat-icon-blue' },
            { icon:Icons.Users, value:totalVolunteers, label:'Active Volunteers', color:'stat-icon-green' },
            { icon:Icons.CheckSquare, value:totalTasks, label:'Total Tasks', color:'stat-icon-yellow' },
            { icon:Icons.Activity, value:`${fullEvents}/${events.length}`, label:'Events Fully Staffed', color:'stat-icon-green' },
          ].map((s, i) => (
            <div key={i} className="stat-card">
              <div className={`stat-icon ${s.color}`}><s.icon /></div>
              <div>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Events */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem' }}>
          <h2>Your Events</h2>
          <button className="btn btn-primary" onClick={() => navigate('/manager/events/new')}>
            <Icons.Plus /> Create Event
          </button>
        </div>

        {loading ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:'1.5rem' }}>
            {[1,2,3].map((i) => <div key={i} className="skeleton" style={{ height:220, borderRadius:'var(--radius)' }} />)}
          </div>
        ) : events.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <span style={{ fontSize:'3rem' }}>📋</span>
              <h3>No events yet</h3>
              <p>Create your first event to get started</p>
              <button className="btn btn-primary" onClick={() => navigate('/manager/events/new')}>
                <Icons.Plus /> Create Event
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:'1.5rem' }}>
            {events.map((ev) => (
              <EventCard
                key={ev.id}
                event={ev}
                onOpen={(id) => navigate(`/manager/events/${id}`)}
                onDelete={(ev) => setDeleteTarget(ev)}
                onToggleLive={handleToggleLive}
              />
            ))}
          </div>
        )}

        {/* Delete Confirm Modal */}
        {deleteTarget && (
          <div className="modal-backdrop">
            <div className="modal" style={{ maxWidth:400 }}>
              <div className="modal-header">
                <h3>Delete Event</h3>
                <button className="btn btn-ghost btn-icon" onClick={() => setDeleteTarget(null)}><Icons.X /></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This cannot be undone.</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDelete}>Delete Event</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
