// Material Symbols のアイコン。<Icon name="campaign" /> のように使う。
// 形はページに一度だけ埋め込んだスプライト（IconSprite）を参照するので、
// ここには名前しか持たない（JSの配信サイズが増えない）。
// 名前は lib/assets.js の MATERIAL_ICONS にも要登録。
// 大きさは文字サイズ（1em）、色は文字色（currentColor）に従う。
// 外側の <svg> に viewBox は付けない。座標の対応づけは参照先の <symbol> の
// viewBox が行い、<use> はこの <svg> の大きさいっぱいに描かれる。
export default function Icon({ name, className }) {
  return (
    <svg className={className ? `icon ${className}` : "icon"} aria-hidden="true">
      <use href={`#i-${name}`} />
    </svg>
  );
}
