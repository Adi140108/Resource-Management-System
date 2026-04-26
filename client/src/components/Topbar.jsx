export default function Topbar({ title, subtitle }) {
  return (
    <div className="topbar">
      <div>
        <h2 style={{ fontSize:'1.25rem', fontWeight:700, color:'var(--text)', letterSpacing:'-0.02em' }}>{title}</h2>
        {subtitle && <p style={{ fontSize:'0.8125rem', color:'var(--text-secondary)', marginTop:'0.125rem' }}>{subtitle}</p>}
      </div>
    </div>
  );
}
