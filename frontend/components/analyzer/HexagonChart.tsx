import { AXES, type AxisValues } from "@/lib/analyzer/analysis";

interface HexagonChartProps {
  primary: AxisValues;
  comparison?: AxisValues | null;
  average: AxisValues;
  // League best per axis: each vertex is a fraction of it.
  max: AxisValues;
  label: string;
}

const SIZE = 300;
const C = SIZE / 2;
const R = 105;

// Axis 0 at twelve o'clock, then clockwise, as the iOS and Angular charts drew it.
const vertex = (r: number, i: number) => {
  const angle = (i * Math.PI) / 3 - Math.PI / 2;
  return [C + r * Math.cos(angle), C + r * Math.sin(angle)] as const;
};
const points = (vs: (readonly [number, number])[]) => vs.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
const shape = (values: AxisValues, max: AxisValues) =>
  AXES.map((a, i) => vertex(max[a] > 0 ? R * Math.min(1, values[a] / max[a]) : 0, i));

// A radar of roster value by position group, against the league average.
export function HexagonChart({ primary, comparison, average, max, label }: HexagonChartProps) {
  const mine = shape(primary, max);
  const theirs = comparison ? shape(comparison, max) : null;
  return (
    <svg className="hex-chart" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={label}>
      {[0.25, 0.5, 0.75, 1].map((level) => (
        <polygon key={level} className="hex-ring" points={points(AXES.map((_, i) => vertex(R * level, i)))} />
      ))}
      {AXES.map((a, i) => {
        const [x, y] = vertex(R, i);
        return <line key={a} className="hex-spoke" x1={C} y1={C} x2={x} y2={y} />;
      })}
      <polygon className="hex-average" points={points(shape(average, max))} />
      {theirs && (
        <g className="hex-comparison">
          <polygon points={points(theirs)} />
          {theirs.map(([x, y], i) => (
            <rect key={i} x={x - 3} y={y - 3} width={6} height={6} />
          ))}
        </g>
      )}
      <g className="hex-primary">
        <polygon points={points(mine)} />
        {mine.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={3.5} />
        ))}
      </g>
      {AXES.map((a, i) => {
        const [x, y] = vertex(R * 1.2, i);
        return (
          <text key={a} className="hex-label" x={x} y={y} textAnchor="middle" dominantBaseline="middle">
            {a}
          </text>
        );
      })}
    </svg>
  );
}
