// The intro's light and particles on two 2D canvases: the arena behind the
// marks (crowd, haze, spotlights) and the effects over them (warp lines, the
// hornet's sparks, the crown's flash, the slam's shockwave and confetti, lens
// flares). The CSS runs the marks; this reads the stage's own CSS clock every
// frame, so it lands on the same beats however late hydration was.
// See buzz-intro.css for the beat sheet.

export interface ArenaScene {
  bg: HTMLCanvasElement;
  fx: HTMLCanvasElement;
  /** Seconds into the intro, or null once it stops playing. */
  clock: () => number | null;
  hornet: Element;
  lockup: Element;
  cards: () => Element[];
}

const GO = 1.85;
const LAND = 2.5;
const CROWN = 2.8;
const COVERED = 3.25;
const SLAM = 3.2;
const FLARES = [3.2, 3.55, 3.9];
const LEAVE = 5.0;
const END = 5.66;

const TEAL = ["#12a3b1", "#7fdde2"];
const PURPLE = ["#4b2a8f", "#8c6fd6"];
const GOLD = ["#ffb52e", "#ffd98a"];
const CONFETTI = [...TEAL, ...PURPLE, ...GOLD];

// Seeded, so every visit throws the same confetti and the previews match.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

const ease = (p: number) => 1 - (1 - p) ** 3;
const clamp01 = (p: number) => Math.min(1, Math.max(0, p));
const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

function sprite(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d")!, size);
  return c;
}

function glow(rgb: string) {
  return sprite(64, (g, s) => {
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, `rgb(${rgb} / 1)`);
    r.addColorStop(0.25, `rgb(${rgb} / 0.55)`);
    r.addColorStop(1, `rgb(${rgb} / 0)`);
    g.fillStyle = r;
    g.fillRect(0, 0, s, s);
  });
}

// An anamorphic flare: a long horizontal streak, a shorter vertical one and a hot core.
const flareSprite = () =>
  sprite(256, (g, s) => {
    const c = s / 2;
    for (const [w, h, a] of [
      [c, 3, 0.9],
      [c * 0.35, 2, 0.6],
    ] as const) {
      const lin = g.createLinearGradient(c - w, 0, c + w, 0);
      lin.addColorStop(0, "rgb(255 236 200 / 0)");
      lin.addColorStop(0.5, `rgb(255 246 225 / ${a})`);
      lin.addColorStop(1, "rgb(255 236 200 / 0)");
      g.fillStyle = lin;
      g.fillRect(c - w, c - h, w * 2, h * 2);
      g.save();
      g.translate(c, c);
      g.rotate(Math.PI / 2);
      g.translate(-c, -c);
      g.globalAlpha = 0.7;
      g.fillRect(c - w * 0.45, c - h, w * 0.9, h * 2);
      g.restore();
    }
    const core = g.createRadialGradient(c, c, 0, c, c, c * 0.3);
    core.addColorStop(0, "rgb(255 255 245 / 1)");
    core.addColorStop(0.2, "rgb(255 217 138 / 0.6)");
    core.addColorStop(1, "rgb(255 181 46 / 0)");
    g.fillStyle = core;
    g.fillRect(0, 0, s, s);
  });

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  color: string;
}

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  spin: number;
  tilt: number;
  flip: number;
  color: number;
}

const center = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

