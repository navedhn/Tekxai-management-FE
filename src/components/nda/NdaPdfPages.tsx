import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore - vite ?url import, resolves to the worker's final asset URL
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Some production static-hosting configs serve .mjs with the wrong
// Content-Type (application/octet-stream instead of a JS type), which
// makes the browser refuse `new Worker(url, {type:'module'})` / dynamic
// import() with a strict MIME-type error ("Setting up fake worker
// failed..."). A plain fetch() is NOT subject to that same script-MIME
// enforcement, so this fetches the worker source as text and re-wraps it
// in a Blob with an explicit, correct type — the browser trusts the
// Blob's declared type, not whatever Content-Type the original request
// carried. This is handed to pdf.js as `workerSrc` (rather than us
// constructing the Worker/PDFWorker ourselves) so the library still
// creates and handshakes with the worker using its own internal
// protocol — a hand-built `PDFWorker({ port })` skipped that handshake
// and pdf.js would silently decide the worker was unusable, itself
// falling back to a "fake worker" that re-fetches the *original*
// (wrong-MIME) URL via dynamic import() and failed the exact same way.
// Falls back to the plain workerSrc path (pdf.js's own default
// behavior) if this ever fails for an unrelated reason, so a network
// hiccup here doesn't break the whole viewer.
let worker_src_promise: Promise<string> | null = null;
function get_or_create_worker_src(): Promise<string> {
  if (!worker_src_promise) {
    worker_src_promise = fetch(pdfWorkerUrl)
      .then((res) => res.text())
      .then((code) => URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
  }
  return worker_src_promise;
}

export interface PdfPageInfo {
  pageNumber: number;
  widthPt: number;
  heightPt: number;
}

// Renders every page of a PDF (given a URL) as a stack of canvases, and
// hands the caller back each page's element + its true PDF-point size via
// onPagesReady — field x/y/width/height are persisted in PDF points
// (top-left origin), so this component's job is purely "give me pixels per
// point" for whichever zoom level it rendered at; overlay math (in the
// callers below) converts between the two using that ratio, never
// hardcoding a scale.
export default function NdaPdfPages({
  fileUrl,
  scale = 1.4,
  onPagesReady,
  renderPageOverlay,
}: {
  fileUrl: string;
  scale?: number;
  onPagesReady?: (pages: PdfPageInfo[]) => void;
  renderPageOverlay?: (page: PdfPageInfo, pixelsPerPoint: number) => React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<PdfPageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        try {
          pdfjsLib.GlobalWorkerOptions.workerSrc = await get_or_create_worker_src();
        } catch {
          // Blob re-wrap failed for some unrelated reason (e.g. the
          // fetch itself failed) — fall back to pdf.js's own default
          // workerSrc-based loading rather than breaking the viewer.
          pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        }
        const task = pdfjsLib.getDocument(fileUrl);
        const pdf = await task.promise;
        if (cancelled) return;
        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = '';
        const pageInfos: PdfPageInfo[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const unscaled = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.display = 'block';
          canvas.style.marginBottom = '12px';
          canvas.dataset.page = String(i);
          const ctx = canvas.getContext('2d');
          if (ctx) await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
          container.appendChild(canvas);
          pageInfos.push({ pageNumber: i, widthPt: unscaled.width, heightPt: unscaled.height });
        }
        if (!cancelled) {
          setPages(pageInfos);
          onPagesReady?.(pageInfos);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to render PDF');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl, scale]);

  const pixels_per_point = scale; // canvas rendered at `scale` * 1pt-per-unit viewport

  return (
    <div className="relative">
      {loading && <div className="text-sm text-gray-400 py-8 text-center">Loading document…</div>}
      {error && <div className="text-sm text-red-500 py-8 text-center">{error}</div>}
      <div ref={containerRef} className="pdf-pages" />
      {!loading && !error && pages.map((p) => (
        <PageOverlayPortal key={p.pageNumber} page={p} pixelsPerPoint={pixels_per_point} containerRef={containerRef} render={renderPageOverlay} />
      ))}
    </div>
  );
}

// Positions an absolutely-positioned overlay div exactly over its
// corresponding <canvas> page — computed from that canvas's own
// offsetTop/offsetLeft within the shared container, so it stays correct
// regardless of margin/stacking changes above.
function PageOverlayPortal({
  page, pixelsPerPoint, containerRef, render,
}: {
  page: PdfPageInfo;
  pixelsPerPoint: number;
  containerRef: React.RefObject<HTMLDivElement>;
  render?: (page: PdfPageInfo, pixelsPerPoint: number) => React.ReactNode;
}) {
  const [rect, setRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const canvas = container.querySelector<HTMLCanvasElement>(`canvas[data-page="${page.pageNumber}"]`);
    if (!canvas) return;
    setRect({ top: canvas.offsetTop, left: canvas.offsetLeft, width: canvas.offsetWidth, height: canvas.offsetHeight });
  }, [page, containerRef]);

  if (!rect || !render) return null;
  return (
    <div
      className="absolute"
      style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, pointerEvents: 'none' }}
    >
      <div style={{ pointerEvents: 'auto', width: '100%', height: '100%', position: 'relative' }}>
        {render(page, pixelsPerPoint)}
      </div>
    </div>
  );
}
