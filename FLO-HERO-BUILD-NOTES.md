# flo — Hero: Flow-Field Waves (SHIPPED 2026-10-25)

The homepage hero is now a three.js flow-field, per *Hero Direction — Flow-Field
Waves* in Notion. Everything below the horizontal rule is the earlier
"exploding neuron" / particle-strand planning, kept because the reasoning about
mobile, reduced motion and not-baking-text-into-canvas still applies — but the
composition it describes is no longer what ships.

## What ships

| | |
|---|---|
| Markup | `index.html` → `<section id="hero">` |
| Engine | `assets/hero-flowfield.js` (ES module) |
| Library | `assets/vendor/three.module.min.js` + `three.core.min.js`, r0.180.0, vendored |
| Fallback | inline `<svg class="hero-static">` in the markup |

Deep navy `#000d3a` ground (CSS gradients, not GL), electric blue `#046ad4`
ribbons, teal/cyan `#8ffbec` crests. One `THREE.Points` cloud, one custom
shader, additive blending, no bloom pass.

## The things that were not obvious

**Author on the screen plane, then scale by distance.** The composition is
defined at `z = 0` and every particle is multiplied out by `(camZ - z) / camZ`.
Without that, far ribbons shrink toward the centre and the whole thing stops
reading as a set of parallel waves. Depth then only changes size and brightness,
which is what you actually want from it.

**Lane spacing has to beat the scatter inside a lane.** The first pass had
ribbons 0.19 world units apart with ±0.30 of jitter inside each one, which
renders as a cloud of fog. Spacing now comes from the frustum
(`uSpread = halfH * 1.30`) and the core scatter is ±0.028.

**Three kinds of particle, not one.** The line itself (dense, tight, small), a
few bright travellers (~3%), and a thin layer of wide dim mist (~11%) whose only
job is to be the halo a bloom chain would otherwise render. Mist needs its own
fragment falloff — reuse the tight core profile on a big sprite and you get a
big *dot*, which is the speckle the mist was meant to prevent.

**The dark corner runs along x, not along the diagonal.** The ribbons climb as
they travel right, so a ramp that darkened high `y` cancelled the very corner it
was supposed to light. `uShield` is now almost pure x in landscape: left dark for
the headline, right lit where the waves gather.

**Portrait is a different composition, not a squeezed one.** On a phone the copy
owns the full width, so the stack bias, the ramp and its edges all change
(`uBias`, `uRamp`), putting the lit band across the lower half instead of a
strip behind the buttons. Same ribbons, same palette, same motion — 966 points
instead of 23,100, and no pointer parallax.

**Hand off from the static frame late.** `hero-live` is added at
`uReveal > 0.55`, not on the first rendered frame. Swapping immediately leaves a
beat where the static waves have faded and the live ones have barely started —
worst on exactly the slow devices that can least afford an empty hero.

## Mobile, iPhone, dual-screen

- `100dvh` / `100svh` / `100vh` ladder, so Safari's collapsing toolbar never clips it.
- `viewport-fit=cover` plus `env(safe-area-inset-*)` on all four sides: no
  headline or CTA under the notch, Dynamic Island or home indicator.
- 390px is the standard phone check. 430px and short-landscape have their own rules.
- Dual-screen: `horizontal-viewport-segments` / `spanning` queries keep the copy
  wholly on one pane. `env(viewport-segment-*)` carries fallbacks, so it is inert
  everywhere else.
- DPR capped (1.75 phone / 2.0 desktop). No hover-dependent anything; the hero is
  ambient and never gated.
- Paused when off screen or when the tab hides. Context loss falls back to the
  static frame instead of a black rectangle.
- `prefers-reduced-motion` gets a single static wave frame **and never downloads
  three.js at all** — the import is behind the media query and a WebGL probe.
- The `h1` is real HTML. Nothing in the canvas carries the message.

## Art-direction hook

`window.__floHero.uniforms` is live. The render is a pure function of them, so
any moment can be held still and judged:

```js
__floHero.uniforms.uReveal.value = 1;   // skip the draw-in
__floHero.uniforms.uTime.value   = 6;   // hold a frame
```

---

# flo — Hero Rebuild ("Exploding Neuron") — Strategy & Build Notes

Planning doc. Nothing built yet. Companion to `FLO-WAY-BUILD-NOTES.md` (the `/flow/`
scroll experience) and `FLO-VIDEO-BUILD-NOTES.md` (the code-rendered explainer).
Same brand system, third surface.

