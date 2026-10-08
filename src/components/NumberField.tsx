import { useEffect, useId, useRef, useState } from 'react';

interface Props {
  label: string;
  unit?: string;
  value: number;
  onChange: (v: number) => void;
  error?: string;
  disabled?: boolean;
  step?: number;
  hint?: string;
}

export function NumberField({ label, unit, value, onChange, error, disabled, step = 1, hint }: Props) {
  const id = useId();
  const [txt, setTxt] = useState(Number.isFinite(value) ? String(value) : '');
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setTxt(Number.isFinite(value) ? String(+value.toPrecision(10)) : '');
  }, [value]);
  const commit = (s: string) => {
    setTxt(s);
    const n = s.trim() === '' ? NaN : Number(s);
    onChange(n);
  };
  return (
    <div>
      <label htmlFor={id} className="field-label">
        <span>{label}</span>
        {unit && <span className="unit">{unit}</span>}
      </label>
      <input
        id={id}
        className={`input${error ? ' err' : ''}`}
        inputMode="decimal"
        value={txt}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? id + '-err' : undefined}
        onFocus={() => (focused.current = true)}
        onBlur={() => {
          focused.current = false;
          setTxt(Number.isFinite(value) ? String(+value.toPrecision(10)) : txt);
        }}
        onChange={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const cur = Number.isFinite(value) ? value : 0;
            const mul = e.shiftKey ? 10 : 1;
            const nv = +(cur + (e.key === 'ArrowUp' ? 1 : -1) * step * mul).toPrecision(10);
            commit(String(nv));
          }
        }}
      />
      {hint && !error && <div className="unit mt-1">{hint}</div>}
      {error && (
        <div id={id + '-err'} className="err-msg" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
