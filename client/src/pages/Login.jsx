import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getMe } from '../utils/api';
import { auth, googleProvider } from '../config/firebase';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';

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
      await signInWithEmailAndPassword(auth, form.email, form.password);
      const res = await getMe();
      login(res.data);
      addToast(`Welcome back, ${res.data.name}!`, 'success');
      window.location.href = res.data.role === 'manager' ? '/manager' : '/volunteer';
    } catch (err) {
      addToast(err.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      const res = await getMe();
      login(res.data);
      addToast(`Welcome back, ${res.data.name}!`, 'success');
      window.location.href = res.data.role === 'manager' ? '/manager' : '/volunteer';
    } catch (err) {
      if (err.response?.status === 404) {
        addToast('No account found for this Google email. Please sign up.', 'error');
        auth.signOut();
      } else {
        addToast(err.message || 'Google Sign-In failed', 'error');
      }
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
          
          <div style={{ display: 'flex', alignItems: 'center', margin: '1rem 0' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }}></div>
            <span style={{ padding: '0 1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>or</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }}></div>
          </div>

          <button 
            type="button" 
            className="btn btn-secondary btn-lg w-full" 
            disabled={loading} 
            onClick={handleGoogleSignIn}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: '#fff', color: '#333', border: '1px solid #ddd' }}
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '18px', height: '18px' }} />
            Sign in with Google
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
