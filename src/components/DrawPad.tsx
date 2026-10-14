import { Redo2, RotateCcw, Undo2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export interface StrokeInput {
  points: { x: number; y: number }[]
  raw: { x: number; y: number }[]
}

export function normalizeLocalPoint(p: { x: number; y: number }, width: number, height: number) {
  return {
    x: Math.min(1, Math.max(0, p.x / Math.max(1, width))),
    y: Math.min(1, Math.max(0, p.y / Math.max(1, height)))
  }
}

export default function DrawPad({
  onStrokesChange
}: {
  onStrokesChange: (strokes: { x: number; y: number }[][]) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [strokes, setStrokes] = useState<StrokeInput[]>([])
  const [undoStack, setUndoStack] = useState<StrokeInput[][]>([])
  const [redoStack, setRedoStack] = useState<StrokeInput[][]>([])

  useEffect(() => {
    onStrokesChange(strokes.map((s) => s.points))
  }, [strokes, onStrokesChange])

  function redraw(next: StrokeInput[]) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    const w = Math.max(80, rect.width)
    const h = Math.max(80, rect.height)
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = '#FBF6EC'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#2B211A'
    ctx.lineWidth = 7
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const stroke of next) {
      if (stroke.raw.length === 1) {
        ctx.beginPath()
        ctx.arc(stroke.raw[0].x, stroke.raw[0].y, ctx.lineWidth / 2, 0, Math.PI * 2)
        ctx.fill()
        continue
      }
      if (stroke.raw.length < 2) continue
      ctx.beginPath()
      ctx.moveTo(stroke.raw[0].x, stroke.raw[0].y)
      for (const p of stroke.raw) ctx.lineTo(p.x, p.y)
      ctx.stroke()
    }
  }

  useEffect(() => {
    redraw(strokes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes])

  function toNorm(p: { x: number; y: number }): { x: number; y: number } {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return normalizeLocalPoint(p, rect.width, rect.height)
  }

  function rawOf(clientX: number, clientY: number): { x: number; y: number } {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  function pointerDown(e: React.PointerEvent) {
    e.preventDefault()
    canvasRef.current?.setPointerCapture(e.pointerId)
    drawing.current = true
    const raw = rawOf(e.clientX, e.clientY)
    const next = [...strokes, { points: [toNorm(raw)], raw: [raw] }]
    setUndoStack((s) => [...s, strokes])
    setRedoStack([])
    setStrokes(next)
  }

  function pointerMove(e: React.PointerEvent) {
    if (!drawing.current) return
    const raw = rawOf(e.clientX, e.clientY)
    setStrokes((prev) => {
      if (!prev.length) return prev
      const last = prev[prev.length - 1]
      const nlast = { ...last, points: [...last.points, toNorm(raw)], raw: [...last.raw, raw] }
      return [...prev.slice(0, -1), nlast]
    })
  }

  function endStroke() {
    drawing.current = false
  }

  function undo() {
    if (!strokes.length) return
    setRedoStack((s) => [...s, strokes])
    setUndoStack((s) => s.slice(0, -1))
    const prev = undoStack[undoStack.length - 1] || []
    setStrokes(prev)
  }

  function redo() {
    if (!redoStack.length) return
    setUndoStack((s) => [...s, strokes])
    const next = redoStack[redoStack.length - 1]
    setRedoStack((s) => s.slice(0, -1))
    setStrokes(next)
  }

  function clear() {
    setUndoStack((s) => [...s, strokes])
    setRedoStack([])
    setStrokes([])
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl border border-line bg-paper">
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: 320, touchAction: 'none', cursor: 'crosshair' }}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={endStroke}
          onPointerLeave={endStroke}
          aria-label="手写甲骨文画板"
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button className="chip" type="button" onClick={clear}>
          <RotateCcw className="h-3.5 w-3.5" /> 清空
        </button>
        <button className="chip" type="button" onClick={undo} disabled={!strokes.length}>
          <Undo2 className="h-3.5 w-3.5" /> 撤销
        </button>
        <button className="chip" type="button" onClick={redo} disabled={!redoStack.length}>
          <Redo2 className="h-3.5 w-3.5" /> 重做
        </button>
        <span className="text-[11px] text-muted">建议居中书写，保持字形比例完整</span>
      </div>
    </div>
  )
}
