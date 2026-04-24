import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { login as apiLogin } from '../utils/api';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const fill = (preset) => setForm(preset);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiLogin(form);
      login(res.data.user, res.data.token);
      addToast(`Welcome back, ${res.data.user.name}!`, 'success');
      navigate(res.data.user.role === 'manager' ? '/manager' : '/volunteer');
    } catch (err) {
      addToast(err.response?.data?.error || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Header */}
        <div className="auth-header">
          <div className="auth-logo">
            <span style={{ color:'#fff', fontWeight:800, fontSize:'1.25rem' }}>VG</span>
          </div>
          <h1 style={{ fontSize:'1.75rem' }}>Welcome back</h1>
          <p style={{ marginTop:'0.5rem' }}>Sign in to Volunteer Grid</p>
        </div>

        {/* Demo Presets */}
        <div style={{ marginBottom:'1.5rem' }}>
          <p style={{ fontSize:'0.75rem', fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.5rem' }}>Quick Demo Login</p>
          <div className="flex gap-2" style={{ flexWrap:'wrap' }}>
            {[
              { label:'👑 Manager', email:'manager@vg.com', password:'password123' },
              { label:'👤 Jordan', email:'jordan@vg.com', password:'password123' },
              { label:'👤 Sam', email:'sam@vg.com', password:'password123' },
              { label:'👤 Riley', email:'riley@vg.com', password:'password123' },
            ].map((p) => (
              <button key={p.email} className="btn btn-secondary btn-sm" onClick={() => fill({ email: p.email, password: p.password })}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input
              className="form-input"
              type="email" placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password" placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <button className="btn btn-primary btn-lg w-full" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign:'center', marginTop:'1.5rem', fontSize:'0.875rem', color:'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color:'var(--primary)', fontWeight:600 }}>Create one</Link>
        </p>
      </div>
    </div>
  );
}
