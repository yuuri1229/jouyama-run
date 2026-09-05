"use client";

import { useEffect, useRef, useState } from "react";
import { asset, SITE } from "../lib/site";
import { HERO_LCP_IMAGE, HERO_WIDTHS, webpSrcSet } from "../lib/assets";
import { EVENT, LABEL } from "../lib/event";

const SLIDE_INTERVAL = 5000; // 写真の切り替え間隔（ミリ秒）

// 写真は <picture> で出し分ける。CSSのbackground-imageだった頃は
// 画面幅に関わらず1920px幅の1枚しか選べなかったが、srcsetにすると
// スマホには960px幅の軽いものが届く。
const SLIDES = [
  HERO_LCP_IMAGE,
  "/img/hero-2.jpg",
  "/img/hero-3.jpg",
  "/img/hero-4.jpg",
].map((src) => ({
  jpg: asset(src),
  webp: webpSrcSet(src, HERO_WIDTHS, asset),
}));

// 「24:00:00」のような制限時間表記
const HOURS_LABEL = `${String(EVENT.race24.hours).padStart(2, "0")}:00:00`;

export default function Hero() {
  // current = 表示中、prev = 直前。prevはフェード中の下地として使う
  const [{ current, prev }, setSlide] = useState({ current: 0, prev: null });

  // DOMに置くスライド。初回表示は1枚だけにして、2枚目以降は
  // 「表示する前に」先回りして読み込ませる（下の先読みeffect）。
  const [mounted, setMounted] = useState(() => new Set([0]));

  // 読み込みが完了したスライド。まだ届いていない写真には切り替えない
  const readyRef = useRef(new Set());
  const pausedRef = useRef(false);
  const restartRef = useRef(null);
  const heroRef = useRef(null);
  const footRef = useRef(null);

  const goTo = (i) => {
    setSlide((s) => (s.current === i ? s : { current: i, prev: s.current }));
    setMounted((prevSet) =>
      prevSet.has(i) ? prevSet : new Set(prevSet).add(i)
    );
    restartRef.current?.(); // 手動で選んだ直後は5秒フルで見せる
  };

  // <img> が読み込み済みになったら記録する。
  // キャッシュ済みだと load イベントが来ないので complete も見る。
  const registerImg = (i) => (el) => {
    if (!el || readyRef.current.has(i)) return;
    const mark = () => readyRef.current.add(i);
    if (el.complete && el.naturalWidth > 0) return mark();
    // 読み込みに失敗した場合も、そこで自動送りが止まらないよう通す
    el.addEventListener("load", mark, { once: true });
    el.addEventListener("error", mark, { once: true });
  };

  // ---- 次の1枚を先読みする ----
  // 以前は「切り替える瞬間」に <img> を挿入していたため、そこから
  // ダウンロードが始まり、写真が届くまで背景の暗色が見えていた
  // （実測：Fast 3Gで約1秒、Slow 3Gで約3.5秒）。
  // 1枚目の読み込みが終わってから次を用意することで、初回表示を
  // 1枚に絞ったまま、切り替え時には読み込み済みの状態にする。
  const [canPreload, setCanPreload] = useState(false);
  useEffect(() => {
    if (document.readyState === "complete") {
      setCanPreload(true);
      return;
    }
    const on = () => setCanPreload(true);
    window.addEventListener("load", on, { once: true });
    // load が来ない環境でも先読みが止まらないよう保険をかける
    const t = setTimeout(on, 3000);
    return () => {
      window.removeEventListener("load", on);
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (!canPreload) return;
    const next = (current + 1) % SLIDES.length;
    setMounted((prevSet) =>
      prevSet.has(next) ? prevSet : new Set(prevSet).add(next)
    );
  }, [canPreload, current]);

  // ---- 自動送り ----
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const hero = heroRef.current;
    const foot = footRef.current;
    let id = null;

    const advance = () =>
      setSlide((s) => {
        const next = (s.current + 1) % SLIDES.length;
        // まだ読み込めていない写真には切り替えない（暗転を防ぐ）
        if (!readyRef.current.has(next)) return s;
        return { current: next, prev: s.current };
      });

    const stop = () => {
      if (id !== null) clearInterval(id);
      id = null;
    };
    const start = () => {
      stop();
      if (reduce.matches || pausedRef.current || document.hidden) return;
      id = setInterval(advance, SLIDE_INTERVAL);
    };
    restartRef.current = start;

    const pause = () => {
      pausedRef.current = true;
      stop();
    };
    const resume = () => {
      pausedRef.current = false;
      start();
    };

    // マウスで「操作部（ラップ表記とドットの帯）」に乗ったときだけ止める。
    // 以前は写真全体＝ほぼ画面全域で止めていたため、マウスが乗って
    // いるだけで送りが止まり、離すたびに5秒を数え直していた。
    const onEnter = (e) => e.pointerType === "mouse" && pause();
    const onLeave = (e) => e.pointerType === "mouse" && resume();

    // キーボード操作のときだけ止める。タップでも focusin は発火するため、
    // :focus-visible で絞らないとスマホで送りが止まったままになる。
    const onFocusIn = (e) => {
      if (e.target?.matches?.(":focus-visible")) pause();
    };

    foot?.addEventListener("pointerenter", onEnter);
    foot?.addEventListener("pointerleave", onLeave);
    hero?.addEventListener("focusin", onFocusIn);
    hero?.addEventListener("focusout", resume);
    // 裏のタブでは止め、戻ってきたら5秒を数え直す（位相を揃える）
    document.addEventListener("visibilitychange", start);
    reduce.addEventListener("change", start);

    start();
    return () => {
      stop();
      restartRef.current = null;
      foot?.removeEventListener("pointerenter", onEnter);
      foot?.removeEventListener("pointerleave", onLeave);
      hero?.removeEventListener("focusin", onFocusIn);
      hero?.removeEventListener("focusout", resume);
      document.removeEventListener("visibilitychange", start);
      reduce.removeEventListener("change", start);
    };
  }, []);

  return (
    <section className="hero" ref={heroRef}>
      <div className="hero-media" aria-hidden="true">
        {SLIDES.map((slide, i) =>
          mounted.has(i) ? (
            <picture
              key={slide.jpg}
              className={
                "hero-slide" +
                (i === current ? " is-active" : "") +
                (i === prev ? " is-prev" : "")
              }
            >
              <source type="image/webp" srcSet={slide.webp} sizes="100vw" />
              <img
                ref={registerImg(i)}
                src={slide.jpg}
                alt=""
                width="1920"
                height="1440"
                // 1枚目はLCP要素なので最優先。2枚目以降は先読みなので後回し
                fetchPriority={i === 0 ? "high" : "low"}
                decoding={i === 0 ? "sync" : "async"}
              />
            </picture>
          ) : null
        )}
        <div className="hero-scrim" />
      </div>

      <div className="hero-body">
        <p className="hero-bib">
          <span>
            <b>NIIGATA</b> / JOYAMA PARK
          </span>
          <span>
            <b>{LABEL.bibDate}</b>
          </span>
        </p>

        <h1 className="hero-num-row" aria-label="24時間走と12時間走">
          <span className="fig">24</span>
          <span className="slash" aria-hidden="true">
            /
          </span>
          <span className="fig">12</span>
          <span className="unit">
            時間走<small>TIMED RUN</small>
          </span>
        </h1>

        <p className="hero-lede">
          1周約{EVENT.lapMeters}mの周回コースを、決められた<b>時間</b>のなかで。
          <br className="pc" />
          歩いても、休んでも構いません。ウォーカーの参加も歓迎
        </p>

        <div className="hero-actions">
          <a
            className="btn btn-primary"
            href={SITE.entryFormUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            エントリーする
            <span className="material-symbols-outlined" aria-hidden="true">
              arrow_outward
            </span>
          </a>
          <a className="btn btn-ghost" href="#outline">
            大会概要を見る
            <span className="material-symbols-outlined" aria-hidden="true">
              arrow_downward
            </span>
          </a>
        </div>
      </div>

      <div className="hero-foot" ref={footRef}>
        <div className="lap-strip">
          <span>LAP {EVENT.lapMeters}m</span>
          <i aria-hidden="true"></i>
          <span aria-hidden="true">×</span>
          <i aria-hidden="true"></i>
          <b>{HOURS_LABEL}</b>
        </div>
        {/* 写真は装飾（hero-mediaはaria-hidden）なので、ドットは
            タブではなく「今どれを見せるか」の選択ボタンとして扱う。 */}
        <div className="hero-dots" role="group" aria-label="ヒーロー写真の切り替え">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.jpg}
              type="button"
              className={i === current ? "is-active" : ""}
              aria-label={`${i + 1}枚目の写真を表示`}
              aria-pressed={i === current}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
