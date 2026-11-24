"use client";

import { useCallback, useEffect, useState } from "react";
import Icon from "./Icon";

// =========================================================
// 大会ルールの下に出す、選手＆スタッフ交流掲示板の閲覧専用表示
// ・投稿はHTMLに埋め込まず、表示時に /api/board-view から取得する（検索に載りにくくする）
// ・掲示板が未設定・読み込み失敗のときは、セクションごと表示しない
// ・書き込みページへのリンクは置かない（URLを広めないため）
// =========================================================
const API = "/api/board-view";
const FIRST = 3;
const MORE = 10;

const fmt = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const when = (iso) => fmt.format(new Date(iso)).replace(/-/g, "/");

export default function PublicBoard() {
  const [posts, setPosts] = useState(null);
  const [total, setTotal] = useState(0);
  const [rest, setRest] = useState(0);
  const [busy, setBusy] = useState(false);
  const [moreErr, setMoreErr] = useState(false);

  const fetchPage = useCallback(async (before, limit) => {
    const res = await fetch(`${API}?limit=${limit}${before ? `&before=${before}` : ""}`, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    return res.json();
  }, []);

  useEffect(() => {
    let gone = false;
    fetchPage(null, FIRST)
      .then((j) => {
        if (gone) return;
        setPosts(j.posts);
        setTotal(j.total);
        setRest(j.remaining);
      })
      .catch(() => {});
    return () => {
      gone = true;
    };
  }, [fetchPage]);

  async function more() {
    setBusy(true);
    setMoreErr(false);
    try {
      const j = await fetchPage(posts[posts.length - 1].id, MORE);
      setPosts((cur) => [...cur, ...j.posts.filter((p) => !cur.some((c) => c.id === p.id))]);
      setTotal(j.total);
      setRest(j.remaining);
    } catch {
      setMoreErr(true);
    } finally {
      setBusy(false);
    }
  }

  if (!posts) return null; // 読み込み前・未設定・失敗のときは何も出さない

  return (
    <section className="section" id="board" aria-labelledby="board-h">
      <div className="container">
        <header className="sec-head">
          <p className="sec-eyebrow">
            <span className="sec-num">05</span>
            <span className="sec-bar" aria-hidden="true" />
            <Icon name="forum" />
            BOARD
          </p>
          <h2 className="sec-title" id="board-h">選手＆スタッフ交流掲示板</h2>
        </header>

        {posts.length === 0 ? (
          <p className="pbb-empty">まだ書き込みはありません。</p>
        ) : (
          <>
            <div className="pbb-head">
              <strong>書き込み一覧</strong>
              <span>
                新しい順に{posts.length}件を表示（全{total}件）
              </span>
            </div>
            {posts.map((p) => (
              <article className="pbb-thread" key={p.id}>
                <div className="pbb-ph">
                  <span className="pbb-name">{p.name}</span>
                  <time dateTime={p.createdAt}>{when(p.createdAt)}</time>
                </div>
                <p className="pbb-body">{p.body}</p>
                {p.replies.length > 0 && (
                  <div className="pbb-replies">
                    {p.replies.map((r) => (
                      <div className="pbb-reply" key={r.id}>
                        <div className="pbb-ph">
                          <span className="pbb-name">{r.name}</span>
                          <time dateTime={r.createdAt}>{when(r.createdAt)}</time>
                        </div>
                        <p className="pbb-body">{r.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
            {rest > 0 && (
              <div className="pbb-more">
                <button className="btn btn-line" type="button" onClick={more} disabled={busy}>
                  {busy ? "読み込み中…" : `もっと見る（あと${rest}件）`}
                  <Icon name="keyboard_arrow_down" />
                </button>
                {moreErr && <p className="pbb-err" role="alert">読み込めませんでした。もう一度お試しください。</p>}
              </div>
            )}
          </>
        )}
        <p className="pbb-foot">この欄は閲覧専用です。書き込みは、運営から参加者へご案内した専用ページから行えます。</p>
      </div>
    </section>
  );
}