/** Starts drawing; returns a stop. */
export function runArena(scene: ArenaScene): () => void {
  const bg = scene.bg.getContext("2d");
  const fx = scene.fx.getContext("2d");
  if (!bg || !fx) return () => {};

  const random = rng(7);
  const warm = glow("255 244 220");
  const gold = glow("255 200 90");
  const teal = glow("127 221 226");
  const purple = glow("140 111 214");
  const flare = flareSprite();

  let W = 0;
  let H = 0;
  let bgScale = 1;
  let fxScale = 1;
  let unit = 1;
  let arena: HTMLCanvasElement | null = null;

  // Crowd heads in curved tiers around a floor, each a faint dot, baked once per size.
  function bake() {
    const c = document.createElement("canvas");
    c.width = scene.bg.width;
    c.height = scene.bg.height;
    const g = c.getContext("2d")!;
    g.scale(bgScale, bgScale);
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#07031a");
    sky.addColorStop(0.55, "#120a2c");
    sky.addColorStop(1, "#1a0f3a");
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    const seats = rng(3);
    const rows = 18;
    for (let row = 0; row < rows; row++) {
      const p = row / rows;
      const y = H * (0.2 + p * 0.5);
      const bow = H * 0.08 * (1 - p);
      const size = (0.9 + p * 1.6) * unit;
      const gap = size * 3.2;
      for (let x = -gap; x < W + gap; x += gap) {
        const u = (x / W) * 2 - 1;
        const tone = seats();
        g.fillStyle =
          tone < 0.12 ? "rgb(127 221 226 / 0.22)" : tone < 0.24 ? "rgb(140 111 214 / 0.22)" : `rgb(90 70 140 / ${0.1 + p * 0.12})`;
        g.beginPath();
        g.arc(x + (seats() - 0.5) * gap * 0.5, y - bow * (1 - u * u) + (seats() - 0.5) * size, size, 0, Math.PI * 2);
        g.fill();
      }
    }
    // The floor: a lit oval of court with a dark apron.
    const floor = g.createRadialGradient(W / 2, H * 0.86, 0, W / 2, H * 0.86, Math.max(W, H) * 0.55);
    floor.addColorStop(0, "rgb(59 62 139 / 0.55)");
    floor.addColorStop(0.5, "rgb(43 22 97 / 0.35)");
    floor.addColorStop(1, "rgb(7 3 26 / 0)");
    g.fillStyle = floor;
    g.fillRect(0, H * 0.55, W, H * 0.45);
    const vignette = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
    vignette.addColorStop(0, "rgb(5 2 18 / 0)");
    vignette.addColorStop(1, "rgb(5 2 18 / 0.75)");
    g.fillStyle = vignette;
    g.fillRect(0, 0, W, H);
    arena = c;
  }

  function size() {
    W = window.innerWidth;
    H = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    bgScale = Math.min(dpr, 1.5);
    fxScale = Math.min(dpr, 2);
    unit = Math.min(W, H) / 400;
    scene.bg.width = Math.round(W * bgScale);
    scene.bg.height = Math.round(H * bgScale);
    scene.fx.width = Math.round(W * fxScale);
    scene.fx.height = Math.round(H * fxScale);
    bake();
  }
  size();
  window.addEventListener("resize", size);

  // Camera flashes in the stands, each at its own moment; more once the hornet is out.
  const flashes = Array.from({ length: 70 }, (_, i) => ({
    x: random(),
    y: 0.22 + random() * 0.45,
    at: i < 20 ? 0.3 + random() * 1.5 : GO + random() * (COVERED - GO),
  }));
  const motes = Array.from({ length: 60 }, () => ({ x: random(), y: random(), v: 0.01 + random() * 0.03, r: 0.6 + random() * 1.4 }));
  const warp = Array.from({ length: 56 }, () => ({ a: random() * Math.PI * 2, d: random(), w: 0.6 + random() * 1.6 }));

  const sparks: Spark[] = [];
  const pieces: Piece[] = [];
  const trail: { x: number; y: number }[] = [];
  let thrown = false;
  let crowned = false;
  let lockupAt: { x: number; y: number; r: DOMRect } | null = null;
  const flaresAt = new Map<number, { x: number; y: number }[]>();
  let glints: { x: number; y: number; at: number }[] | null = null;
  let last = scene.clock() ?? 0;
  let raf = 0;

  function burst(x: number, y: number, n: number, speed: number, colors: string[], life = 0.6) {
    for (let i = 0; i < n; i++) {
      const a = random() * Math.PI * 2;
      const v = speed * (0.35 + random() * 0.65) * unit;
      sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, age: 0, life: life * (0.6 + random() * 0.4), color: colors[i % colors.length] });
    }
  }

  // One spotlight: a cone from above the frame to a pool at (px, py).
  function spot(px: number, py: number, sx: number, width: number, alpha: number, light: HTMLCanvasElement, rgb = "255 244 220") {
    if (alpha <= 0) return;
    const top = -H * 0.08;
    const cone = bg!.createLinearGradient(0, top, 0, py);
    cone.addColorStop(0, `rgb(${rgb} / ${0.03 * alpha})`);
    cone.addColorStop(1, `rgb(${rgb} / ${0.2 * alpha})`);
    bg!.fillStyle = cone;
    bg!.beginPath();
    bg!.moveTo(sx - width * 0.06, top);
    bg!.lineTo(sx + width * 0.06, top);
    bg!.lineTo(px + width / 2, py);
    bg!.lineTo(px - width / 2, py);
    bg!.closePath();
    bg!.fill();
    bg!.globalAlpha = alpha;
    bg!.drawImage(light, px - width * 0.9, py - width * 0.32, width * 1.8, width * 0.64);
    bg!.globalAlpha = 1;
  }

  function drawBg(t: number, hornet: { x: number; y: number } | null) {
    bg!.setTransform(bgScale, 0, 0, bgScale, 0, 0);
    bg!.globalCompositeOperation = "source-over";
    bg!.drawImage(arena!, 0, 0, W, H);
    bg!.globalCompositeOperation = "lighter";

    // The house light sweeps the floor, then finds the board for the countdown.
    const on = span(t, 0.1, 0.3) * (1 - span(t, GO, GO + 0.25));
    const sweep = span(t, 0.1, 1.3);
    let px = W * (0.12 + 0.76 * Math.sin(sweep * Math.PI * 0.5) ** 2);
    let py = H * 0.8;
    const toBoard = ease(span(t, 1.15, 1.5));
    px += (W / 2 - px) * toBoard;
    py += (H * 0.46 - py) * toBoard;
    const width = Math.min(W, H) * (0.36 - 0.06 * toBoard);
    spot(px, py, W * 0.5, width, on, warm);

    // Haze in the beam.
    if (on > 0) {
      for (const m of motes) {
        const y = ((m.y - t * m.v) % 1 + 1) % 1;
        const x = m.x * W;
        const along = clamp01(y * H / py);
        const axis = W * 0.5 + (px - W * 0.5) * along;
        const inside = 1 - Math.abs(x - axis) / (width * 0.5 * along + 1);
        if (inside <= 0) continue;
        bg!.globalAlpha = inside * on * 0.5;
        bg!.drawImage(warm, x - m.r * 3 * unit, y * H - m.r * 3 * unit, m.r * 6 * unit, m.r * 6 * unit);
      }
      bg!.globalAlpha = 1;
    }

    // Player-intro lights: teal and purple swing in from the sides and track the hornet.
    if (t > GO) {
      const k = span(t, GO, GO + 0.3) * (1 - span(t, CROWN + 0.1, COVERED));
      const tx = hornet?.x ?? W / 2;
      const ty = hornet?.y ?? H / 2;
      const w = Math.min(W, H) * 0.3;
      spot(tx - w * 0.15, ty, W * 0.08, w, k, teal, "127 221 226");
      spot(tx + w * 0.15, ty, W * 0.92, w, k, purple, "160 130 235");
    }

    for (const f of flashes) {
      const age = t - f.at;
      if (age < 0 || age > 0.14) continue;
      const s = (6 + 10 * (1 - age / 0.14)) * unit;
      bg!.globalAlpha = 1 - age / 0.14;
      bg!.drawImage(warm, f.x * W - s, f.y * H - s, s * 2, s * 2);
    }
    bg!.globalAlpha = 1;
  }

  function drawFx(t: number, dt: number, hornet: { x: number; y: number } | null, crown: { x: number; y: number } | null) {
    fx!.setTransform(fxScale, 0, 0, fxScale, 0, 0);
    fx!.clearRect(0, 0, W, H);
    fx!.globalCompositeOperation = "lighter";

    // Warp: the camera rushing the hornet as it bursts out of the board.
    const wk = span(t, GO, GO + 0.12) * (1 - span(t, LAND - 0.15, LAND));
    if (wk > 0) {
      const cx = W / 2;
      const cy = H * 0.46;
      const reach = Math.hypot(W, H) * 0.6;
      fx!.lineCap = "round";
      fx!.strokeStyle = `rgb(220 240 255 / ${0.55 * wk})`;
      fx!.beginPath();
      for (const l of warp) {
        const p = ((l.d + (t - GO) * 1.6) % 1) ** 2;
        const r0 = reach * p;
        const r1 = r0 + reach * (0.05 + 0.25 * p);
        fx!.moveTo(cx + Math.cos(l.a) * r0, cy + Math.sin(l.a) * r0);
        fx!.lineTo(cx + Math.cos(l.a) * r1, cy + Math.sin(l.a) * r1);
      }
      fx!.lineWidth = 1.6 * unit;
      fx!.stroke();
    }

    // The hornet's zig-zag: a glowing wake and a spray of sparks behind it.
    if (hornet && t >= GO && t <= LAND + 0.05) {
      trail.push(hornet);
      if (trail.length > 14) trail.shift();
      for (let i = 0; i < 5; i++) {
        const a = random() * Math.PI * 2;
        const v = (40 + random() * 160) * unit;
        sparks.push({ x: hornet.x, y: hornet.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30 * unit, age: 0, life: 0.35 + random() * 0.35, color: GOLD[i % 2] });
      }
    } else if (trail.length && t > LAND) {
      trail.shift();
    }
    // Speed lines streaming off it, along its own motion, longer the faster it goes.
    if (hornet && trail.length > 2 && t <= LAND) {
      const prev = trail[trail.length - 3];
      const vx = hornet.x - prev.x;
      const vy = hornet.y - prev.y;
      const speed = Math.hypot(vx, vy);
      if (speed > 2) {
        const ux = vx / speed;
        const uy = vy / speed;
        const len = Math.min(speed * 3, 220 * unit);
        const half = scene.hornet.getBoundingClientRect().width * 0.4;
        fx!.lineCap = "round";
        fx!.lineWidth = 1.5 * unit;
        for (let i = 0; i < 9; i++) {
          const off = ((i / 8) * 2 - 1) * half;
          const back = half * (0.3 + 0.5 * Math.abs(Math.sin(i * 7.1)));
          const x0 = hornet.x - ux * back - uy * off;
          const y0 = hornet.y - uy * back + ux * off;
          const l = len * (0.5 + 0.5 * Math.abs(Math.cos(i * 3.3 + t * 40)));
          const g = fx!.createLinearGradient(x0, y0, x0 - ux * l, y0 - uy * l);
          g.addColorStop(0, "rgb(230 245 255 / 0.7)");
          g.addColorStop(1, "rgb(230 245 255 / 0)");
          fx!.strokeStyle = g;
          fx!.beginPath();
          fx!.moveTo(x0, y0);
          fx!.lineTo(x0 - ux * l, y0 - uy * l);
          fx!.stroke();
        }
      }
    }
    if (trail.length > 1) {
      fx!.lineJoin = "round";
      for (let i = 1; i < trail.length; i++) {
        const k = i / trail.length;
        fx!.strokeStyle = `rgb(255 200 90 / ${0.7 * k})`;
        fx!.lineWidth = (2 + 6 * k) * unit;
        fx!.beginPath();
        fx!.moveTo(trail[i - 1].x, trail[i - 1].y);
        fx!.lineTo(trail[i].x, trail[i].y);
        fx!.stroke();
      }
    }

    // The crown lands: a gold flash and a ring of sparks where it sits.
    if (!crowned && t >= CROWN && crown) {
      crowned = true;
      burst(crown.x, crown.y, 36, 420, GOLD, 0.55);
    }
    if (t >= CROWN && t < CROWN + 0.45 && crown) {
      const p = span(t, CROWN, CROWN + 0.45);
      const s = (60 + 260 * ease(p)) * unit;
      fx!.globalAlpha = 1 - p;
      fx!.drawImage(gold, crown.x - s, crown.y - s, s * 2, s * 2);
      fx!.globalAlpha = 1;
    }

    // The slam: shockwave rings, confetti, sparks.
    if (!thrown && t >= SLAM) {
      thrown = true;
      const r = scene.lockup.getBoundingClientRect();
      lockupAt = { ...center(r), r };
      burst(lockupAt.x, lockupAt.y, 60, 900, [...GOLD, TEAL[1], "#f6f2e7"], 0.7);
      for (let i = 0; i < 170; i++) {
        const a = -Math.PI / 2 + (random() - 0.5) * Math.PI * 1.9;
        const v = (500 + random() * 900) * unit;
        pieces.push({
          x: lockupAt.x + (random() - 0.5) * r.width * 0.6,
          y: lockupAt.y + (random() - 0.5) * r.height * 0.3,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v,
          w: (5 + random() * 6) * unit,
          h: (2.5 + random() * 3) * unit,
          rot: random() * Math.PI * 2,
          spin: (random() - 0.5) * 14,
          tilt: random() * Math.PI * 2,
          flip: 6 + random() * 10,
          color: Math.floor(random() * CONFETTI.length),
        });
      }
    }
    if (lockupAt && t < SLAM + 0.7) {
      for (const [delay, rgb, reach] of [
        [0, "255 217 138", 1.2],
        [0.09, "127 221 226", 1.6],
      ] as const) {
        const p = span(t, SLAM + delay, SLAM + delay + 0.6);
        if (p <= 0 || p >= 1) continue;
        fx!.strokeStyle = `rgb(${rgb} / ${(1 - p) * 0.9})`;
        fx!.lineWidth = (2 + 14 * (1 - p)) * unit;
        fx!.beginPath();
        fx!.ellipse(lockupAt.x, lockupAt.y, lockupAt.r.width * reach * ease(p), lockupAt.r.width * reach * 0.62 * ease(p), 0, 0, Math.PI * 2);
        fx!.stroke();
      }
    }

    // Sparks: streaks along their own velocity, falling a little.
    fx!.lineCap = "round";
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.age += dt;
      if (s.age >= s.life) {
        sparks.splice(i, 1);
        continue;
      }
      s.vy += 380 * unit * dt;
      s.vx *= 1 - 1.8 * dt;
      s.vy *= 1 - 1.8 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      fx!.globalAlpha = 1 - s.age / s.life;
      fx!.strokeStyle = s.color;
      fx!.lineWidth = 2 * unit;
      fx!.beginPath();
      fx!.moveTo(s.x, s.y);
      fx!.lineTo(s.x - s.vx * 0.035, s.y - s.vy * 0.035);
      fx!.stroke();
    }
    fx!.globalAlpha = 1;

    // Lens flares on the beat: on the lockup's edges, then the cards as they settle.
    for (const at of FLARES) {
      const p = span(t, at, at + 0.4);
      if (p <= 0 || p >= 1) continue;
      if (!flaresAt.has(at)) {
        const r = scene.lockup.getBoundingClientRect();
        const spots = [
          [0.16, 0.62],
          [0.86, 0.6],
          [0.5, 0.08],
        ];
        flaresAt.set(at, [spots[FLARES.indexOf(at) % 3]].map(([fx0, fy0]) => ({ x: r.left + r.width * fx0, y: r.top + r.height * fy0 })));
      }
      const k = Math.sin(p * Math.PI);
      for (const f of flaresAt.get(at)!) {
        const w = Math.min(W, H) * 0.9 * k;
        fx!.globalAlpha = k;
        fx!.drawImage(flare, f.x - w / 2, f.y - w / 2, w, w);
      }
    }
    if (t >= 4.2 && !glints) {
      glints = scene.cards().map((el, i) => {
        const r = el.getBoundingClientRect();
        return { x: r.right - r.width * 0.12, y: r.top + 2, at: 4.2 + i * 0.07 };
      });
    }
    for (const g of glints ?? []) {
      const p = span(t, g.at, g.at + 0.32);
      if (p <= 0 || p >= 1) continue;
      const k = Math.sin(p * Math.PI);
      const w = Math.min(W, H) * 0.38 * k;
      fx!.globalAlpha = k * 0.9;
      fx!.drawImage(flare, g.x - w / 2, g.y - w / 2, w, w);
    }
    fx!.globalAlpha = 1;

    // Confetti over everything, fluttering as it falls, and thinning out as
    // the games land so their scores read.
    if (pieces.length) {
      fx!.globalCompositeOperation = "source-over";
      const fade = 1 - 0.85 * span(t, 4.1, 4.6) - 0.15 * span(t, LEAVE, LEAVE + 0.3);
      fx!.globalAlpha = fade;
      for (let c = 0; c < CONFETTI.length; c++) {
        fx!.fillStyle = CONFETTI[c];
        for (const q of pieces) {
          if (q.color !== c) continue;
          const sy = Math.cos(q.tilt);
          const cos = Math.cos(q.rot);
          const sin = Math.sin(q.rot);
          fx!.setTransform(cos * fxScale, sin * fxScale, -sin * sy * fxScale, cos * sy * fxScale, q.x * fxScale, q.y * fxScale);
          fx!.fillRect(-q.w / 2, -q.h / 2, q.w, q.h);
        }
      }
      fx!.setTransform(fxScale, 0, 0, fxScale, 0, 0);
      fx!.globalAlpha = 1;
      for (const q of pieces) {
        q.vy += 520 * unit * dt;
        const drag = 1 - 2.6 * dt;
        q.vx *= drag;
        q.vy *= drag;
        q.x += (q.vx + Math.sin(q.tilt) * 40 * unit) * dt;
        q.y += q.vy * dt;
        q.rot += q.spin * dt;
        q.tilt += q.flip * dt;
      }
    }
  }

  // Steps by the intro's clock, not the frame's timestamp, so particles move
  // with the beats even when frames come late.
  const frame = () => {
    const t = scene.clock();
    if (t === null || t > END) return;
    const dt = Math.min(0.05, Math.max(0, t - last));
    last = t;
    const tracking = t >= GO - 0.05 && t <= CROWN + 0.5;
    const r = tracking ? scene.hornet.getBoundingClientRect() : null;
    const hornet = r && center(r);
    const crown = r && { x: r.left + r.width / 2, y: r.top + r.height * 0.02 };
    if (t < COVERED + 0.1) drawBg(t, hornet);
    drawFx(t, dt, hornet, crown);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", size);
  };
}