**Status:** strategy agreed in principle, creative direction revised once (see §2).
Not started. No code touched.

---

## 1. The ask

Phil, 2026-08-02: iterate the homepage hero into *"an exploding neuron composition,
something that resembles intelligence in motion"* — per the slogan. Asked whether
Higgsfield (generate stills → compile to video) is the right production route, and
how any of it behaves on mobile.

Then, on the first strategy pass: **"while I agree we have a neural network, it's
cheapy, looks like a constellation map and I can have just about any AI model render
the same. That's where I was hoping some sort of creativity came into play."**

That second note is the actual brief. The bar is *not* "better choreography of the
existing dots." It's a composition that could not have been produced by prompting a
generic model, because it encodes what flo does.

---

## 2. Why the current hero reads as a constellation

`index.html:973-1201` is a competent particle-network engine — drifting nodes, edges
that form/dissolve, pulses along edges, cursor + tap reactivity, IntersectionObserver
and visibility guards, `prefers-reduced-motion` static fallback. The engineering is
fine. The **visual vocabulary** is the problem, and it's four specific things:

1. **Uniform nodes.** Every particle is the same primitive at (near) the same size.
   No hierarchy, so the eye finds no subject — exactly how a star field reads.
2. **Euclidean edges.** `if (dist < threshold) drawLine()`. Connections encode
   *proximity*, not relationship. This is the single biggest tell. A constellation
   map is literally "nearby bright things, joined by lines." Zero semantics.
3. **Additive glow on near-black.** `globalCompositeOperation` bloom over `#060D1F`
   is the default look of every WebGL/canvas demo since 2014.
4. **No z-axis.** Everything on one plane at one focal depth. Flat.

Any model will reproduce all four, because all four are what "particle network hero"
means as a prompt. Fixing the choreography (the detonation arc from pass 1) improves
the *timing* but leaves all four intact. Hence the pushback — it was correct.

---

## 3. The concept: **the neuron is made of the work**

One line: *the particles are not dots — they are fragments of the busywork, and the
lattice they resolve into is the system that eats it.*

### 3a. Why this is the right idea

It is the only version that is **uncopyable**, because it requires knowing what the
business does. It also restates the entire flo pitch — "busywork in, done work out" —
as pure motion, with no copy. And it's continuous with the two motion pieces already
shipped: Act 1 of the explainer (admin chips fly in, never settle, collapse to a
point) and `/flow/`'s living-blueprint lattice. Three surfaces, one motion language.

### 3b. The four layers

**Layer 1 — Artifact shards (replaces "nodes").**
The particles are tiny rendered fragments of real work product: a calendar cell, an
invoice line, a form field, an SMS bubble, a chart bar, an email row, a checkbox, a
receipt strip, a phone-call chip. Roughly 10–14 sprites, drawn **once** to an
offscreen atlas at init, then blitted.

- At rest / far depth they are 3–6px and read as *texture* — a glowing organic mass.
- Mid-detonation, as they pass near camera, they scale up and are legible for
  ~150–250ms. The viewer catches "invoice… intake form… missed call…" subliminally.
- Docked into the final lattice they shrink back to texture.

This directly fixes tells **#1** (hierarchy — shards have varied silhouette, size,
weight) and **#2** (the shards *mean* something, so the composition is about
something).

