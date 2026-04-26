import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icons } from './Icons';

const managerNav = [
  { label: 'Dashboard', to: '/manager', icon: Icons.Grid },
  { label: 'Events', to: '/manager/events', icon: Icons.Calendar },
  { label: 'Volunteers', to: '/manager/volunteers', icon: Icons.Users },
  { label: 'Live Monitor', to: '/manager/monitor', icon: Icons.Activity },
];

const volunteerNav = [
  { label: 'My Dashboard', to: '/volunteer', icon: Icons.Grid },
];

export default function Sidebar() {
  const { user, logout, isManager } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const nav = isManager ? managerNav : volunteerNav;

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:99 }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile topbar menu button */}
      <button
        className="btn btn-ghost btn-icon"
        style={{ position:'fixed',top:'1rem',left:'1rem',zIndex:200,display:'none' }}
        id="sidebar-toggle"
        onClick={() => setOpen(true)}
      >
        <Icons.Menu />
      </button>

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon">VG</div>
          <div>
            <div className="logo-text">Volunteer Grid</div>
            <div className="logo-sub">{isManager ? '👑 Manager' : '👤 Volunteer'}</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {nav.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/manager' || to === '/volunteer'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="sidebar-footer">
          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'0.75rem' }}>
            <div className="avatar" style={{ width:36, height:36, fontSize:'0.75rem' }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow:'hidden' }}>
              <div style={{ fontSize:'0.875rem', fontWeight:600, color:'var(--text)' }} className="truncate">{user?.name}</div>
              <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }} className="truncate">{user?.email}</div>
            </div>
          </div>
          <button className="btn btn-secondary w-full btn-sm" onClick={handleLogout}>
            <Icons.LogOut /> Sign out
          </button>
        </div>
      </aside>

      <style>{`
        @media (max-width: 1024px) { #sidebar-toggle { display: flex !important; } }
      `}</style>
    </>
  );
}
