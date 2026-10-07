// Doto's full stop draws as a cross, so board numbers set the point in the jersey face.
export function Led({ text }: { text: string }) {
  const [whole, frac] = text.split(".");
  if (frac === undefined) return <>{text}</>;
  return (
    <>
      {whole}
      <span className="bz-dp">.</span>
      {frac}
    </>
  );
}