**Layer 2 — Dendrites, not distance-lines.**
Real neurons are branching morphology: a soma with dendritic arbors that taper,
bifurcate, and vary in thickness. Grow them with **space colonization** (standard
tree-growth algorithm, seeded PRNG so it's deterministic). Draw with **variable
stroke width** — thick at the root, hairline at the tips.

Tapered, rooted, hierarchical branches cannot read as a constellation, because
constellations have no root and no taper. This kills tell **#2** properly: edges now
encode *parentage*, not proximity.

Reveal them by stroke-dash draw-on, not opacity fade — same technique as the rules in
the explainer video.

**Layer 3 — Real depth.**
Three discrete depth planes with perspective scale, parallax, and **pre-blurred sprite
atlases** for the near and far planes (cheap fake DOF — blurring per-sprite at runtime
is not affordable). Near-plane shards drift fast and soft; far plane is slow, small,
dim. Kills tell **#4**.

**Layer 4 — Signal traffic as the ambient state.**
Once settled, the *structure* mostly recedes and what stays visible is the **firing** —
action potentials racing the dendrites leaving decaying phosphor trails, long-exposure
light-painting rather than star map. The graph is implied by its traffic. This is far
more "intelligence" than "here is a graph," and it's the cheapest frame to hold for
minutes at a time.

### 3c. Render treatment (matters as much as the geometry)

The *look* is half the fix. Additive-glow-on-dark is tell **#3** and it survives any
amount of clever geometry if the compositing doesn't change.

- **Selective bloom.** One downsampled offscreen canvas, blurred, composited back with
  `'lighter'` — bloom the signals and the soma, *not* everything. Uniform bloom is the
  demo look.
- **Dark strokes in the foreground.** Near-plane dendrites drawn *darker* than the
  background, not brighter. Instant depth, instantly un-generic.
- **Grain + vignette grade.** Already solved in `video/flo-explainer/tokens.css` —
  lift it.
- **Slight chromatic aberration** at frame edges only.
- **Higgsfield haze plate underneath** (see §5) — volumetric bloom and particulate
  depth are the things canvas genuinely cannot fake.

### 3d. Beat structure

Fires **once per page load** (not on every scroll-back — IntersectionObserver already
gates start/stop; add a `hasPlayed` flag). Total ~5.5s to ambient.

| t | beat |
|---|---|
| 0.0–0.5 | **Void.** One soma, alone, in the negative space right of the headline. Breathing. |
| 0.5–1.5 | **Growth.** Dendrites draw outward by space colonization, three levels of bifurcation, tapering. |
| 1.5–2.4 | **Load.** Artifact shards stream *inward* along the dendrites and accumulate at the soma. It over-fills. This is the "drowning in admin" beat, and it is what earns the explosion. |
| 2.4–3.4 | **Detonation.** The soma ruptures. ~140 shards fling outward on eased trajectories with motion trails, scaling up through the near plane — legible for a beat — then away. Peak chaos ~2.9s. |
| 3.4–5.2 | **Resolution.** The shrapnel *decelerates and docks* into a clean orthogonal lattice — the system. Not a scatter-to-nothing. **This is the money beat**; it's the entire pitch. |
| 5.2→ | **Ambient.** Hand off to signal traffic (Layer 4) + the existing cursor/tap reactivity. |

`prefers-reduced-motion` renders the **settled lattice** (end state), not the void.

---

## 4. Is it doable? Yes. Where the risk actually is.

Nothing here needs WebGL, a library, or a framework. Canvas 2D + an offscreen atlas.
Honest per-piece assessment:

| piece | difficulty | notes |
|---|---|---|
| Artifact sprite atlas | **easy, tedious** | 10–14 tiny sprites drawn with canvas primitives at init. The tedium *is* the moat. |
| Space-colonization dendrites | **medium** | Well-documented algorithm. Precompute at load (~5–15ms), then it's a static draw. Seeded PRNG — no `Math.random()`. |
| Variable-width tapered strokes | **medium** | Canvas 2D has no variable stroke. Draw as filled quads/triangle strips along the spline. |
| Fake DOF | **easy** | 3 planes, pre-blur near/far atlases once at init. Standard trick. |
| Selective bloom | **medium** | Downsample → blur → composite `'lighter'`. Reduce or skip on mobile. |
| Detonation choreography | **easy** | It's easing curves. The existing engine already has the update loop. |
| Docking into the lattice | **medium-hard** | Getting deceleration to feel *intentional* rather than "physics ran out" is the hardest bit of the whole build, and it's the beat that carries the message. Expect iteration here. |

**The real risks, in order:**

1. **The docking beat.** If resolution reads as "the animation stopped" instead of
   "the system took over," the concept fails and the rest doesn't save it.
2. **Shard legibility is a knife-edge.** Too readable = busy and gimmicky. Too subtle =
   we built an expensive constellation. Tune on real hardware, not a desktop monitor.
3. **Perf at detonation peak** — see §6.
4. **Scope.** This is meaningfully larger than a tweak. Realistically a full build
   session, plus a tuning pass on the docking beat.

**Fallback if the shards don't land:** Layers 2+3+4 (dendrites, depth, signal traffic)
already clear the "any AI could render this" bar on their own. Layer 1 is the ambitious
part and can be dropped without collapsing the build. Build in that order.

---

## 5. Higgsfield — narrow, deliberate role

Prior decision (`FLO-WAY-BUILD-NOTES.md` §2/§3) was to skip it on render cost;
`scroll-world` needs a paid account. That holds **for the composition**.

**Do not make Higgsfield the hero.** It won't hit `#00CFFF` / `#060D1F` exactly, AI
video does not loop seamlessly (ping-pong shows), and it can't be art-directed
frame-accurately. Also: at 2–4MB it competes with LCP, and iOS Low Power Mode refuses
autoplay outright — so a static fallback ships regardless. You build the static version
either way; build the good live one instead.

**Do use it as a haze plate.** 3–5 *image* gens (not video) → pick one → hand-grade to
brand tokens → composite under the canvas at low opacity for volumetric bloom, depth
haze, particulate. Reuse the same still as the mobile/reduced-motion/LCP poster. A
handful of image credits, can't drift off-brand because it's static and hand-graded,
and it supplies exactly the organic quality canvas is worst at.

**On "stills → compiled video":** that pipeline is already owned —
`video/flo-explainer/render.mjs` steps a seek-driven composition frame-by-frame through
headless Chrome into ffmpeg. If a hero MP4 is ever wanted for social/OG, render the
finished canvas comp through **that**: free, deterministic, exact tokens. Higgsfield is
only worth paying for imagery that genuinely cannot be authored in DOM/SVG/canvas.

---

## 6. Mobile

Mobile is **a different camera, not a scaled-down desktop comp.** The engine already
branches on `mobile = W < 768`; the constants change, the code doesn't fork.

- **Framing.** Desktop puts the composition in negative space right of a 760px text
  column. Mobile stacks it *under* the text — so the detonation originates **behind
  the headline** and blooms past the frame edges rather than being contained.
- **Fewer, larger, closer.** Cut node count hard, raise sprite size, thicken dendrite
  strokes. Lean on Layers 2+4 (dendrites, signal traffic); **Layer 1's legibility beat
  largely does not survive at 390px** — accept that shards read as texture only on
  phones, and don't spend tuning time fighting it.
- **Legibility.** Radial scrim behind the `h1`, and suppress shard/dendrite opacity
  inside the text band.
- **Perf at peak.** The current edge pass is O(n²) — 54 nodes = 1,431 pairs/frame is
  fine; 140 = 9,730 is not, on a mid-range Android. Two mitigations, use both: dendrites
  are a *precomputed tree* (no per-frame neighbour search at all — this is most of the
  win), and spatial-grid whatever proximity work remains. Sprite blitting is cheaper
  than the current stroke work, so the shards are not the bottleneck. Bloom pass:
  reduce or skip on mobile. Target 60fps on a 3-year-old Android; measure at the 2.9s
  detonation peak, which is the worst frame.
- **`100vh`** at `index.html:12` → `100svh`. iOS URL-bar jump.
- **Dead CSS:** `index.html:337` overrides `grid-template-columns` on a flex container.
  No-op leftover; clean up while in here.
- Existing visibility + IntersectionObserver guards are already correct — keep them.

---

## 7. Build order

1. Depth planes + camera + grade/bloom treatment (§3c) on the *existing* nodes.
   Cheapest change with the biggest effect on "does this look generic."
2. Dendrites replace distance-edges (§3b Layer 2). Tell #2 dies here.
3. Beat structure + detonation + **docking** (§3d). Budget the tuning time here.
4. Artifact shard atlas (§3b Layer 1). The ambitious layer; droppable.
5. Signal-traffic ambient state (Layer 4).
6. Higgsfield haze plate + poster (§5).
7. Mobile constants pass + perf measurement on real hardware (§6).

---

## 8. Open questions for Phil

- **Autoplay-once vs. scroll-scrubbed.** Recommending autoplay-once — a homepage hero
  has to land before anyone scrolls. `/flow/` is the scrubbed surface; keep them
  distinct.
- **First-viewport density.** With a full-bleed detonation behind them, does the mobile
  hero keep both the stats row *and* the founder cred block? That's a lot of competing
  content in the first screen.
- **Shard vocabulary.** Which artifacts? Proposed: calendar cell, invoice line, form
  field, SMS bubble, chart bar, email row, checkbox, receipt strip, missed-call chip.
  Should mirror the `CHIPS` array in `video/flo-explainer/content.js` for cross-surface
  consistency.

---

*Written 2026-08-02, before any implementation.*
