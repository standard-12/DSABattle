/**
 * DSABattle — "The Living Graph" animated background engine.
 *
 * An abstract visualization of algorithms at work: a force-directed graph
 * that continuously reorganizes itself, data packets riding its edges, and
 * periodic *real* BFS searches whose frontiers pulse outward level by level
 * before the discovered path ignites — occasionally as a dual orange-vs-blue
 * race (a 1v1 battle).
 *
 * Layers (back → front), each with its own scroll-parallax factor:
 *   0. ambient gradient light        (0.02)
 *   1. far mesh — sparse depth layer (0.03)
 *   2. the living graph              (0.07)
 *   3. packets                       (0.07)
 *   4. search choreography           (0.07)
 *   5. depth dust                    (0.12)
 *
 * Pure Canvas 2D + vanilla TS. Theme colors are read from the site's CSS
 * custom properties at runtime, so the canvas always matches the active
 * light/dark theme. Adaptive quality drops the far mesh + halves packets
 * when FPS dips. Pauses when the tab is hidden. Honors reduced motion.
 */

// ---------------------------------------------------------------------------
// Config — tune everything from here
// ---------------------------------------------------------------------------
export const GRAPH_CONFIG = {
  /** approx. px² of world area per node (lower = denser) */
  areaPerNode: 26000,
  maxNodes: 96,
  mobileNodes: 46,
  mobileBreakpoint: 720,
  /** edge connect distance (px, clamped by viewport width) */
  linkDistance: 170,
  mobileLinkDistance: 120,
  /** world height as a multiple of viewport height (graph under the fold) */
  worldHeightFactor: 1.7,

  // motion
  homeSpring: 0.0015,
  damping: 0.92,
  /** ms between single-node home relocations (local reorganization) */
  relocEveryMs: [1800, 3600] as const,
  relocGlideMs: 4000,

  // mouse
  mouseRepelRadius: 150,
  mouseRepelForce: 0.05,
  mouseBrightenRadius: 180,

  // packets
  packetCount: 26,
  packetCountMobile: 14,
  packetCountLowQuality: 10,
  packetSpeedPx: [45, 95] as const,

  // search choreography
  searchEveryMs: [9000, 14000] as const,
  /** every Nth search event is a dual orange-vs-blue race */
  dualRaceEvery: 3,
  minPathDepth: 4,
  maxPathHops: 10,
  frontierPulseGapMs: 90,
  edgeIgniteGapMs: 120,
  pathHoldMs: 1600,
  pathFadeMs: 1300,

  // parallax factors per layer
  parallax: { ambient: 0.02, mesh: 0.03, graph: 0.07, dust: 0.12 },

  // depth layers
  meshNodes: 30,
  meshNodesMobile: 16,
  dustCount: 14,

  /** rolling-average frame time (ms) that switches quality down / up */
  fpsDownThresholdMs: 24, // < ~42 fps
  fpsUpThresholdMs: 18, // > ~55 fps
} as const

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------
interface RGB {
  r: number
  g: number
  b: number
}

interface GraphNode {
  x: number
  y: number
  vx: number
  vy: number
  hx: number // "home" position the node springs toward
  hy: number
  r: number
  phase: number // breathing phase
  orbA: number // home wander orbit radii
  orbB: number
  orbSa: number // orbit speeds
  orbSb: number
  relocT: number // home relocation animation start (0 = idle)
  relocFx: number
  relocFy: number
  relocTx: number
  relocTy: number
}

interface Edge {
  a: number
  b: number
  d: number
  alpha: number
}

interface MeshNode {
  hx: number
  hy: number
  x: number
  y: number
  a: number
  b: number
  sa: number
  sb: number
  ph: number
}

interface Dust {
  x: number
  y: number
  r: number
  s: number
  ph: number
}

interface Packet {
  from: number
  to: number
  t: number
  speed: number
  prev: number
  hue: 'ember' | 'blue'
}

