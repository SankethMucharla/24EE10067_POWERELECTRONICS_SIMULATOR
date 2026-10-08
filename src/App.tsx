import { useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useLab } from './state/LabContext';
import Home from './pages/Home';
import Simulator from './pages/Simulator';
import Converters from './pages/Converters';
import Theory from './pages/Theory';
import Performance from './pages/Performance';
import Compare from './pages/Compare';
import Help from './pages/Help';

const NAV: [string, string][] = [
  ['/', 'Home'], ['/simulator', 'Simulator'], ['/converters', 'Converters'], ['/theory/diode', 'Theory'],
  ['/performance', 'Performance'], ['/compare', 'Compare'], ['/help', 'Help'],
];

function Header() {
  const { theme, toggleTheme } = useLab();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  return (
    <header className="sticky top-0 z-40" style={{ background: 'color-mix(in srgb, var(--bg) 88%, transparent)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border)' }}>
      <div className="mx-auto max-w-[1680px] px-4 h-14 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden><path d="M2 16 Q8 2 16 16 T30 16" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" /></svg>
          <span>24EE10067_PESIMULATOR</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1 ml-4" aria-label="Main">
          {NAV.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `px-3 py-1.5 rounded-lg text-[13.5px] ${isActive || (label === 'Theory' && loc.pathname.startsWith('/theory')) ? 'font-semibold' : ''}`}
              style={({ isActive }) => ({ color: isActive || (label === 'Theory' && loc.pathname.startsWith('/theory')) ? 'var(--accent)' : 'var(--muted)' })}>{label}</NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button className="btn btn-sm btn-icon" onClick={toggleTheme} aria-label="Toggle dark / light mode" title="Toggle theme">{theme === 'dark' ? '☀' : '☾'}</button>
          <div className="md:hidden"><button className="btn btn-sm btn-icon" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>☰</button></div>
        </div>
      </div>
      {open && (
        <nav className="md:hidden px-4 pb-3 grid gap-1" aria-label="Mobile">
          {NAV.map(([to, label]) => <Link key={to} to={to} onClick={() => setOpen(false)} className="btn btn-sm justify-start">{label}</Link>)}
        </nav>
      )}
    </header>
  );
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/simulator" element={<Simulator />} />
          <Route path="/converters" element={<Converters />} />
          <Route path="/theory/:section" element={<Theory />} />
          <Route path="/theory" element={<Theory />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/help" element={<Help />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </div>
      <footer className="px-4 py-6 text-center unit" style={{ borderTop: '1px solid var(--border)' }}>
        24EE10067_PESIMULATOR — AC→DC rectifier virtual laboratory · ideal-switch numerical model
      </footer>
    </div>
  );
}
