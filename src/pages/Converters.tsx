import { ConverterGrid } from '../components/ConverterSelector';
export default function Converters() {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8">
      <div className="eyebrow">Step 1</div>
      <h1 className="m-0 mt-1 mb-6" style={{ fontFamily: 'var(--font-display)', fontSize: 30 }}>Select a converter</h1>
      <ConverterGrid />
    </div>
  );
}
