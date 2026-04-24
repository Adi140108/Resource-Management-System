import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createEvent } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import AppLayout from '../../components/AppLayout';
import Topbar from '../../components/Topbar';
import { Icons } from '../../components/Icons';

export default function CreateEvent() {
  const [form, setForm] = useState({ name:'', description:'', date:'', time:'' });
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await createEvent(form);
      addToast('Event created successfully!', 'success');
      navigate(`/manager/events/${r.data.id}`);
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to create event', 'error');
    } finally { setLoading(false); }
  };

  return (
    <AppLayout>
      <Topbar title="Create New Event" subtitle="Set up your volunteer event" />
      <div className="page-content" style={{ maxWidth:720 }}>
        <div className="card">
          <div className="card-header">
            <h3>Event Details</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Event Name *</label>
                <input className="form-input" type="text" placeholder="e.g. Community Health Fair"
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={3} placeholder="Describe what this event is about…"
                  value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  style={{ resize:'vertical' }}
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input className="form-input" type="date"
                    value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Time</label>
                  <input className="form-input" type="time"
                    value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                </div>
              </div>

              <div style={{ display:'flex', gap:'0.75rem', justifyContent:'flex-end', paddingTop:'0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => navigate('/manager')}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                  {loading ? <span className="spinner" /> : <><Icons.Plus /> Create Event</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
