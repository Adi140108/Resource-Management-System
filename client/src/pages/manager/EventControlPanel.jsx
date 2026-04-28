import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import {
  getEvent, createTask, deleteTask, updateTask,
  addVolunteerToEvent, getVolunteerByCode, getRankedTasks,
  updateEventVolunteer, removeEventVolunteer, updateEvent
} from '../../utils/api';
import AppLayout from '../../components/AppLayout';
import Topbar from '../../components/Topbar';
import { Icons } from '../../components/Icons';

const PRIORITY_LABEL = { 5:'Critical', 4:'High', 3:'Medium', 2:'Low', 1:'Minimal' };
const PRIORITY_COLOR = { 5:'badge-red', 4:'badge-yellow', 3:'badge-blue', 2:'badge-green', 1:'badge-grey' };

function taskStatus(task) {
  const n = task.assignedVolunteers.length, r = task.requiredCount;
  if (n >= r) return 'full';
  if (n > 0) return 'partial';
  return 'empty';
}

// ─── Add Volunteer Modal ───────────────────────────────────────────────────────
function AddVolunteerModal({ eventId, event, onClose, onDone }) {
  const { addToast } = useToast();
  const [code, setCode] = useState('');
  const [vol, setVol] = useState(null);
  const [ranked, setRanked] = useState([]);
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState(null);
  const [manualTask, setManualTask] = useState('');
  const [loading, setLoading] = useState(false);

  const lookup = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const [vRes, rRes] = await Promise.all([
        getVolunteerByCode(code.trim().toUpperCase()),
        getRankedTasks(eventId, code.trim().toUpperCase())
      ]);
      setVol(vRes.data);
      setRanked(rRes.data);
      setStep(2);
    } catch (err) {
      addToast(err.response?.data?.error || 'Volunteer not found', 'error');
    } finally { setLoading(false); }
  };

  const assign = async () => {
    setLoading(true);
    try {
      await addVolunteerToEvent(eventId, {
        userId: vol.id,
        name: vol.name,
        email: vol.email,
        autoAssign: mode === 'auto',
        taskId: mode === 'manual' ? manualTask : undefined,
      });
      addToast('Volunteer added!', 'success');
      onDone();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to add volunteer', 'error');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h3>Add Volunteer</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><Icons.X /></button>
        </div>
        <div className="modal-body">
          {step === 1 && (
            <div className="form-group">
              <label className="form-label">Enter Volunteer Code</label>
              <div className="flex gap-2">
                <input className="form-input" placeholder="EVS-XXXXXX"
                  value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && lookup()} style={{ flex:1 }} />
                <button className="btn btn-primary" onClick={lookup} disabled={loading || !code}>
                  {loading ? <span className="spinner"/> : 'Lookup'}
                </button>
              </div>
            </div>
          )}

          {step === 2 && vol && (
            <>
              {/* Volunteer Preview */}
              <div style={{ padding:'1rem', background:'var(--surface-2)', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)' }}>
                <div className="flex items-center gap-3" style={{ marginBottom:'0.75rem' }}>
                  <div className="avatar">{vol.name.charAt(0)}</div>
                  <div>
                    <div style={{ fontWeight:700, color:'var(--text)' }}>{vol.name}</div>
                    <div style={{ fontSize:'0.8125rem', color:'var(--text-muted)' }}>{vol.email}</div>
                  </div>
                  {vol.noShowCount > 2 && <span className="badge badge-red">⚠️ {vol.noShowCount} No-shows</span>}
                </div>
                <div className="tag-list">
                  {vol.skills.map(s => <span key={s} className="tag">{s}</span>)}
                </div>
                <div style={{ marginTop:'0.5rem', fontSize:'0.8125rem', color:'var(--text-secondary)' }}>
                  ⭐ Experience Score: {vol.experienceScore}
                </div>
              </div>

              {/* Assignment Mode */}
              <div>
                <div className="form-label" style={{ marginBottom:'0.5rem' }}>Assignment Method</div>
                <div className="role-selector">
                  {[{ value:'auto', icon:'⚡', label:'Auto Assign' },
                    { value:'manual', icon:'🎯', label:'Manual Assign' }].map(m => (
                    <div key={m.value}
                      className={`role-option ${mode === m.value ? 'selected' : ''}`}
                      onClick={() => setMode(m.value)}>
                      <div className="role-icon">{m.icon}</div>
                      <div className="role-name">{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {mode === 'manual' && (
                <div className="form-group">
                  <label className="form-label">Select Task (ranked by score)</label>
                  <select className="form-select" value={manualTask} onChange={e => setManualTask(e.target.value)}>
                    <option value="">— choose task —</option>
                    {ranked.map(t => (
                      <option key={t.taskId} value={t.taskId} disabled={t.isFull}>
                        {t.taskName} {t.isFull ? '(Full)' : `— Score: ${t.score.toFixed(1)}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          {step === 2 && (
            <button className="btn btn-primary"
              onClick={assign}
              disabled={loading || !mode || (mode === 'manual' && !manualTask)}>
              {loading ? <span className="spinner"/> : 'Add Volunteer'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Task Form Modal ───────────────────────────────────────────────────────────
function TaskModal({ eventId, task, onClose, onDone }) {
  const { addToast } = useToast();
  const [form, setForm] = useState({
    name: task?.name || '',
    requiredSkills: task?.requiredSkills?.join(', ') || '',
    priority: task?.priority || 3,
    requiredCount: task?.requiredCount || 1,
  });
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    const data = {
      name: form.name,
      requiredSkills: form.requiredSkills.split(',').map(s => s.trim()).filter(Boolean),
      priority: Number(form.priority),
      requiredCount: Number(form.requiredCount),
    };
    try {
      task ? await updateTask(eventId, task.id, data) : await createTask(eventId, data);
      addToast(task ? 'Task updated!' : 'Task created!', 'success');
      onDone();
    } catch (err) { addToast(err.response?.data?.error || 'Failed', 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth:480 }}>
        <div className="modal-header">
          <h3>{task ? 'Edit Task' : 'Create Task'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><Icons.X /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Task Name *</label>
            <input className="form-input" value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="e.g. First Aid Station" />
          </div>
          <div className="form-group">
            <label className="form-label">Required Skills (comma separated)</label>
            <input className="form-input" value={form.requiredSkills} onChange={e => setForm({...form,requiredSkills:e.target.value})} placeholder="first-aid, communication" />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Priority (1–5)</label>
              <select className="form-select" value={form.priority} onChange={e => setForm({...form,priority:e.target.value})}>
                {[5,4,3,2,1].map(p => <option key={p} value={p}>{p} — {PRIORITY_LABEL[p]}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Volunteers Needed</label>
              <input className="form-input" type="number" min="1" max="50" value={form.requiredCount} onChange={e => setForm({...form,requiredCount:e.target.value})} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={loading || !form.name}>
            {loading ? <span className="spinner"/> : task ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reassign Modal ────────────────────────────────────────────────────────────
function ReassignModal({ eventId, vol, tasks, onClose, onDone }) {
  const { addToast } = useToast();
  const [taskId, setTaskId] = useState(vol.taskId || '');
  const [loading, setLoading] = useState(false);
  const save = async () => {
    setLoading(true);
    try {
      await updateEventVolunteer(eventId, vol.userId, { taskId });
      addToast('Volunteer reassigned!', 'success');
      onDone();
    } catch { addToast('Failed to reassign', 'error'); }
    finally { setLoading(false); }
  };
  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth:420 }}>
        <div className="modal-header">
          <h3>Reassign {vol.name}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><Icons.X /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Select New Task</label>
            <select className="form-select" value={taskId} onChange={e => setTaskId(e.target.value)}>
              <option value="">— Unassigned —</option>
              {tasks.map(t => (
                <option key={t.id} value={t.id} disabled={t.assignedVolunteers.length >= t.requiredCount && t.id !== vol.taskId}>
                  {t.name} ({t.assignedVolunteers.length}/{t.requiredCount})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={loading}>{loading ? <span className="spinner"/> : 'Reassign'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Event Control Panel ──────────────────────────────────────────────────
export default function EventControlPanel() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lastMessage } = useSocket();
  const { addToast } = useToast();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddVol, setShowAddVol] = useState(false);
  const [taskModal, setTaskModal] = useState(null);
  const [reassignTarget, setReassignTarget] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [removeTarget, setRemoveTarget] = useState(null);
  const [activeTab, setActiveTab] = useState('tasks');

  const fetchEvent = useCallback(async () => {
    try { const r = await getEvent(id); setEvent(r.data); setEditForm({ name:r.data.name, description:r.data.description, date:r.data.date, time:r.data.time }); }
    catch { addToast('Event not found', 'error'); navigate('/manager'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchEvent(); }, [fetchEvent]);

  useEffect(() => {
    if (lastMessage?.payload?.eventId === id) fetchEvent();
  }, [lastMessage]);

  const saveEdit = async () => {
    try { await updateEvent(id, editForm); addToast('Event updated!', 'success'); setEditMode(false); fetchEvent(); }
    catch { addToast('Failed to update', 'error'); }
  };

  const handleAttendance = async (userId, status) => {
    try { await updateEventVolunteer(id, userId, { attendance: status }); addToast('Attendance marked!', 'success'); fetchEvent(); }
    catch { addToast('Failed', 'error'); }
  };

  const handleRemove = async () => {
    try { await removeEventVolunteer(id, removeTarget.userId); addToast('Volunteer removed', 'info'); setRemoveTarget(null); fetchEvent(); }
    catch { addToast('Failed to remove', 'error'); }
  };

  const handleDeleteTask = async (taskId) => {
    try { await deleteTask(id, taskId); addToast('Task deleted', 'info'); fetchEvent(); }
    catch { addToast('Failed to delete task', 'error'); }
  };

  if (loading) return (
    <AppLayout>
      <Topbar title="Loading…" />
      <div className="page-content">
        <div style={{ display:'grid', gap:'1rem' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:120, borderRadius:'var(--radius)' }} />)}
        </div>
      </div>
    </AppLayout>
  );

  if (!event) return null;

  const totalSlots = event.tasks.reduce((s, t) => s + t.requiredCount, 0);
  const filledSlots = event.tasks.reduce((s, t) => s + t.assignedVolunteers.length, 0);
  const pct = totalSlots ? Math.round((filledSlots / totalSlots) * 100) : 0;

  return (
    <AppLayout>
      <Topbar
        title={event.name}
        subtitle={`${event.date}${event.time ? ' at ' + event.time : ''} · ${event.volunteers.length} volunteers`}
        actions={
          <div className="flex gap-2">
            <button className="btn btn-secondary btn-sm" onClick={() => setEditMode(true)}><Icons.Edit /> Edit</button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddVol(true)}><Icons.UserPlus /> Add Volunteer</button>
          </div>
        }
      />

      <div className="page-content">
        {/* Fill Overview */}
        <div className="card" style={{ marginBottom:'1.5rem' }}>
          <div className="card-body" style={{ display:'flex', alignItems:'center', gap:'2rem', flexWrap:'wrap' }}>
            <div style={{ flex:1, minWidth:200 }}>
              <div className="flex justify-between" style={{ marginBottom:'0.5rem' }}>
                <span style={{ fontSize:'0.875rem', fontWeight:600, color:'var(--text)' }}>Overall Fill Rate</span>
                <span style={{ fontWeight:700, color: pct===100?'var(--success)':pct>0?'var(--warning)':'var(--danger)' }}>{pct}%</span>
              </div>
              <div className="progress-bar" style={{ height:10 }}>
                <div className="progress-fill" style={{ width:`${pct}%`, background: pct===100?'var(--success)':pct>0?'var(--warning)':'var(--danger)' }} />
              </div>
              <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:'0.375rem' }}>{filledSlots}/{totalSlots} slots filled</div>
            </div>
            {[
              { label:'Tasks', value:event.tasks.length },
              { label:'Volunteers', value:event.volunteers.length },
              { label:'Full Tasks', value:event.tasks.filter(t=>taskStatus(t)==='full').length },
              { label:'Empty Tasks', value:event.tasks.filter(t=>taskStatus(t)==='empty').length },
            ].map(s => (
              <div key={s.label} style={{ textAlign:'center' }}>
                <div style={{ fontSize:'1.5rem', fontWeight:800, color:'var(--text)' }}>{s.value}</div>
                <div style={{ fontSize:'0.75rem', color:'var(--text-secondary)', fontWeight:500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2" style={{ marginBottom:'1.5rem', borderBottom:'2px solid var(--border)', paddingBottom:'0' }}>
          {['tasks','volunteers'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                padding:'0.625rem 1.25rem', border:'none', background:'none', cursor:'pointer',
                fontWeight:600, fontSize:'0.9375rem', borderBottom: activeTab===tab ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab===tab ? 'var(--primary)' : 'var(--text-secondary)',
                marginBottom:'-2px', textTransform:'capitalize', transition:'all 0.15s'
              }}>
              {tab === 'tasks' ? `🗂 Tasks (${event.tasks.length})` : `👥 Volunteers (${event.volunteers.length})`}
            </button>
          ))}
        </div>

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div className="flex justify-between items-center">
              <h3>Task List</h3>
              <button className="btn btn-primary btn-sm" onClick={() => setTaskModal('new')}><Icons.Plus /> Add Task</button>
            </div>
            {event.tasks.length === 0 ? (
              <div className="card"><div className="empty-state"><span style={{fontSize:'2rem'}}>🗂</span><p>No tasks yet. Add your first task.</p></div></div>
            ) : event.tasks.map(task => {
              const status = taskStatus(task);
              const borderColor = status==='full'?'var(--success)':status==='partial'?'var(--warning)':'var(--danger)';
              const assigned = event.volunteers.filter(v => v.taskId === task.id);
              return (
                <div key={task.id} className="card" style={{ borderLeft:`4px solid ${borderColor}` }}>
                  <div className="card-body">
                    <div className="flex justify-between items-center" style={{ marginBottom:'0.75rem' }}>
                      <div className="flex items-center gap-3">
                        <h4>{task.name}</h4>
                        <span className={`badge ${PRIORITY_COLOR[task.priority]}`}>{PRIORITY_LABEL[task.priority]}</span>
                        <span className={`badge ${status==='full'?'badge-green':status==='partial'?'badge-yellow':'badge-red'}`}>
                          {assigned.length}/{task.requiredCount} filled
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setTaskModal(task)}><Icons.Edit /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" style={{ color:'var(--danger)' }} onClick={() => handleDeleteTask(task.id)}><Icons.Trash /></button>
                      </div>
                    </div>

                    {task.requiredSkills.length > 0 && (
                      <div className="tag-list" style={{ marginBottom:'0.75rem' }}>
                        {task.requiredSkills.map(s => <span key={s} className="tag">{s}</span>)}
                      </div>
                    )}

                    <div className="progress-bar" style={{ marginBottom:'0.75rem' }}>
                      <div className="progress-fill" style={{ width:`${Math.min(100,(assigned.length/task.requiredCount)*100)}%`, background:borderColor }} />
                    </div>

                    {/* Assigned volunteers chips */}
                    {assigned.length > 0 && (
                      <div className="flex gap-2" style={{ flexWrap:'wrap' }}>
                        {assigned.map(v => (
                          <div key={v.userId} style={{ display:'flex', alignItems:'center', gap:'0.375rem', padding:'0.25rem 0.625rem', background:'var(--surface-2)', borderRadius:'99px', border:'1px solid var(--border)', fontSize:'0.8125rem' }}>
                            <div className="avatar" style={{ width:20, height:20, fontSize:'0.625rem' }}>{v.name?.charAt(0)}</div>
                            <span style={{ fontWeight:500 }}>{v.name}</span>
                            <button className="btn btn-ghost btn-icon" style={{ padding:'0 0.125rem', color:'var(--danger)', fontSize:'0.75rem' }}
                              onClick={() => setReassignTarget(v)}>↔</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Volunteers Tab */}
        {activeTab === 'volunteers' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            <div className="flex justify-between items-center">
              <h3>Volunteers in Event</h3>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddVol(true)}><Icons.UserPlus /> Add Volunteer</button>
            </div>
            {event.volunteers.length === 0 ? (
              <div className="card"><div className="empty-state"><span style={{fontSize:'2rem'}}>🙋</span><p>No volunteers added yet. Add one using their unique code.</p></div></div>
            ) : event.volunteers.map(vol => {
              const task = event.tasks.find(t => t.id === vol.taskId);
              return (
                <div key={vol.userId} className="volunteer-row">
                  <div className="avatar">{vol.name?.charAt(0)}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, color:'var(--text)' }} className="truncate">{vol.name}</div>
                    <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{vol.email}</div>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    {task ? (
                      <span className="badge badge-blue truncate">{task.name}</span>
                    ) : (
                      <span className="badge badge-grey">Unassigned</span>
                    )}
                  </div>
                  {vol.noShowCount > 0 && <span className="badge badge-red">⚠️ {vol.noShowCount}</span>}
                  {/* Attendance */}
                  {vol.attendance ? (
                    <span className={`badge ${vol.attendance==='present'?'badge-green':'badge-red'}`}>
                      {vol.attendance === 'present' ? '✅ Present' : '❌ Absent'}
                    </span>
                  ) : (
                    <div className="flex gap-1">
                      <button className="btn btn-success btn-sm" onClick={() => handleAttendance(vol.userId,'present')} title="Mark Present">✅</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleAttendance(vol.userId,'absent')} title="Mark Absent">❌</button>
                    </div>
                  )}
                  <div className="flex gap-1">
                    <button className="btn btn-secondary btn-sm btn-icon" title="Reassign" onClick={() => setReassignTarget(vol)}><Icons.RefreshCw /></button>
                    <button className="btn btn-ghost btn-sm btn-icon" title="Remove" style={{ color:'var(--danger)' }} onClick={() => setRemoveTarget(vol)}><Icons.Trash /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showAddVol && (
        <AddVolunteerModal eventId={id} event={event}
          onClose={() => setShowAddVol(false)}
          onDone={() => { setShowAddVol(false); fetchEvent(); }} />
      )}

      {taskModal && (
        <TaskModal eventId={id}
          task={taskModal === 'new' ? null : taskModal}
          onClose={() => setTaskModal(null)}
          onDone={() => { setTaskModal(null); fetchEvent(); }} />
      )}

      {reassignTarget && (
        <ReassignModal eventId={id} vol={reassignTarget} tasks={event.tasks}
          onClose={() => setReassignTarget(null)}
          onDone={() => { setReassignTarget(null); fetchEvent(); }} />
      )}

      {removeTarget && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth:400 }}>
            <div className="modal-header">
              <h3>Remove Volunteer</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setRemoveTarget(null)}><Icons.X /></button>
            </div>
            <div className="modal-body">
              <p>Remove <strong>{removeTarget.name}</strong> from this event?</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setRemoveTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleRemove}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {editMode && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h3>Edit Event</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setEditMode(false)}><Icons.X /></button>
            </div>
            <div className="modal-body">
              {[
                { label:'Event Name', key:'name', type:'text' },
                { label:'Description', key:'description', type:'textarea' },
                { label:'Date', key:'date', type:'date' },
                { label:'Time', key:'time', type:'time' },
              ].map(f => (
                <div key={f.key} className="form-group">
                  <label className="form-label">{f.label}</label>
                  {f.type === 'textarea'
                    ? <textarea className="form-input" rows={2} value={editForm[f.key]||''} onChange={e => setEditForm({...editForm,[f.key]:e.target.value})} style={{ resize:'vertical' }} />
                    : <input className="form-input" type={f.type} value={editForm[f.key]||''} onChange={e => setEditForm({...editForm,[f.key]:e.target.value})} />}
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditMode(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