interface Search {
  t0: number
  depth: number[]
  maxDepth: number
  path: number[]
  color: 'ember' | 'blue'
}

type ThemeMode = 'dark' | 'light'

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
const rand = (a: number, b: number) => a + Math.random() * (b - a)
const randIn = (r: readonly [number, number]) => rand(r[0], r[1])
const smooth = (t: number) => t * t * (3 - 2 * t)
const clamp01 = (t: number) => Math.max(0, Math.min(1, t))
const TWO_PI = Math.PI * 2

function dist2(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx
  const dy = ay - by
  return dx * dx + dy * dy
}

const rgba = (c: RGB, a: number) => `rgba(${c.r},${c.g},${c.b},${a})`

/**
 * Resolve a CSS color (incl. oklch) to RGB by painting a 1×1 canvas and
 * reading the pixel back — robust across browsers regardless of how
 * fillStyle serializes.
 */
function resolveCssColor(css: string, fallback: RGB): RGB {
  try {
    const c = document.createElement('canvas')
    c.width = c.height = 1
    const x = c.getContext('2d', { willReadFrequently: true })
    if (!x) return fallback
    x.fillStyle = css
    x.fillRect(0, 0, 1, 1)
    const d = x.getImageData(0, 0, 1, 1).data
    if (d[3] === 0) return fallback // color failed to parse
    return { r: d[0], g: d[1], b: d[2] }
  } catch {
    return fallback
  }
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------
export class LivingGraphEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D

  private W = 0
  private H = 0
  private worldH = 0
  private linkDist: number = GRAPH_CONFIG.linkDistance

  private nodes: GraphNode[] = []
  private edges: Edge[] = []
  private adjScratch: number[][] = [] // reused adjacency buffer
  private mesh: MeshNode[] = []
  private dust: Dust[] = []
  private packets: Packet[] = [] // pooled: trimmed/refilled toward target
  private searches: Search[] = []

  private nextReloc = 0
  private nextSearch = 4000
  private searchCount = 0

  private mouseX = -1e4
  private mouseY = -1e4
  private mouseActive = false

  private colors: { ember: RGB; blue: RGB; ink: RGB } = {
    ember: { r: 240, g: 112, b: 60 },
    blue: { r: 91, g: 127, b: 240 },
    ink: { r: 242, g: 242, b: 242 },
  }
  private dark = true

  private quality: 'high' | 'low' = 'high'
  private frameAcc = 0
  private frameN = 0

  private rafId = 0
  private running = false
  private destroyed = false
  private last = 0
  private reduceMotion = false

  private detachFns: Array<() => void> = []

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('LivingGraphEngine: 2d context unavailable')
    this.ctx = ctx

    this.reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    this.resize()
    this.readThemeColors()

    // --- listeners (all detached in destroy()) ---
    const onResize = () => {
      this.resize()
      if (this.reduceMotion) this.renderStaticFrame()
    }
    const onPointerMove = (e: PointerEvent) => {
      this.mouseX = e.clientX
      this.mouseY = e.clientY
      this.mouseActive = true
    }
    const onPointerLeave = () => {
      this.mouseActive = false
    }
    const onVisibility = () => {
      if (document.hidden) this.pause()
      else this.start()
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('pointerleave', onPointerLeave)
    document.addEventListener('visibilitychange', onVisibility)
    this.detachFns.push(
      () => window.removeEventListener('resize', onResize),
      () => window.removeEventListener('pointermove', onPointerMove),
      () => document.removeEventListener('pointerleave', onPointerLeave),
      () => document.removeEventListener('visibilitychange', onVisibility)
    )
  }

  // -------------------------------------------------------------- lifecycle
  start() {
    if (this.destroyed || this.running) return
    if (this.reduceMotion) {
      this.renderStaticFrame()
      return
    }
    this.running = true
    this.last = performance.now()
    this.rafId = requestAnimationFrame(this.frame)
  }

  pause() {
    this.running = false
    cancelAnimationFrame(this.rafId)
  }

  destroy() {
    this.pause()
    this.destroyed = true
    for (const detach of this.detachFns) detach()
    this.detachFns = []
  }

  /** Re-read theme colors from CSS custom properties (call on theme switch). */
  setTheme() {
    this.readThemeColors()
    if (this.reduceMotion) this.renderStaticFrame()
  }

  /** Manually trigger the dual-race battle moment (e.g. for demos). */
  triggerBattleRace() {
    this.searchCount = GRAPH_CONFIG.dualRaceEvery - 1
    this.nextSearch = 0
  }

  // ------------------------------------------------------------------ theme
  private readThemeColors() {
    const s = getComputedStyle(document.documentElement)
    this.dark = document.documentElement.classList.contains('dark')
    const ember = this.dark
      ? { r: 240, g: 112, b: 60 }
      : { r: 222, g: 90, b: 36 }
    const blue = this.dark
      ? { r: 91, g: 127, b: 240 }
      : { r: 58, g: 95, b: 208 }
    const ink = this.dark
      ? { r: 242, g: 242, b: 242 }
      : { r: 27, g: 28, b: 34 }
    this.colors = {
      ember: resolveCssColor(s.getPropertyValue('--primary').trim(), ember),
      blue: resolveCssColor(s.getPropertyValue('--accent').trim(), blue),
      ink: resolveCssColor(s.getPropertyValue('--foreground').trim(), ink),
    }
  }

  // ----------------------------------------------------------------- sizing
  private resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.W = window.innerWidth
    this.H = window.innerHeight
    this.canvas.width = this.W * dpr
    this.canvas.height = this.H * dpr
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.worldH = this.H * GRAPH_CONFIG.worldHeightFactor
    this.buildGraph()
    this.buildMesh()
    this.buildDust()
  }

  // ------------------------------------------------------- layer 2: graph
  private buildGraph() {
    const cfg = GRAPH_CONFIG
    this.nodes = []
    const isMobile = this.W < cfg.mobileBreakpoint
    this.linkDist = isMobile
      ? cfg.mobileLinkDistance
      : Math.min(cfg.linkDistance, this.W / 9)
    const target = isMobile
      ? cfg.mobileNodes
      : Math.min(cfg.maxNodes, Math.round((this.W * this.worldH) / cfg.areaPerNode))

    // jittered grid → even coverage with an organic look
    const cols = Math.max(1, Math.ceil(Math.sqrt((target * this.W) / this.worldH)))
    const rows = Math.max(1, Math.ceil(target / cols))
    const cw = this.W / cols
    const ch = this.worldH / rows
    for (let r = 0; r < rows && this.nodes.length < target; r++) {
      for (let c = 0; c < cols && this.nodes.length < target; c++) {
        const hx = (c + 0.5) * cw + rand(-cw * 0.38, cw * 0.38)
        const hy = (r + 0.5) * ch + rand(-ch * 0.38, ch * 0.38)
        this.nodes.push({
          x: hx,
          y: hy,
          vx: 0,
          vy: 0,
          hx,
          hy,
          r: rand(1.3, 2.6),
          phase: rand(0, TWO_PI),
          orbA: rand(8, 26),
          orbB: rand(8, 26),
          orbSa: rand(0.05, 0.16),
          orbSb: rand(0.05, 0.16),
          relocT: 0,
          relocFx: 0,
          relocFy: 0,
          relocTx: 0,
          relocTy: 0,
        })
      }
    }
    this.adjScratch = this.nodes.map(() => [])
    this.packets.length = 0
    this.searches.length = 0
  }

  /** Recompute edges each frame (n ≤ 96 → O(n²) is trivially cheap). */
  private computeEdges() {
    this.edges.length = 0
    const L = this.linkDist
    const L2 = L * L
    const n = this.nodes
    for (let i = 0; i < n.length; i++) {
      for (let j = i + 1; j < n.length; j++) {
        const d2 = dist2(n[i].x, n[i].y, n[j].x, n[j].y)
        if (d2 < L2) {
          const d = Math.sqrt(d2)
          this.edges.push({ a: i, b: j, d, alpha: smooth(1 - d / L) })
        }
      }
    }
  }

  /** Continuous local reorganization: glide one node's home to a new spot. */
  private maybeRelocate(t: number) {
    if (t < this.nextReloc) return
    this.nextReloc = t + randIn(GRAPH_CONFIG.relocEveryMs)
    const n = this.nodes[(Math.random() * this.nodes.length) | 0]
    if (!n) return
    n.relocT = t
    n.relocFx = n.hx
    n.relocFy = n.hy
    n.relocTx = Math.max(20, Math.min(this.W - 20, n.hx + rand(-130, 130)))
    n.relocTy = Math.max(20, Math.min(this.worldH - 20, n.hy + rand(-130, 130)))
  }

  private stepGraph(t: number, dt: number, mouseWX: number, mouseWY: number) {
    const cfg = GRAPH_CONFIG
    this.maybeRelocate(t)
    const ts = t / 1000
    for (const n of this.nodes) {
      // home relocation easing
      if (n.relocT) {
        const p = clamp01((t - n.relocT) / cfg.relocGlideMs)
        const e = smooth(p)
        n.hx = n.relocFx + (n.relocTx - n.relocFx) * e
        n.hy = n.relocFy + (n.relocTy - n.relocFy) * e
        if (p >= 1) n.relocT = 0
      }
      // slow orbital wander around home + spring + damping
      const wx = n.hx + Math.cos(ts * n.orbSa + n.phase) * n.orbA
      const wy = n.hy + Math.sin(ts * n.orbSb + n.phase * 1.7) * n.orbB
      n.vx += (wx - n.x) * cfg.homeSpring * dt
      n.vy += (wy - n.y) * cfg.homeSpring * dt
      // gentle mouse repulsion
      if (this.mouseActive) {
        const dx = n.x - mouseWX
        const dy = n.y - mouseWY
        const d2 = dx * dx + dy * dy
        const R = cfg.mouseRepelRadius
        if (d2 < R * R && d2 > 0.01) {
          const d = Math.sqrt(d2)
          const f = (1 - d / R) * cfg.mouseRepelForce * dt
          n.vx += (dx / d) * f
          n.vy += (dy / d) * f
        }
      }
      n.vx *= cfg.damping
      n.vy *= cfg.damping
      n.x += n.vx
      n.y += n.vy
    }
    this.computeEdges()
  }

  // ---------------------------------------------------- layer 1: far mesh
  private buildMesh() {
    this.mesh = []
    const count =
      this.W < GRAPH_CONFIG.mobileBreakpoint
        ? GRAPH_CONFIG.meshNodesMobile
        : GRAPH_CONFIG.meshNodes
    for (let i = 0; i < count; i++) {
      this.mesh.push({
        hx: rand(0, this.W),
        hy: rand(0, this.worldH),
        x: 0,
        y: 0,
        a: rand(14, 40),
        b: rand(14, 40),
        sa: rand(0.02, 0.07),
        sb: rand(0.02, 0.07),
        ph: rand(0, 7),
      })
    }
  }

  private stepMesh(t: number) {
    const ts = t / 1000
    for (const m of this.mesh) {
      m.x = m.hx + Math.cos(ts * m.sa + m.ph) * m.a
      m.y = m.hy + Math.sin(ts * m.sb + m.ph) * m.b
    }
  }

  // -------------------------------------------------------- layer 5: dust
  private buildDust() {
    this.dust = []
    for (let i = 0; i < GRAPH_CONFIG.dustCount; i++) {
      this.dust.push({
        x: rand(0, this.W),
        y: rand(0, this.worldH),
        r: rand(1.5, 3.4),
        s: rand(2, 7),
        ph: rand(0, 7),
      })
    }
  }

  // ----------------------------------------------------- layer 3: packets
  private packetTarget() {
    if (this.quality === 'low') return GRAPH_CONFIG.packetCountLowQuality
    return this.W < GRAPH_CONFIG.mobileBreakpoint
      ? GRAPH_CONFIG.packetCountMobile
      : GRAPH_CONFIG.packetCount
  }

  private neighborsOf(i: number): number[] {
    const out: number[] = []
    for (const e of this.edges) {
      if (e.a === i) out.push(e.b)
      else if (e.b === i) out.push(e.a)
    }
    return out
  }

  private spawnPacket(): Packet | null {
    const from = (Math.random() * this.nodes.length) | 0
    const nb = this.neighborsOf(from)
    if (!nb.length) return null
    return {
      from,
      to: nb[(Math.random() * nb.length) | 0],
      t: 0,
      speed: randIn(GRAPH_CONFIG.packetSpeedPx),
      prev: -1,
      hue: Math.random() < 0.7 ? 'blue' : 'ember',
    }
  }

  private stepPackets(dt: number) {
    const target = this.packetTarget()
    while (this.packets.length < target) {
      const p = this.spawnPacket()
      if (!p) break
      this.packets.push(p)
    }
    if (this.packets.length > target) this.packets.length = target

    for (const p of this.packets) {
      const a = this.nodes[p.from]
      const b = this.nodes[p.to]
      const len = Math.max(12, Math.sqrt(dist2(a.x, a.y, b.x, b.y)))
      p.t += (p.speed * dt) / 1000 / len
      if (p.t >= 1) {
        // arrived → continue along a random edge (avoid immediate backtrack)
        const nb = this.neighborsOf(p.to).filter((i) => i !== p.from)
        p.prev = p.from
        p.from = p.to
        p.t = 0
        if (nb.length) {
          p.to = nb[(Math.random() * nb.length) | 0]
        } else {
          const any = this.neighborsOf(p.from)
          if (any.length) p.to = any[0]
          else Object.assign(p, this.spawnPacket() ?? p)
        }
      }
    }
  }

  // ---------------------------------------------------- layer 4: searches
  private buildAdjacency(): number[][] {
    for (const list of this.adjScratch) list.length = 0
    for (const e of this.edges) {
      this.adjScratch[e.a].push(e.b)
      this.adjScratch[e.b].push(e.a)
    }
    return this.adjScratch
  }

  /** Run a real BFS on the current graph and stage its animation. */
  private launchSearch(
    t: number,
    sourceHint: number | undefined,
    color: 'ember' | 'blue',
    delay: number
  ): boolean {
    const cfg = GRAPH_CONFIG
    const adj = this.buildAdjacency()
    const src =
      sourceHint !== undefined && sourceHint >= 0
        ? sourceHint
        : (Math.random() * this.nodes.length) | 0
    if (!adj[src] || !adj[src].length) return false

    const depth = new Array<number>(this.nodes.length).fill(-1)
    const parent = new Array<number>(this.nodes.length).fill(-1)
    depth[src] = 0
    const q = [src]
    let far = src
    for (let qi = 0; qi < q.length; qi++) {
      const u = q[qi]
      if (depth[u] > depth[far]) far = u
      for (const v of adj[u]) {
        if (depth[v] === -1) {
          depth[v] = depth[u] + 1
          parent[v] = u
          q.push(v)
        }
      }
    }
    if (depth[far] < cfg.minPathDepth) return false

    let path: number[] = []
    for (let v = far; v !== -1; v = parent[v]) path.push(v)
    path.reverse()
    if (path.length > cfg.maxPathHops) path = path.slice(0, cfg.maxPathHops)

    this.searches.push({ t0: t + delay, depth, maxDepth: depth[far], path, color })
    return true
  }

  private scheduleSearches(t: number) {
    const cfg = GRAPH_CONFIG
    if (t < this.nextSearch) return
    this.searchCount++
    const dual = this.searchCount % cfg.dualRaceEvery === 0
    if (dual) {
      // two frontiers race from opposite halves — the battle moment
      const left = this.nodes.findIndex((n) => n.x < this.W * 0.3)
      const right = this.nodes.findIndex((n) => n.x > this.W * 0.7)
      const ok1 = this.launchSearch(t, left >= 0 ? left : undefined, 'ember', 0)
      const ok2 = this.launchSearch(t, right >= 0 ? right : undefined, 'blue', 380)
      if (!ok1 && !ok2) {
        this.nextSearch = t + 1500 // graph too fragmented — retry soon
        return
      }
    } else if (!this.launchSearch(t, undefined, 'ember', 0)) {
      this.nextSearch = t + 1500
      return
    }
    this.nextSearch = t + randIn(cfg.searchEveryMs)
  }

  // =========================================================== rendering
  private drawAmbient(t: number, scroll: number) {
    const { ctx, W, H } = this
    const ts = t / 1000
    const oy = -scroll * GRAPH_CONFIG.parallax.ambient
    const R = Math.max(W, H)
    const blobs = [
      {
        c: this.colors.ember,
        x: W * (0.3 + 0.06 * Math.sin(ts * 0.11)),
        y: H * 0.18 + oy + 20 * Math.sin(ts * 0.07),
        r: R * 0.5,
        a: this.dark ? 0.085 : 0.05,
      },
      {
        c: this.colors.blue,
        x: W * (0.74 + 0.05 * Math.cos(ts * 0.09)),
        y: H * 0.55 + oy + 26 * Math.cos(ts * 0.06),
        r: R * 0.55,
        a: this.dark ? 0.075 : 0.045,
      },
    ]
    for (const b of blobs) {
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r)
      g.addColorStop(0, rgba(b.c, b.a))
      g.addColorStop(1, rgba(b.c, 0))
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
    }
  }

  private drawMesh(scroll: number) {
    if (this.quality === 'low') return
    const { ctx } = this
    const oy = -scroll * GRAPH_CONFIG.parallax.mesh
    const R = this.linkDist * 2.1
    const R2 = R * R
    const a0 = this.dark ? 0.05 : 0.07
    const col = this.dark ? this.colors.blue : this.colors.ink
    ctx.lineWidth = 0.6
    for (let i = 0; i < this.mesh.length; i++) {
      for (let j = i + 1; j < this.mesh.length; j++) {
        const d2 = dist2(this.mesh[i].x, this.mesh[i].y, this.mesh[j].x, this.mesh[j].y)
        if (d2 < R2) {
          ctx.strokeStyle = rgba(col, a0 * (1 - Math.sqrt(d2) / R))
          ctx.beginPath()
          ctx.moveTo(this.mesh[i].x, this.mesh[i].y + oy)
          ctx.lineTo(this.mesh[j].x, this.mesh[j].y + oy)
          ctx.stroke()
        }
      }
    }
  }

  private drawGraph(t: number, scroll: number, mouseWX: number, mouseWY: number) {
    const { ctx } = this
    const oy = -scroll * GRAPH_CONFIG.parallax.graph
    const base = this.dark ? this.colors.blue : this.colors.ink
    const BR = GRAPH_CONFIG.mouseBrightenRadius

    ctx.lineWidth = 0.8
    for (const e of this.edges) {
      const a = this.nodes[e.a]
      const b = this.nodes[e.b]
      let alpha = e.alpha * 0.16
      if (this.mouseActive) {
        const mx = (a.x + b.x) / 2 - mouseWX
        const my = (a.y + b.y) / 2 - mouseWY
        const md2 = mx * mx + my * my
        if (md2 < BR * BR) alpha += e.alpha * 0.3 * (1 - Math.sqrt(md2) / BR)
      }
      ctx.strokeStyle = rgba(base, alpha)
      ctx.beginPath()
      ctx.moveTo(a.x, a.y + oy)
      ctx.lineTo(b.x, b.y + oy)
      ctx.stroke()
    }

    const ts = t / 1000
    for (const n of this.nodes) {
      const r = n.r * (1 + 0.18 * Math.sin(ts * 0.8 + n.phase))
      ctx.fillStyle = rgba(base, this.dark ? 0.5 : 0.45)
      ctx.beginPath()
      ctx.arc(n.x, n.y + oy, r, 0, TWO_PI)
      ctx.fill()
    }
  }

  private drawPackets(scroll: number) {
    const { ctx } = this
    const oy = -scroll * GRAPH_CONFIG.parallax.graph
    if (this.dark) ctx.globalCompositeOperation = 'lighter'
    for (const p of this.packets) {
      const a = this.nodes[p.from]
      const b = this.nodes[p.to]
      const x = a.x + (b.x - a.x) * p.t
      const y = a.y + (b.y - a.y) * p.t + oy
      const len = Math.max(1, Math.sqrt(dist2(a.x, a.y, b.x, b.y)))
      const tx = (b.x - a.x) / len
      const ty = (b.y - a.y) / len
      const col = p.hue === 'ember' ? this.colors.ember : this.colors.blue
      // comet trail
      const g = ctx.createLinearGradient(x - tx * 14, y - ty * 14, x, y)
      g.addColorStop(0, rgba(col, 0))
      g.addColorStop(1, rgba(col, this.dark ? 0.55 : 0.5))
      ctx.strokeStyle = g
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(x - tx * 14, y - ty * 14)
      ctx.lineTo(x, y)
      ctx.stroke()
      // head
      ctx.fillStyle = rgba(col, this.dark ? 0.9 : 0.8)
      ctx.beginPath()
      ctx.arc(x, y, 1.6, 0, TWO_PI)
      ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'
  }

  private glowLine(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    col: RGB,
    alpha: number,
    w: number
  ) {
    const { ctx } = this
    ctx.strokeStyle = rgba(col, alpha * 0.22)
    ctx.lineWidth = w * 4
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
    ctx.stroke()
    ctx.strokeStyle = rgba(col, alpha)
    ctx.lineWidth = w
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
    ctx.stroke()
  }

  private drawSearches(t: number, scroll: number) {
    const cfg = GRAPH_CONFIG
    const { ctx } = this
    const oy = -scroll * cfg.parallax.graph
    if (this.dark) ctx.globalCompositeOperation = 'lighter'

    for (let si = this.searches.length - 1; si >= 0; si--) {
      const s = this.searches[si]
      const el = t - s.t0
      if (el < 0) continue
      const col = s.color === 'ember' ? this.colors.ember : this.colors.blue
      const frontierDone = s.maxDepth * cfg.frontierPulseGapMs
      const igniteStart = frontierDone + 250
      const igniteDone = igniteStart + (s.path.length - 1) * cfg.edgeIgniteGapMs
      const total = igniteDone + cfg.pathHoldMs + cfg.pathFadeMs
      if (el > total) {
        this.searches.splice(si, 1)
        continue
      }
      const fade =
        el > igniteDone + cfg.pathHoldMs
          ? 1 - (el - igniteDone - cfg.pathHoldMs) / cfg.pathFadeMs
          : 1

      // frontier: each reached node flashes a ring at its depth-timed moment
      if (el < frontierDone + 700) {
        for (let i = 0; i < this.nodes.length; i++) {
          if (s.depth[i] < 0) continue
          const pt = el - s.depth[i] * cfg.frontierPulseGapMs
          if (pt < 0 || pt > 620) continue
          const p = pt / 620
          const n = this.nodes[i]
          ctx.strokeStyle = rgba(col, (1 - p) * (this.dark ? 0.32 : 0.3))
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.arc(n.x, n.y + oy, 3 + p * 17, 0, TWO_PI)
          ctx.stroke()
        }
      }

      // ignition: path edges light sequentially, current edge grows
      if (el >= igniteStart) {
        const prog = (el - igniteStart) / cfg.edgeIgniteGapMs
        for (let i = 0; i < s.path.length - 1; i++) {
          const seg = clamp01(prog - i)
          if (seg <= 0) break
          const a = this.nodes[s.path[i]]
          const b = this.nodes[s.path[i + 1]]
          const ex = a.x + (b.x - a.x) * seg
          const ey = a.y + (b.y - a.y) * seg
          this.glowLine(a.x, a.y + oy, ex, ey + oy, col, 0.8 * fade, 1.5)
          ctx.fillStyle = rgba(col, 0.95 * fade)
          ctx.beginPath()
          ctx.arc(a.x, a.y + oy, 2.6, 0, TWO_PI)
          ctx.fill()
          // target reached → white-hot core + halo
          if (seg >= 1 && i === s.path.length - 2) {
            ctx.fillStyle = rgba(this.colors.ink, 0.9 * fade)
            ctx.beginPath()
            ctx.arc(b.x, b.y + oy, 3.2, 0, TWO_PI)
            ctx.fill()
            ctx.strokeStyle = rgba(col, 0.5 * fade)
            ctx.lineWidth = 1.2
            ctx.beginPath()
            ctx.arc(b.x, b.y + oy, 7 + 3 * Math.sin(t / 180), 0, TWO_PI)
            ctx.stroke()
          }
        }
      }
    }
    ctx.globalCompositeOperation = 'source-over'
  }

  private drawDust(t: number, scroll: number) {
    const { ctx } = this
    const oy = -scroll * GRAPH_CONFIG.parallax.dust
    const ts = t / 1000
    for (const d of this.dust) {
      const y = (((d.y - ts * d.s) % this.worldH) + this.worldH) % this.worldH
      ctx.fillStyle = rgba(this.colors.ink, this.dark ? 0.05 : 0.06)
      ctx.beginPath()
      ctx.arc(d.x + 6 * Math.sin(ts * 0.3 + d.ph), y + oy, d.r, 0, TWO_PI)
      ctx.fill()
    }
  }

  // -------------------------------------------------- adaptive quality
  private trackFPS(dt: number) {
    this.frameAcc += dt
    this.frameN++
    if (this.frameN >= 90) {
      const avg = this.frameAcc / this.frameN
      if (avg > GRAPH_CONFIG.fpsDownThresholdMs && this.quality === 'high') {
        this.quality = 'low'
      } else if (avg < GRAPH_CONFIG.fpsUpThresholdMs && this.quality === 'low') {
        this.quality = 'high'
      }
      this.frameAcc = 0
      this.frameN = 0
    }
  }

  // ---------------------------------------------------------- main loop
  private frame = (t: number) => {
    if (!this.running) return
    this.rafId = requestAnimationFrame(this.frame)
    const dt = Math.min(50, t - this.last || 16)
    this.last = t
    this.trackFPS(dt)

    const scroll = window.scrollY
    // cursor position projected into the graph layer's world space
    const mouseWX = this.mouseX
    const mouseWY = this.mouseY + scroll * GRAPH_CONFIG.parallax.graph

    this.stepGraph(t, dt, mouseWX, mouseWY)
    this.stepMesh(t)
    this.stepPackets(dt)
    this.scheduleSearches(t)

    const { ctx, W, H } = this
    ctx.clearRect(0, 0, W, H)
    this.drawAmbient(t, scroll)
    this.drawMesh(scroll)
    this.drawGraph(t, scroll, mouseWX, mouseWY)
    this.drawPackets(scroll)
    this.drawSearches(t, scroll)
    this.drawDust(t, scroll)
  }

  /** Reduced motion: one calm static frame — graph + ambient, no animation. */
  private renderStaticFrame() {
    this.stepGraph(1000, 16, -1e4, -1e4)
    this.stepMesh(1000)
    const { ctx, W, H } = this
    ctx.clearRect(0, 0, W, H)
    this.drawAmbient(1000, 0)
    this.drawMesh(0)
    this.drawGraph(1000, 0, -1e4, -1e4)
    this.drawDust(1000, 0)
  }
}
