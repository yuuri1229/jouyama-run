"use client";

import { useEffect, useState } from "react";
import { asset, SITE } from "../lib/site";

const SLIDE_INTERVAL = 5000; // 切り替え間隔（ミリ秒）

const SLIDES = [
  asset("/img/hero-1.jpg"),
  asset("/img/hero-2.jpg"),
  asset("/img/hero-3.jpg"),
  asset("/img/hero-4.jpg"),
];

export default function Hero() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion) return;

    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % SLIDES.length);
    }, SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="hero">
      <div className="hero-slides" aria-hidden="true">
        {SLIDES.map((src, i) => (
          <div
            key={src}
            className={`hero-slide${i === current ? " is-active" : ""}`}
            style={{ backgroundImage: `url('${src}')` }}
          />
        ))}
      </div>
      <div className="hero-shade" />

      <div className="hero-body">
        <p className="hero-eyebrow">
          2026.11.22 <span>SUN</span> — 11.23 <span>MON・祝</span>
          ｜新潟市西蒲区・城山運動公園
        </p>
        <h1 className="hero-title">
          <span className="hero-place">新潟・城山運動公園</span>
          <span className="hero-num">
            24<em>&amp;</em>12<span className="hero-unit">時間走</span>
          </span>
        </h1>
        <p className="hero-lead">
          1周約960mの周回コースを、昼も、夜も、自分のペースで。
          <br className="pc" />
          ウォーカーの参加も歓迎します。
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
        <p className="hero-note">
          エントリー期間：2026年6月1日(月)〜11月13日(金)
        </p>
      </div>

      <div className="hero-dots" role="tablist" aria-label="写真の切り替え">
        {SLIDES.map((src, i) => (
          <button
            key={src}
            type="button"
            className={i === current ? "is-active" : ""}
            aria-label={`${i + 1}枚目の写真を表示`}
            onClick={() => setCurrent(i)}
          />
        ))}
      </div>
    </section>
  );
}
