import React, { useEffect, useRef, useState } from 'react';

// Hand-rolled canvas signature pad — no drawing/signature library exists in
// this app's package.json, and a small pointer-events canvas is simpler
// than pulling one in for what's fundamentally "draw a line, export a PNG."
// Shared between the HR/employee sign flow (detail.tsx) and the public
// candidate signing page so both capture the exact same data shape: a
// base64 PNG data URL, handed to the backend's existing `signature_data`
// field (already flexible enough to hold either a typed name or an image —
// no schema change needed on that side).
export default function SignaturePad({
  onChange,
  height = 160,
}: {
  onChange: (dataUrl: string | null) => void;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const hasStroke = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Backing-store scaling so strokes stay crisp on high-DPI screens
    // without the drawn line looking blurry or offset from the cursor.
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#111827';
    }
  }, []);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawing.current = true;
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    hasStroke.current = true;
    if (isEmpty) setIsEmpty(false);
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (hasStroke.current && canvasRef.current) {
      onChange(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasStroke.current = false;
    setIsEmpty(true);
    onChange(null);
  };

  return (
    <div>
      <div className="relative border border-gray-200 rounded-xl bg-white overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height }}
          className="touch-none cursor-crosshair"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
        {isEmpty && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-gray-300 font-medium">
            Draw your signature here
          </span>
        )}
      </div>
      <div className="flex justify-end mt-2">
        <button
          type="button"
          onClick={clear}
          disabled={isEmpty}
          className="text-xs font-semibold text-gray-400 hover:text-gray-600 disabled:opacity-30"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
