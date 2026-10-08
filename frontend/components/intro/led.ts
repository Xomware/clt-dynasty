// A 5x7 arena-board font, just the letters the intro spells. Drawing the dots
// ourselves keeps the board right on the first frame, before any webfont lands.
const GLYPHS: Record<string, string[]> = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  C: [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  N: ["#...#", "##..#", "#.#.#", "#.#.#", "#..##", "#...#", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
};

/** Columns `text` takes: five per letter and one between. */
export const ledWidth = (text: string) => text.length * 6 - 1;

/** One SVG path of every lit dot, in a viewBox one unit per dot, 7 high. */
export function ledPath(text: string) {
  const d: string[] = [];
  [...text].forEach((ch, i) => {
    GLYPHS[ch].forEach((row, y) => {
      [...row].forEach((on, x) => {
        if (on === "#") d.push(`M${i * 6 + x + 0.08} ${y + 0.5}a.42.42 0 1 0 .84 0a.42.42 0 1 0-.84 0`);
      });
    });
  });
  return d.join("");
}
