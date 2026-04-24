import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { signup as apiSignup } from '../utils/api';

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
      const res = await apiSignup(form);
      login(res.data.user, res.data.token);
      addToast(`Account created! Welcome, ${res.data.user.name}!`, 'success');
      navigate(res.data.user.role === 'manager' ? '/manager' : '/volunteer');
    } catch (err) {
      addToast(err.response?.data?.error || 'Signup failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <div className="auth-header">
          <div className="auth-logo">
            <span style={{ color:'#fff', fontWeight:800, fontSize:'1.25rem' }}>VG</span>
          </div>
          <h1 style={{ fontSize:'1.75rem' }}>Create account</h1>
          <p style={{ marginTop:'0.5rem' }}>Join Volunteer Grid</p>
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
        </form>

        <p style={{ textAlign:'center', marginTop:'1.5rem', fontSize:'0.875rem', color:'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color:'var(--primary)', fontWeight:600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
