import { useSocket } from '../context/SocketContext';

export default function Topbar({ title, subtitle, actions }) {
  const { connected } = useSocket();

  return (
    <div className="topbar">
      <div>
        <h2 style={{ fontSize:'1.25rem', fontWeight:700, color:'var(--text)', letterSpacing:'-0.02em' }}>{title}</h2>
        {subtitle && <p style={{ fontSize:'0.8125rem', color:'var(--text-secondary)', marginTop:'0.125rem' }}>{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {/* Live indicator */}
        <div className="flex items-center gap-2" style={{ fontSize:'0.75rem', color: connected ? 'var(--success)' : 'var(--text-muted)', fontWeight:500 }}>
          <div className={connected ? 'live-dot' : ''} style={{ width:8, height:8, borderRadius:'50%', background: connected ? 'var(--success)' : 'var(--border)' }} />
          {connected ? 'Live' : 'Connecting…'}
        </div>
        {actions}
      </div>
    </div>
  );
}
