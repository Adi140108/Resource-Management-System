import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import { getMe, updateMySkills } from '../../utils/api';
import AppLayout from '../../components/AppLayout';
import Topbar from '../../components/Topbar';
import { Icons } from '../../components/Icons';

const ALL_SKILLS = ['first-aid','communication','logistics','tech-support','coordination','driving','cooking','photography','teaching','security'];
const PRIORITY_LABELS = { 5:'Critical', 4:'High', 3:'Medium', 2:'Low', 1:'Minimal' };

function StatCard({ icon: Icon, value, label, colorClass }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${colorClass}`}><Icon /></div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

export default function VolunteerDashboard() {
  const { user, updateUser } = useAuth();
  const { lastMessage } = useSocket();
  const { addToast } = useToast();
  const [me, setMe] = useState(null);
  const [editSkills, setEditSkills] = useState(false);
  const [skills, setSkills] = useState(user?.skills || []);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchMe = async () => {
    try { const r = await getMe(); setMe(r.data); }
    catch { addToast('Could not load profile', 'error'); }
  };

  useEffect(() => { fetchMe(); }, []);

  useEffect(() => {
    if (lastMessage?.type?.startsWith('VOLUNTEER') || lastMessage?.type === 'EVENT_LIVE_TOGGLED') fetchMe();
  }, [lastMessage]);

  const copyCode = () => {
    navigator.clipboard.writeText(user?.uniqueCode || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast('Code copied to clipboard!', 'success');
  };

  const toggleSkill = (s) =>
    setSkills((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s]);

  const saveSkills = async () => {
    setSaving(true);
    try {
      await updateMySkills(skills);
      updateUser({ skills });
      setEditSkills(false);
      addToast('Skills updated!', 'success');
    } catch { addToast('Failed to save skills', 'error'); }
    finally { setSaving(false); }
  };

  const events = me?.events || [];
  const assignedEvents = events.filter((e) => e.taskId);
  const pendingEvents = events.filter((e) => !e.taskId);

  return (
    <AppLayout>
      <Topbar title="My Dashboard" subtitle="Track your volunteer assignments" />
      <div className="page-content">

        {/* Unique Code Hero */}
        <div className="card" style={{ marginBottom:'2rem', background:'linear-gradient(135deg,#EFF6FF,#DBEAFE)', border:'2px solid var(--primary-100)' }}>
          <div className="card-body" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'1rem' }}>
            <div>
              <div style={{ fontSize:'0.75rem', fontWeight:700, color:'var(--primary)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.5rem' }}>
                🔑 Your Unique Volunteer Code
              </div>
              <div className="code-badge" style={{ background:'transparent', border:'none', padding:0 }}>
                <span className="code-text">{user?.uniqueCode || '—'}</span>
              </div>
              <p style={{ fontSize:'0.8125rem', color:'var(--text-secondary)', marginTop:'0.5rem' }}>
                Share this code with a manager to be added to an event.
              </p>
            </div>
            <button className={`btn ${copied ? 'btn-success' : 'btn-primary'}`} onClick={copyCode} style={{ gap:'0.5rem' }}>
              {copied ? <><Icons.Check /> Copied!</> : <><Icons.Copy /> Copy Code</>}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid-3" style={{ marginBottom:'2rem' }}>
          <StatCard icon={Icons.Calendar} value={events.length} label="Events Joined" colorClass="stat-icon-blue" />
          <StatCard icon={Icons.CheckSquare} value={assignedEvents.length} label="Tasks Assigned" colorClass="stat-icon-green" />
          <StatCard icon={Icons.Star} value={user?.experienceScore || 0} label="Experience Score" colorClass="stat-icon-yellow" />
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' }}>

          {/* Skills Panel */}
          <div className="card">
            <div className="card-header">
              <h3>My Skills</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => { setEditSkills(!editSkills); setSkills(me?.skills || user?.skills || []); }}>
                {editSkills ? 'Cancel' : <><Icons.Edit /> Edit</>}
              </button>
            </div>
            <div className="card-body">
              {editSkills ? (
                <>
                  <div className="tag-list" style={{ marginBottom:'1rem' }}>
                    {ALL_SKILLS.map((s) => (
                      <button key={s} type="button" className="tag"
                        style={skills.includes(s) ? { background:'var(--primary)', color:'#fff', border:'1px solid var(--primary)' } : {}}
                        onClick={() => toggleSkill(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                  <button className="btn btn-primary w-full" onClick={saveSkills} disabled={saving}>
                    {saving ? <span className="spinner" /> : 'Save Skills'}
                  </button>
                </>
              ) : (
                <div className="tag-list">
                  {(me?.skills || user?.skills || []).length
                    ? (me?.skills || user?.skills).map((s) => <span key={s} className="tag">{s}</span>)
                    : <p style={{ fontSize:'0.875rem' }}>No skills added yet.</p>}
                </div>
              )}
            </div>
          </div>

          {/* Assigned Events */}
          <div className="card">
            <div className="card-header"><h3>My Assignments</h3></div>
            <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
              {events.length === 0 && (
                <div className="empty-state" style={{ padding:'1.5rem' }}>
                  <span style={{ fontSize:'2rem' }}>📋</span>
                  <p>No events yet. Share your code with a manager!</p>
                </div>
              )}
              {events.map((ev) => (
                <div key={ev.id} className={ev.isLive ? '' : 'event-card-offline'} style={{ padding:'1rem', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'var(--surface-2)', position: 'relative' }}>
                  {!ev.isLive && (
                    <div className="event-card-offline-overlay">
                      ⏳ Wait for the event to get live.
                    </div>
                  )}
                  <div className={ev.isLive ? '' : 'card-content-faded'}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.5rem' }}>
                      <div>
                        <div style={{ fontWeight:600, fontSize:'0.9375rem', color:'var(--text)' }}>{ev.name}</div>
                        <div className={`live-badge ${ev.isLive ? 'live-badge-on' : 'live-badge-off'}`} style={{ marginTop: '0.25rem' }}>
                          <div className="live-badge-dot" />
                          {ev.isLive ? 'Live' : 'Offline'}
                        </div>
                      </div>
                      <span className={`badge ${ev.taskId ? 'badge-green' : 'badge-yellow'}`}>
                        {ev.taskId ? 'Assigned' : 'Pending'}
                      </span>
                    </div>
                    <div style={{ fontSize:'0.8125rem', color:'var(--text-secondary)' }}>📅 {ev.date} at {ev.time}</div>
                    {ev.taskName && (
                      <div style={{ marginTop:'0.5rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                        <span style={{ fontSize:'0.8125rem', fontWeight:500, color:'var(--primary)' }}>🎯 Task: {ev.taskName}</span>
                      </div>
                    )}
                    {ev.attendance && (
                      <div style={{ marginTop:'0.25rem' }}>
                        <span className={`badge ${ev.attendance === 'present' ? 'badge-green' : 'badge-red'} badge-sm`}>
                          {ev.attendance === 'present' ? '✅ Present' : '❌ Absent'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* No-Show Warning */}
        {(me?.noShowCount || 0) > 0 && (
          <div style={{ marginTop:'1.5rem', padding:'1rem 1.25rem', background:'var(--warning-light)', borderRadius:'var(--radius-sm)', border:'1px solid var(--warning)', display:'flex', alignItems:'center', gap:'0.75rem' }}>
            <span style={{ fontSize:'1.25rem' }}>⚠️</span>
            <div>
              <div style={{ fontWeight:600, color:'var(--warning)' }}>No-Show Record</div>
              <div style={{ fontSize:'0.875rem', color:'var(--text-secondary)' }}>
                You have {me.noShowCount} no-show{me.noShowCount > 1 ? 's' : ''} recorded. More than 2 will affect your assignment priority.
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
