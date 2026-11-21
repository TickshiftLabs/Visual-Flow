/** Static illustration: a small JSON document and the node graph it becomes. */

const C = {
  panel: "#131518",
  line: "#26292e",
  mute: "#7d838c",
  key: "#9aa1ab",
  str: "#c8f169",
  num: "#ecedee",
  root: "#c8f169",
  node: "#ecedee",
  edge: "#3a3f46",
  headInk: "#0b0c0e",
};

interface NodeProps {
  x: number;
  y: number;
  w: number;
  title: string;
  color: string;
  rows: Array<{ k: string; v: string; fill: string }>;
}

function GraphNode({ x, y, w, title, color, rows }: NodeProps) {
  const h = 22 + rows.length * 19 + 15;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={7} fill={C.panel} stroke={C.line} />
      <path
        d={`M${x} ${y + 7} a7 7 0 0 1 7 -7 h${w - 14} a7 7 0 0 1 7 7 v15 h-${w}z`}
        fill={color}
      />
      <text x={x + 10} y={y + 15} fill={C.headInk} fontWeight={500}>
        {title}
      </text>
      {rows.map((r, i) => (
        <text key={r.k} y={y + 40 + i * 19}>
          <tspan x={x + 10} fill={C.key}>
            {r.k}
          </tspan>
          <tspan x={x + w - 10} textAnchor="end" fill={r.fill}>
            {r.v}
          </tspan>
        </text>
      ))}
    </g>
  );
}

const jsonLines: Array<{ indent: number; parts: Array<[string, string]> }> = [
  { indent: 0, parts: [["{", C.mute]] },
  { indent: 1, parts: [['"order"', C.key], [": ", C.mute], ["4821", C.num], [",", C.mute]] },
  { indent: 1, parts: [['"user"', C.key], [": {", C.mute]] },
  { indent: 2, parts: [['"name"', C.key], [": ", C.mute], ['"Ada"', C.str], [",", C.mute]] },
  { indent: 2, parts: [['"tier"', C.key], [": ", C.mute], ['"pro"', C.str]] },
  { indent: 1, parts: [["},", C.mute]] },
  { indent: 1, parts: [['"items"', C.key], [": [", C.mute]] },
  { indent: 2, parts: [["{ ", C.mute], ['"sku"', C.key], [": ", C.mute], ['"A-12"', C.str], [" },", C.mute]] },
  { indent: 2, parts: [["{ ", C.mute], ['"sku"', C.key], [": ", C.mute], ['"B-07"', C.str], [" }", C.mute]] },
  { indent: 1, parts: [["]", C.mute]] },
  { indent: 0, parts: [["}", C.mute]] },
];

export default function GraphIllustration() {
  return (
    <svg
      viewBox="0 0 560 250"
      className="block h-auto w-full font-vf-mono text-[10.5px]"
      role="img"
      aria-label="A JSON document with an order, a user and two items, shown as four connected nodes"
    >
      <rect x={1} y={20} width={176} height={210} rx={8} fill={C.panel} stroke={C.line} />
      {jsonLines.map((line, i) => (
        <text key={i} x={14 + line.indent * 10} y={46 + i * 17.6}>
          {line.parts.map(([text, fill], j) => (
            <tspan key={j} fill={fill}>
              {text}
            </tspan>
          ))}
        </text>
      ))}

      <g fill="none" stroke={C.edge} strokeWidth={1.4}>
        <path d="M177 125 H206" />
        <path d="M326 110 C352 110 352 52 378 52" />
        <path d="M326 140 C352 140 352 150 378 150" />
        <path d="M326 140 C352 140 352 214 378 214" />
      </g>

      <GraphNode
        x={206}
        y={78}
        w={120}
        title="Root"
        color={C.root}
        rows={[
          { k: "order", v: "4821", fill: C.num },
          { k: "user", v: "{2 keys}", fill: C.mute },
          { k: "items", v: "[2 items]", fill: C.mute },
        ]}
      />
      <GraphNode
        x={378}
        y={14}
        w={150}
        title="user"
        color={C.node}
        rows={[
          { k: "name", v: '"Ada"', fill: C.str },
          { k: "tier", v: '"pro"', fill: C.str },
        ]}
      />
      <GraphNode
        x={378}
        y={122}
        w={150}
        title="items › 0"
        color={C.node}
        rows={[{ k: "sku", v: '"A-12"', fill: C.str }]}
      />
      <GraphNode
        x={378}
        y={188}
        w={150}
        title="items › 1"
        color={C.node}
        rows={[{ k: "sku", v: '"B-07"', fill: C.str }]}
      />
    </svg>
  );
}
