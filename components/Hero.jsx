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
  const [current, setCurrent] = useState(0);
  // 一度でも表示したスライドだけをDOMに出す。最初から4枚ぶんの
  // background-image を並べると、初回表示で写真4枚（約2.7MB）を
  // 同時に取りに行ってしまい、肝心の1枚目の表示が遅れる。
  const [loaded, setLoaded] = useState(() => new Set([0]));
  const [paused, setPaused] = useState(false);
  const heroRef = useRef(null);

  const show = (i) => {
    setCurrent(i);
    setLoaded((prev) => (prev.has(i) ? prev : new Set(prev).add(i)));
  };

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion || paused) return;

    const timer = setInterval(() => {
      // 裏のタブでは切り替えない（無駄な通信と再描画を避ける）
      if (document.hidden) return;
      show((current + 1) % SLIDES.length);
    }, SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, [current, paused]);

  // 操作中（ホバー／キーボードフォーカス）は自動送りを止める
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const stop = () => setPaused(true);
    const start = () => setPaused(false);
    el.addEventListener("mouseenter", stop);
    el.addEventListener("mouseleave", start);
    el.addEventListener("focusin", stop);
    el.addEventListener("focusout", start);
    return () => {
      el.removeEventListener("mouseenter", stop);
      el.removeEventListener("mouseleave", start);
      el.removeEventListener("focusin", stop);
      el.removeEventListener("focusout", start);
    };
  }, []);

  return (
    <section className="hero" ref={heroRef}>
      <div className="hero-media" aria-hidden="true">
        {SLIDES.map((slide, i) =>
          loaded.has(i) ? (
            <picture
              key={slide.jpg}
              className={`hero-slide${i === current ? " is-active" : ""}`}
            >
              <source type="image/webp" srcSet={slide.webp} sizes="100vw" />
              <img
                src={slide.jpg}
                alt=""
                width="1920"
                height="1440"
                // 1枚目はLCP要素なので最優先で、2枚目以降は
                // 切り替わる直前に読み込まれるので後回しでよい
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

      <div className="hero-foot">
        <div className="lap-strip">
          <span>LAP {EVENT.lapMeters}m</span>
          <i aria-hidden="true"></i>
          <span aria-hidden="true">×</span>
          <i aria-hidden="true"></i>
          <b>{HOURS_LABEL}</b>
        </div>
        {/* 写真は装飾（hero-mediaはaria-hidden）なので、ドットは
            タブではなく「今どれを見せるか」の選択ボタンとして扱う。
            以前は role="tablist" だけ付いていて中身にrole="tab"が無く、
            支援技術には壊れたタブとして伝わっていた。 */}
        <div className="hero-dots" role="group" aria-label="ヒーロー写真の切り替え">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.jpg}
              type="button"
              className={i === current ? "is-active" : ""}
              aria-label={`${i + 1}枚目の写真を表示`}
              aria-pressed={i === current}
              onClick={() => show(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
