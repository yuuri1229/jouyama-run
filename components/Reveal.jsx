// 以前は画面に入ると下からふわっと表示する演出を付けていたが、
// 「テンプレートっぽい動き」に見えるため廃止した。
// いまは className や属性をそのまま渡すだけのラッパー（JSは動かない）。
// 呼び出し側（as / delay / className）は変えずに済むよう、名前と引数は残している。
// delay は使わないが、DOMに漏れないよう受け取って捨てる。
export default function Reveal({
  as: Tag = "div",
  delay, // eslint-disable-line no-unused-vars
  className,
  children,
  ...rest
}) {
  return (
    <Tag className={className} {...rest}>
      {children}
    </Tag>
  );
}
