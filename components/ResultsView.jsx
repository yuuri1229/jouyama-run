"use client";

import { useState } from "react";

// リザルトの切替表示。上段で大会（第2回／第1回）、下段で種目を選ぶ。
// データは data/results.js。表彰対象の強調はしない（全員同じ見た目）。
// 距離は数値のみ（比率バーは付けない）。

const fmt = (n) => n.toFixed(1);
const sexLabel = (sex, rank) =>
  sex ? `${sex === "M" ? "男子" : "女子"} ${rank}位` : "";

function DistanceCell({ km }) {
  return (
    <td className="res-dist">
      <span className="res-km">
        {fmt(km)}
        <small>km</small>
      </span>
    </td>
  );
}

function ResultTable({ category }) {
  const { columns, rows } = category;
  const dist = (r) => r[r.length - 1];

  if (columns === "full") {
    const hasSex = rows.some((r) => r[3]);
    return (
      <table className="res-table">
        <thead>
          <tr>
            <th scope="col">順位</th>
            <th scope="col">氏名</th>
            <th scope="col" className="res-wide">居住地</th>
            <th scope="col" className="res-num">距離</th>
            {hasSex ? <th scope="col" className="res-wide">男女別</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map(([rank, name, home, sex, sexRank, km]) => (
            <tr key={rank}>
              <td className="res-rank">{rank}</td>
              <td className="res-name">
                {name}
                <span className="res-sub">
                  {home}
                  {sex ? `・${sexLabel(sex, sexRank)}` : ""}
                </span>
              </td>
              <td className="res-wide">{home}</td>
              <DistanceCell km={km} />
              {hasSex ? (
                <td className="res-wide res-sex">{sexLabel(sex, sexRank)}</td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  const twoLaps = columns === "laps2";
  return (
    <table className="res-table">
      <thead>
        <tr>
          <th scope="col">順位</th>
          <th scope="col">氏名</th>
          {twoLaps ? (
            <>
              <th scope="col" className="res-wide res-num">昼 周回</th>
              <th scope="col" className="res-wide res-num">夜 周回</th>
            </>
          ) : (
            <th scope="col" className="res-wide res-num">周回</th>
          )}
          <th scope="col" className="res-num">距離</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r[0]}>
            <td className="res-rank">{r[0]}</td>
            <td className="res-name">{r[1]}</td>
            <td className="res-wide res-num">{r[2]}</td>
            {twoLaps ? <td className="res-wide res-num">{r[3]}</td> : null}
            <DistanceCell km={dist(r)} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ResultsView({ editions }) {
  const [edIndex, setEdIndex] = useState(0);
  const [catIndex, setCatIndex] = useState(0);
  const edition = editions[edIndex];
  const category = edition.categories[catIndex] ?? edition.categories[0];
  const max = Math.max(...category.rows.map((r) => r[r.length - 1]));

  return (
    <div className="results">
      <div className="res-editions" role="group" aria-label="大会を選ぶ">
        {editions.map((ed, i) => (
          <button
            key={ed.id}
            type="button"
            aria-pressed={i === edIndex}
            onClick={() => {
              setEdIndex(i);
              setCatIndex(0);
            }}
          >
            {ed.label}
            <small>
              {ed.year}
              {ed.sub ? `・${ed.sub}` : ""}
            </small>
          </button>
        ))}
      </div>

      <div className="res-tabs" role="group" aria-label="種目を選ぶ">
        {edition.categories.map((c, i) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={c === category}
            onClick={() => setCatIndex(i)}
          >
            {c.name}
            {c.startLabel ? (
              <span className={`res-start res-start--${c.start}`}>
                {c.startLabel}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <h2 className="visually-hidden" aria-live="polite">
        {edition.label}（{edition.year}）{category.name}
        {category.startLabel ?? ""} の結果
      </h2>

      <p className="res-meta">
        <span>
          記録者 <b>{category.rows.length}</b> 名
        </span>
        <span>
          最長距離 <b>{fmt(max)}</b> km
        </span>
      </p>

      <div className="res-card">
        <ResultTable category={category} />
      </div>

      {edition.note ? <p className="res-note">{edition.note}</p> : null}
    </div>
  );
}
