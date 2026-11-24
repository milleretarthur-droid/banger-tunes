/** Tampon de marque : le mot + la signature « Live records. Here. Now. » (volontairement en anglais). */
export default function BrandStamp() {
  return (
    <div className="stamp" aria-label="Banger Tunes. Live records. Here. Now.">
      <div className="stamp-name">
        banger tunes<i className="logo-dot" aria-hidden="true" />
      </div>
      <div className="stamp-line">
        <span><em>●</em> Live records</span>
        <span>Here. Now.</span>
      </div>
    </div>
  );
}
