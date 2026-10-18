"use client";

import { useRef, useState } from "react";
import Icon from "./Icon";

// カテゴリ別の参加者一覧と、詳細を出すモーダル。
// 一覧にはゼッケンNo.と氏名だけを並べ、フリガナ・居住地・性別は
// 行末のボタンから開くモーダル（<dialog>）で見せる。
// <dialog> の showModal() を使うと、背面の操作禁止・Escで閉じる・
// 閉じたら押したボタンにフォーカスを戻す、をブラウザが受け持ってくれる。
export default function EntryList({ groups }) {
  const dialogRef = useRef(null);
  const [current, setCurrent] = useState(null);

  const open = (group, entry) => {
    setCurrent({ group, entry });
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();

  return (
    <>
      {groups.map((g) => (
        <section
          className={`entries-group entries-group--${g.id}`}
          id={g.id}
          key={g.id}
          aria-labelledby={`${g.id}-title`}
        >
          <header className="entries-group-head">
            <p className="entries-group-en">{g.en}</p>
            <h2 className="entries-group-title" id={`${g.id}-title`}>
              {g.label}
            </h2>
            <p className="entries-group-count">
              <b>{g.entries.length}</b>名
              <span>／定員{g.capacity}名</span>
            </p>
          </header>

          {g.entries.length === 0 ? (
            <p className="entries-empty">掲載できる方はまだいません。</p>
          ) : (
            <ol className="entries-list">
              {g.entries.map((e, i) => (
                <li className="entries-row" key={`${e.bib}-${i}`}>
                  <span className="entries-bib">{e.bib || "—"}</span>
                  <span className="entries-name">{e.name}</span>
                  <button
                    type="button"
                    className="entries-more"
                    aria-haspopup="dialog"
                    aria-label={`${e.name}さんの詳細`}
                    onClick={() => open(g, e)}
                  >
                    <Icon name="info" />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>
      ))}

      {/* 背景（::backdrop）のクリックでも閉じる。中身の余白は内側の div が持つので、
          dialog 自身がクリックされた＝外側を押したと判定できる */}
      <dialog
        ref={dialogRef}
        className="entry-dialog"
        aria-labelledby="entry-dialog-title"
        onClick={(ev) => {
          if (ev.target === dialogRef.current) close();
        }}
      >
        {current ? (
          <div className={`entry-dialog-body entry-dialog-body--${current.group.id}`}>
            <div className="entry-dialog-head">
              <p className="entry-dialog-cat">{current.group.label}</p>
              <button
                type="button"
                className="entry-dialog-close"
                aria-label="閉じる"
                onClick={close}
              >
                <Icon name="close" />
              </button>
            </div>
            <p className="entry-dialog-bib">
              <span>ゼッケンNo.</span>
              {current.entry.bib || "—"}
            </p>
            <h2 className="entry-dialog-title" id="entry-dialog-title">
              {current.entry.kana ? (
                <span className="entry-dialog-kana">{current.entry.kana}</span>
              ) : null}
              {current.entry.name}
            </h2>
            <dl className="entry-dialog-list">
              <div>
                <dt>居住地</dt>
                <dd>{current.entry.residence || "—"}</dd>
              </div>
              <div>
                <dt>性別</dt>
                <dd>{current.entry.gender || "—"}</dd>
              </div>
            </dl>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
