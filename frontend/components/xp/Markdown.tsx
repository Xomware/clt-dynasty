import type { ReactNode } from "react";

import "./markdown.css";

// The AI reports' markdown is what the prompts ask for and iOS's
// AttributedString renders: #-### headings, paragraphs, bullet and numbered
// lists, **bold** and *italic*. Built as elements, never as HTML, so a
// model's stray tag shows as text.
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/).map((part, i) => {
    if (/^\*\*.+\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (/^([*_]).+\1$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

const lines = (text: string) =>
  text.split("\n").flatMap((line, i) => (i === 0 ? inline(line) : [<br key={`br${i}`} />, ...inline(line)]));

const BULLET = /^\s*[-*•]\s+/;
const NUMBERED = /^\s*\d+[.)]\s+/;

function block(chunk: string, key: number): ReactNode {
  const heading = /^(#{1,6})\s+(.*)$/.exec(chunk);
  if (heading && !chunk.includes("\n")) {
    const level = Math.min(heading[1].length, 3);
    const Tag = (["h3", "h4", "h5"] as const)[level - 1];
    return (
      <Tag key={key} className={`md-h${level}`}>
        {inline(heading[2])}
      </Tag>
    );
  }
  const rows = chunk.split("\n");
  const list = rows.every((r) => BULLET.test(r)) ? "ul" : rows.every((r) => NUMBERED.test(r)) ? "ol" : null;
  if (list) {
    const List = list;
    return (
      <List key={key} className={`md-${list}`}>
        {rows.map((r, i) => (
          <li key={i}>{inline(r.replace(list === "ul" ? BULLET : NUMBERED, ""))}</li>
        ))}
      </List>
    );
  }
  return <p key={key}>{lines(chunk)}</p>;
}

export function Markdown({ text }: { text: string }) {
  // A heading glued to the paragraph under it still reads as its own block.
  const chunks = text
    .replace(/\r\n/g, "\n")
    .replace(/^(#{1,6} .*)\n(?!\n)/gm, "$1\n\n")
    .split(/\n{2,}/)
    .map((c) => c.trim())
    .filter(Boolean);
  return <div className="md">{chunks.map(block)}</div>;
}
