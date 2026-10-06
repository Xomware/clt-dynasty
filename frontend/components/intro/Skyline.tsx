// Uptown Charlotte at dusk, in a 2400x500 box with the city in the middle
// 1600 and low suburbs on the flanks, so a wide screen never shows an edge.
// Bank of America Corporate Center stands at x=1200; its crown of rods is the
// one the hero crown lifts off (centre y=140, 36 wide). Intro CSS relies on
// those numbers.

// Seeded, so the server's markup and the client's hydration agree.
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function farBlocks(): string {
  const r = rng(7);
  let d = "";
  for (let x = 0; x < 2400; ) {
    const w = 22 + r() * 46;
    // Taller toward uptown.
    const near = Math.exp(-(((x - 1200) / 520) ** 2));
    const h = 26 + r() * 50 + near * (60 + r() * 120);
    d += `M${x.toFixed(0)} 500V${(500 - h).toFixed(0)}h${w.toFixed(0)}V500z`;
    x += w - 2;
  }
  return d;
}

function nearBlocks(): string {
  const r = rng(11);
  let d = "";
  for (let x = 0; x < 2400; ) {
    const w = 30 + r() * 70;
    const h = 18 + r() * 44;
    d += `M${x.toFixed(0)} 500V${(500 - h).toFixed(0)}h${w.toFixed(0)}V500z`;
    x += w;
  }
  return d;
}

// A 6x10 tile of window cells, about 40% lit, a few in a cooler white.
function windowCells(seed: number) {
  const r = rng(seed);
  const cells: { x: number; y: number; warm: boolean }[] = [];
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 6; col++) {
      if (r() < 0.42) cells.push({ x: col * 9 + 2.5, y: row * 12 + 3, warm: r() < 0.78 });
    }
  }
  return cells;
}

const FAR = farBlocks();
const NEAR = nearBlocks();
const WINDOWS_A = windowCells(3);
const WINDOWS_B = windowCells(19);

// Uptown's towers, left to right. Paths are hand-drawn from the real profiles.
const TOWERS = [
  "M748 500V362h46V500z",
  "M800 500V318h44V500zM820 318V296h2V318z",
  // Truist Center, with its pyramid cap.
  "M932 500V256h56V500zM932 256L960 214L988 256z",
  "M992 500V304h40V500z",
  // Hearst Tower: stepped top and two finials.
  "M1036 500V236h10V222h38V236h10V500zM1050 222V202h2V222zM1078 222V202h2V222z",
  "M1100 500V296h34V500z",
  // Bank of America Corporate Center: setbacks up to the crown.
  "M1164 500V186L1172 172H1228L1236 186V500zM1172 172L1180 158H1220L1228 172z",
  // Duke Energy Center: the sloped roof and its mast.
  "M1268 500V206L1344 188V500zM1330 191V164h2V191z",
  // 301 South College, the Jukebox.
  "M1378 500V262Q1410 228 1442 262V500z",
  "M1446 500V300h40V500z",
  // 550 South Tryon and its curved crown.
  "M1492 500V282C1502 262 1542 262 1552 282V500z",
  "M1558 500V322h48V500z",
  "M1612 500V352h52V500z",
];

// Window light comes on from the tallest tower outward, band by band.
const BANDS = [
  [[1140, 1260]],
  [[1020, 1140], [1260, 1380]],
  [[900, 1020], [1380, 1500]],
  [[700, 900], [1500, 1700]],
];

const RODS = Array.from({ length: 9 }, (_, i) => 1182.6 + i * 4.35);

function Cells({ cells }: { cells: { x: number; y: number; warm: boolean }[] }) {
  return cells.map((c, i) => (
    <rect key={i} x={c.x} y={c.y} width={3.5} height={5} className={c.warm ? "fill-(--intro-window)" : "fill-(--intro-window-cool)"} />
  ));
}

export function Skyline() {
  return (
    <svg viewBox="0 0 2400 500" className="intro-skyline" aria-hidden focusable="false">
      <defs>
        <pattern id="intro-win-a" width={54} height={120} patternUnits="userSpaceOnUse">
          <Cells cells={WINDOWS_A} />
        </pattern>
        <pattern id="intro-win-b" width={54} height={120} patternUnits="userSpaceOnUse" x={27} y={40}>
          <Cells cells={WINDOWS_B} />
        </pattern>
        <clipPath id="intro-towers">
          {TOWERS.map((d) => (
            <path key={d} d={d} />
          ))}
        </clipPath>
        <clipPath id="intro-far">
          <path d={FAR} />
        </clipPath>
        <radialGradient id="intro-crown-glow">
          <stop offset="0" stopColor="var(--clt-crown)" stopOpacity={0.85} />
          <stop offset="1" stopColor="var(--clt-crown)" stopOpacity={0} />
        </radialGradient>
        {/* Dusk catches the upper floors; the streets are already dark. */}
        <linearGradient id="intro-tower" x1="0" y1="150" x2="0" y2="500" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--intro-mid-lit)" />
          <stop offset="1" stopColor="var(--intro-mid)" />
        </linearGradient>
        <linearGradient id="intro-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--intro-haze)" stopOpacity={0} />
          <stop offset="1" stopColor="var(--intro-haze)" stopOpacity={0.55} />
        </linearGradient>
      </defs>

      <path d={FAR} className="fill-(--intro-far)" />
      <g clipPath="url(#intro-far)" className="intro-lights intro-lights-far">
        <rect width={2400} height={500} fill="url(#intro-win-b)" />
      </g>
      <rect y={300} width={2400} height={200} fill="url(#intro-haze)" />

      <g fill="url(#intro-tower)">
        {TOWERS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      {BANDS.map((ranges, i) => (
        <g key={i} clipPath="url(#intro-towers)" className="intro-lights" style={{ animationDelay: `${1.2 + i * 0.2}s` }}>
          {ranges.map(([a, b]) => (
            <rect key={a} x={a} y={150} width={b - a} height={350} fill={`url(#intro-win-${i % 2 ? "b" : "a"})`} />
          ))}
        </g>
      ))}

      <ellipse cx={1200} cy={140} rx={70} ry={52} fill="url(#intro-crown-glow)" className="intro-tower-glow" />
      <g className="intro-rods">
        {RODS.map((x) => (
          <rect key={x} x={x} y={122} width={1.8} height={36} />
        ))}
      </g>

      <path d={NEAR} className="fill-(--intro-near)" />
    </svg>
  );
}
