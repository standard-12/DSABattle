"use client"

import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import { LivingGraphEngine } from "@/lib/living-graph/engine"

/**
 * Full-page animated background: "The Living Graph".
 * Fixed behind the landing page content; the engine handles resize,
 * visibility pause, adaptive quality, and reduced motion on its own.
 */
export function LivingGraphBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<LivingGraphEngine | null>(null)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    if (!canvasRef.current) return
    const engine = new LivingGraphEngine(canvasRef.current)
    engineRef.current = engine
    engine.start()
    return () => {
      engine.destroy()
      engineRef.current = null
    }
  }, [])

  // Re-read the CSS theme tokens whenever the theme flips. next-themes
  // toggles the `.dark` class before this effect runs, so the engine
  // picks up the new custom-property values.
  useEffect(() => {
    engineRef.current?.setTheme()
  }, [resolvedTheme])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-svh w-screen"
    />
  )
}
