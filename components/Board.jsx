"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "./Icon";

// =========================================================
// 選手＆スタッフ交流掲示板（/kouryu-8f3a2c9d/）
// ・保存先は Cloudflare Pages Functions + D1（functions/api/board.js）
// ・スパム防止は Cloudflare Turnstile。サイトキー未設定／API 未接続のときは「準備中」を表示
// ・運営の削除：URL の末尾に #admin を付けると管理キー欄が出る（キーはタブを閉じると消える）
// =========================================================
const API = "/api/board";
const NAME_MAX = 20;
const POST_MAX = 1000;
const REPLY_MAX = 500;

const ERRORS = {
  turnstile: "スパム防止の確認に失敗しました。もう一度お試しください。",
  rate: "続けて書き込みすぎています。少し時間をおいてからお試しください。",
  bad_name: "お名前は1〜20文字で入力してください。",
  bad_body: "文章の文字数を確認してください。",
  no_parent: "返信先の投稿が見つかりません。",
};

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

let tsPromise;
function loadTurnstile() {
  if (!tsPromise) {
    tsPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = () => resolve(window.turnstile);
      s.onerror = () => {
        tsPromise = null;
        reject(new Error("turnstile"));
      };
      document.head.appendChild(s);
    });
  }
  return tsPromise;
}

function Form({ siteKey, parentId, onDone, onCancel, label, max }) {
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const tsBox = useRef(null);
  const tsId = useRef(null);
  const token = useRef("");
  const idp = useRef(`f${Math.random().toString(36).slice(2, 8)}`).current;

  useEffect(() => {
    try {
      setName(sessionStorage.getItem("board-name") || "");
    } catch {}
    let gone = false;
    loadTurnstile()
      .then((ts) => {
        if (gone || !tsBox.current) return;
        tsId.current = ts.render(tsBox.current, {
          sitekey: siteKey,
          language: "ja",
          callback: (t) => (token.current = t),
          "expired-callback": () => (token.current = ""),
        });
      })
      .catch(() => setErr("スパム防止の読み込みに失敗しました。ページを再読み込みしてください。"));
    return () => {
      gone = true;
      if (tsId.current != null && window.turnstile) window.turnstile.remove(tsId.current);
    };
  }, [siteKey]);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (!name.trim() || !body.trim()) return setErr("お名前と文章を入力してください。");
    if (!token.current) return setErr("スパム防止の確認が終わるまでお待ちください。");
    setBusy(true);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, body, parentId, token: token.current }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(ERRORS[j.error] || "書き込みに失敗しました。時間をおいてお試しください。");
        return;
      }
      try {
        sessionStorage.setItem("board-name", name);
      } catch {}
      setBody("");
      onDone();
    } catch {
      setErr("通信に失敗しました。電波の良い場所でもう一度お試しください。");
    } finally {
      token.current = "";
      if (tsId.current != null && window.turnstile) window.turnstile.reset(tsId.current);
      setBusy(false);
    }
  }

  return (
    <form className="board-form" onSubmit={submit} noValidate>
      <div className="board-field">
        <label htmlFor={`${idp}-n`}>
          お名前（ニックネーム可）<span className="board-opt">{NAME_MAX}文字まで</span>
        </label>
        <input
          id={`${idp}-n`}
          value={name}
          maxLength={NAME_MAX}
          autoComplete="nickname"
          placeholder="例：しろやま太郎"
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="board-field">
        <label htmlFor={`${idp}-t`}>
          {label}
          <span className="board-opt">{max.toLocaleString()}文字まで</span>
        </label>
        <textarea
          id={`${idp}-t`}
          value={body}
          maxLength={max}
          rows={parentId ? 3 : 5}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="board-count" aria-live="off">
          {body.length} / {max}
        </div>
      </div>
      <div ref={tsBox} className="board-ts" />
      {err && (
        <p className="board-err" role="alert">
          {err}
        </p>
      )}
      <div className="board-btns">
        <button className="btn btn-primary" type="submit" disabled={busy}>
          <Icon name="send" />
          {busy ? "送信中…" : parentId ? "返信する" : "書き込む"}
        </button>
        {onCancel && (
          <button className="board-cancel" type="button" onClick={onCancel}>
            キャンセル
          </button>
        )}
      </div>
    </form>
  );
}

