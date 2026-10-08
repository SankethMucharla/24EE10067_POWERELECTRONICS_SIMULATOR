import { useMemo } from 'react';
import katex from 'katex';

export function Tex({ tex, block = false }: { tex: string; block?: boolean }) {
  const html = useMemo(
    () => katex.renderToString(tex, { displayMode: block, throwOnError: false, strict: false, output: 'html' }),
    [tex, block],
  );
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
