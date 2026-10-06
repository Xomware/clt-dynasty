import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Markdown } from "./Markdown";

const html = (text: string) => render(<Markdown text={text} />).container.firstElementChild?.innerHTML;

describe("Markdown", () => {
  it("renders headings, paragraphs and inline emphasis", () => {
    expect(html("# Week 4\n\n## Upsets\n\nA **big** night for *Team 6*.\nThen _chaos_.")).toBe(
      '<h3 class="md-h1">Week 4</h3><h4 class="md-h2">Upsets</h4>' +
        "<p>A <strong>big</strong> night for <em>Team 6</em>.<br>Then <em>chaos</em>.</p>",
    );
  });

  it("splits a heading from the paragraph glued under it", () => {
    expect(html("### Team 6 (Class of 27)\nGrade: A")).toBe('<h5 class="md-h3">Team 6 (Class of 27)</h5><p>Grade: A</p>');
  });

  it("renders bullet and numbered lists", () => {
    expect(html("- one\n- **two**\n\n1. first\n2) second")).toBe(
      '<ul class="md-ul"><li>one</li><li><strong>two</strong></li></ul><ol class="md-ol"><li>first</li><li>second</li></ol>',
    );
  });

  it("shows a stray tag as text", () => {
    expect(html("<script>x</script>")).toBe("<p>&lt;script&gt;x&lt;/script&gt;</p>");
  });
});