export default function Board({ siteKey }) {
  const [posts, setPosts] = useState(null);
  const [state, setState] = useState("loading"); // loading | ok | notready | error
  const [replyTo, setReplyTo] = useState(null);
  const [admin, setAdmin] = useState(false);
  const [key, setKey] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(API, { cache: "no-store" });
      if (!res.ok) return setState(res.status === 404 || res.status === 503 ? "notready" : "error");
      const j = await res.json();
      setPosts(j.posts);
      setState("ok");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
    setAdmin(window.location.hash === "#admin");
    try {
      setKey(sessionStorage.getItem("board-admin") || "");
    } catch {}
  }, [load]);

  async function remove(id) {
    if (!window.confirm("この投稿を削除します。（返信もまとめて非表示になります）")) return;
    try {
      sessionStorage.setItem("board-admin", key);
    } catch {}
    const res = await fetch(`${API}?id=${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${key}` } });
    if (res.ok) load();
    else window.alert(res.status === 401 ? "管理キーが違います。" : "削除に失敗しました。");
  }

  const ready = Boolean(siteKey) && state !== "notready";

  return (
    <div className="board">
      <h1>選手＆スタッフ交流掲示板</h1>
      <p className="board-lead">第3回大会（2026年）専用の掲示板です。選手とスタッフの連絡・相談・交流にご利用ください。</p>

      <div className="board-notice" role="note">
        <Icon name="info" />
        <div>
          <strong>ご利用にあたって</strong>
          <ul>
            <li>このページは検索エンジンに表示されませんが、URLを知っている方は誰でも閲覧できます。</li>
            <li>電話番号・住所・メールアドレスなどの個人情報は書き込まないでください。</li>
            <li>ほかの方が不快になる投稿や宣伝は、運営が削除することがあります。</li>
          </ul>
        </div>
      </div>

      <section className="board-card" aria-labelledby="board-new">
        <h2 id="board-new">新しく書き込む</h2>
        {ready ? (
          <Form siteKey={siteKey} parentId={null} label="文章" max={POST_MAX} onDone={load} />
        ) : (
          <p className="board-wait">現在、書き込みの準備中です。しばらくお待ちください。</p>
        )}
      </section>

      {admin && (
        <div className="board-admin">
          <label htmlFor="board-key">管理キー（運営用）</label>
          <input id="board-key" type="password" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" />
        </div>
      )}

      <div className="board-listhead">
        <h2>書き込み一覧</h2>
        {state === "ok" && <span>{posts.length}件・新しい順</span>}
      </div>

      {state === "loading" && <p className="board-empty">読み込み中…</p>}
      {state === "error" && (
        <p className="board-empty">
          読み込めませんでした。<button className="board-link" type="button" onClick={load}>もう一度読み込む</button>
        </p>
      )}
      {state === "ok" && posts.length === 0 && <p className="board-empty">まだ書き込みはありません。最初の1件をどうぞ。</p>}

      {state === "ok" &&
        posts.map((p) => (
          <article className="board-post" key={p.id}>
            <div className="board-ph">
              <span className="board-name">{p.name}</span>
              <time dateTime={p.createdAt}>{when(p.createdAt)}</time>
            </div>
            <p className="board-body">{p.body}</p>
            <div className="board-actions">
              <button className="btn btn-line board-sub" type="button" onClick={() => setReplyTo(replyTo === p.id ? null : p.id)}>
                <Icon name="reply" />
                返信する{p.replies.length ? `（${p.replies.length}）` : ""}
              </button>
              {admin && (
                <button className="board-cancel" type="button" onClick={() => remove(p.id)}>
                  削除
                </button>
              )}
            </div>
            {(p.replies.length > 0 || replyTo === p.id) && (
              <div className="board-replies">
                {p.replies.map((r) => (
                  <div className="board-reply" key={r.id}>
                    <div className="board-ph">
                      <span className="board-name">{r.name}</span>
                      <time dateTime={r.createdAt}>{when(r.createdAt)}</time>
                      {admin && (
                        <button className="board-cancel" type="button" onClick={() => remove(r.id)}>
                          削除
                        </button>
                      )}
                    </div>
                    <p className="board-body">{r.body}</p>
                  </div>
                ))}
                {replyTo === p.id && ready && (
                  <div className="board-rform">
                    <div className="board-to">{p.name}さんの投稿に返信</div>
                    <Form
                      siteKey={siteKey}
                      parentId={p.id}
                      label="返信"
                      max={REPLY_MAX}
                      onDone={() => {
                        setReplyTo(null);
                        load();
                      }}
                      onCancel={() => setReplyTo(null)}
                    />
                  </div>
                )}
              </div>
            )}
          </article>
        ))}
    </div>
  );
}
