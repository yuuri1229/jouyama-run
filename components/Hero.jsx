"use client";

import { useEffect, useState } from "react";
import { asset, SITE } from "../lib/site";

const SLIDE_INTERVAL = 5000; // 写真の切り替え間隔（ミリ秒）

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
      <div className="hero-media" aria-hidden="true">
        {SLIDES.map((src, i) => (
          <div
            key={src}
            className={`hero-slide${i === current ? " is-active" : ""}`}
            style={{ backgroundImage: `url('${src}')` }}
          />
        ))}
        <div className="hero-scrim" />
      </div>

      <div className="hero-body">
        <p className="hero-bib">
          <span>
            <b>NIIGATA</b> / JOYAMA PARK
          </span>
          <span>
            <b>2026.11.22 SUN — 11.23 MON</b>
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
          1周約960mの周回コースを、決められた<b>時間</b>のなかで。
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
          <span>LAP 960m</span>
          <i aria-hidden="true"></i>
          <span aria-hidden="true">×</span>
          <i aria-hidden="true"></i>
          <b>24:00:00</b>
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
      </div>
    </section>
  );
}
