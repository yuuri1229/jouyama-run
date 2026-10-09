"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { entryStatus } from "../lib/event";

// =========================================================
// エントリー受付状態を「ブラウザの現在時刻」で出し分ける
// ---------------------------------------------------------
// このサイトは静的書き出しなので、受付中／受付終了の判定をビルド時だけで
// 行うと、締切を過ぎてもページを開き直すまで「受付中」のままになる。
// そこで <EntryClock> が1分ごとに現在時刻で再判定し、配下の部品へ配る。
//
// 使い方（server component から使えるよう、中身は children で受け取る）
//   <EntryClock builtAt={Date.now()}> ... </EntryClock>
//   <EntryLabel />                 受付状態の文言
//   <EntryChip />                  「受付中・あと◯日」などの短い表示
//   <DaysLeft />                   締切までの残り日数（数字だけ）
//   <WhenEntryOpen>…</WhenEntryOpen>  受付中のときだけ children を出す
//
// 最初の描画はビルド時刻（builtAt）で行う。サーバーで書き出したHTMLと
// 同じ結果になるので、ハイドレーションで内容がずれない。
// =========================================================

const TICK = 60 * 1000; // 再判定の間隔（ミリ秒）

const EntryStatusContext = createContext(null);

export function EntryClock({ builtAt, children }) {
  const [status, setStatus] = useState(() => entryStatus(new Date(builtAt)));

  useEffect(() => {
    const tick = () =>
      setStatus((prev) => {
        const next = entryStatus(new Date());
        // 状態も残り日数も変わらないときは同じ参照を返し、無駄な再描画を避ける
        return next.state === prev.state && next.daysLeft === prev.daysLeft
          ? prev
          : next;
      });
    tick();
    const id = setInterval(tick, TICK);
    // 裏のタブではタイマーが間引かれるので、戻ってきた瞬間に判定し直す
    const onVisible = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return (
    <EntryStatusContext.Provider value={status}>
      {children}
    </EntryStatusContext.Provider>
  );
}

export function useEntryStatus() {
  const status = useContext(EntryStatusContext);
  if (!status) {
    throw new Error("useEntryStatus は <EntryClock> の内側で使ってください");
  }
  return status;
}

// 「エントリー受付中｜2026年11月13日(金)まで」の後半（日付）は
// 1かたまりで折り返す。狭い画面で「(金)まで」だけが次の行に落ちないように。
export function EntryLabel() {
  const [state, until] = useEntryStatus().label.split("｜");
  if (!until) return state;
  return (
    <>
      {state}｜<span className="ph">{until}</span>
    </>
  );
}

export function EntryChip() {
  return useEntryStatus().chip;
}

export function DaysLeft() {
  return useEntryStatus().daysLeft;
}

export function WhenEntryOpen({ children }) {
  return useEntryStatus().open ? children : null;
}
