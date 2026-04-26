import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { signup as apiSignup, getMe } from '../utils/api';
import { auth, googleProvider } from '../config/firebase';
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';

const ALL_SKILLS = ['first-aid','communication','logistics','tech-support','coordination','driving','cooking','photography','teaching','security'];

export default function Signup() {
  const [form, setForm] = useState({ name:'', email:'', password:'', role:'volunteer', skills:[] });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const toggleSkill = (s) =>
    setForm((f) => ({ ...f, skills: f.skills.includes(s) ? f.skills.filter((x) => x !== s) : [...f.skills, s] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, form.email, form.password);
      await apiSignup(form);
      const res = await getMe();
      login(res.data);
      addToast(`Account created! Welcome, ${res.data.name}!`, 'success');
      window.location.href = res.data.role === 'manager' ? '/manager' : '/volunteer';
    } catch (err) {
      addToast(err.message || 'Signup failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    try {
      const userCred = await signInWithPopup(auth, googleProvider);
      const name = userCred.user.displayName || form.name || userCred.user.email.split('@')[0];
      await apiSignup({ ...form, name, email: userCred.user.email });
      const res = await getMe();
      login(res.data);
      addToast(`Account created! Welcome, ${res.data.name}!`, 'success');
      window.location.href = res.data.role === 'manager' ? '/manager' : '/volunteer';
    } catch (err) {
      if (err.response?.status === 409) {
        addToast('An account already exists for this Google email. Please sign in.', 'error');
        auth.signOut();
      } else {
        addToast(err.message || 'Google Sign-Up failed', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <div className="auth-header">
          <div className="auth-logo">
            <span style={{ color:'#fff', fontWeight:800, fontSize:'1.25rem' }}>EVS</span>
          </div>
          <h1 style={{ fontSize:'1.75rem' }}>Create account</h1>
          <p style={{ marginTop:'0.5rem' }}>Join Event Volunteer System</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          {/* Role Selection */}
          <div className="form-group">
            <label className="form-label">I am a…</label>
            <div className="role-selector">
              {[
                { value:'manager', icon:'👑', label:'Manager' },
                { value:'volunteer', icon:'🙋', label:'Volunteer' },
              ].map((r) => (
                <div
                  key={r.value}
                  className={`role-option ${form.role === r.value ? 'selected' : ''}`}
                  onClick={() => setForm({ ...form, role: r.value })}
                >
                  <div className="role-icon">{r.icon}</div>
                  <div className="role-name">{r.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Full name</label>
            <input className="form-input" type="text" placeholder="Your name"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="you@example.com"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="Min. 6 characters"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
          </div>

          {/* Skills (volunteer only) */}
          {form.role === 'volunteer' && (
            <div className="form-group">
              <label className="form-label">Your skills (select all that apply)</label>
              <div className="tag-list">
                {ALL_SKILLS.map((s) => (
                  <button
                    key={s} type="button"
                    className={`tag ${form.skills.includes(s) ? '' : ''}`}
                    style={form.skills.includes(s) ? { background:'var(--primary)', color:'#fff', border:'1px solid var(--primary)' } : {}}
                    onClick={() => toggleSkill(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button className="btn btn-primary btn-lg w-full" type="submit" disabled={loading} style={{ marginTop:'0.5rem' }}>
            {loading ? <span className="spinner" /> : 'Create Account'}
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', margin: '0.5rem 0' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }}></div>
            <span style={{ padding: '0 1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>or</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }}></div>
          </div>

          <button 
            type="button" 
            className="btn btn-secondary btn-lg w-full" 
            disabled={loading} 
            onClick={handleGoogleSignUp}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: '#fff', color: '#333', border: '1px solid #ddd' }}
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '18px', height: '18px' }} />
            Sign up with Google
          </button>
        </form>

        <p style={{ textAlign:'center', marginTop:'1.5rem', fontSize:'0.875rem', color:'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color:'var(--primary)', fontWeight:600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
