import { Link, useParams } from 'react-router-dom';
import { THEORY_SECTIONS } from '../content/theoryPages';
import { Tex } from '../components/Tex';
import { VOLTAGE_CONVENTIONS } from '../content/educational';

export default function Theory() {
  const { section } = useParams();
  const sec = THEORY_SECTIONS.find((s) => s.id === section) ?? THEORY_SECTIONS[0];
  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-8 grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
      <nav className="md:sticky md:top-[72px] self-start flex md:flex-col gap-1.5 flex-wrap">
        {THEORY_SECTIONS.map((s) => (
          <Link key={s.id} to={`/theory/${s.id}`} className="chip" data-on={s.id === sec.id} style={{ height: 'auto', padding: '7px 10px', borderRadius: 10 }}>{s.title}</Link>
        ))}
      </nav>
      <article className="panel">
        <div className="panel-body prose-lab">
          <div className="eyebrow">Theory</div>
          <h1 className="mt-1" style={{ fontFamily: 'var(--font-display)', fontSize: 26 }}>{sec.title}</h1>
          {sec.intro.map((p, i) => <p key={i}>{p}</p>)}
          {sec.blocks.map((b) => (
            <div key={b.heading}>
              <h3>{b.heading}</h3>
              {b.paragraphs?.map((p, i) => <p key={i}>{p}</p>)}
              {b.bullets && <ul>{b.bullets.map((x) => <li key={x}>{x}</li>)}</ul>}
              {b.equations && <div className="grid gap-2">{b.equations.map((e) => <div key={e.label} className="eq-card"><div className="unit mb-1">{e.label}</div><Tex tex={e.tex} block /></div>)}</div>}
            </div>
          ))}
          <div className="banner banner-info mt-6"><span>{VOLTAGE_CONVENTIONS}</span></div>
        </div>
      </article>
    </div>
  );
}
