import { useLab } from '../state/LabContext';
import { ConverterList } from '../components/ConverterSelector';
import { ParameterPanel } from '../components/ParameterPanel';
import { PerformancePanel } from '../components/PerformancePanel';
import { SimStage } from '../components/SimStage';
import { EduCards, TheoryPanel } from '../components/Educational';

export default function Simulator() {
  const { id, computed } = useLab();
  return (
    <div className="mx-auto w-full max-w-[1680px] px-4 py-5 flex flex-col gap-4 xl:grid xl:grid-cols-[250px_minmax(0,1fr)_350px] xl:items-start">
      <aside className="xl:sticky xl:top-[72px]"><ConverterList /></aside>
      <main className="min-w-0 flex flex-col gap-4 order-3 xl:order-none">
        <SimStage />
        <EduCards topology={id} />
        <TheoryPanel topology={id} />
        <div className="xl:hidden"><PerformancePanel /></div>
        {computed && computed.warnings.length > 0 && null}
      </main>
      <aside className="flex flex-col gap-4 order-2 xl:order-none xl:sticky xl:top-[72px] xl:max-h-[calc(100vh-88px)] xl:overflow-y-auto">
        <ParameterPanel />
        <div className="hidden xl:block"><PerformancePanel /></div>
      </aside>
    </div>
  );
}
