import Link from "next/link";
import Hero from "../components/Hero";
import Reveal from "../components/Reveal";
import { getNewsItems } from "../lib/microcms";
import { asset, SITE } from "../lib/site";
import { GALLERY_WIDTHS, webpSrcSet } from "../lib/assets";
import {
  EVENT,
  LABEL,
  entryStatus,
  formatDateTime,
  formatDayTime,
} from "../lib/event";

const NEWS_ON_TOP = 3; // トップに表示するお知らせの件数

export default async function HomePage() {
  const newsItems = await getNewsItems();
  const entry = entryStatus();

  return (
    <>
      <Hero />

      <main id="main">
        {/* ================= 1. 最新情報 ================= */}
        <section className="section" id="news">
          <div className="container">
            <Reveal as="header" className="sec-head">
              <p className="sec-eyebrow">
                <span className="material-symbols-outlined" aria-hidden="true">
                  campaign
                </span>
                NEWS
              </p>
              <h2 className="sec-title">最新情報</h2>
            </Reveal>

            <ul className="news-list">
              {newsItems.slice(0, NEWS_ON_TOP).map((item) => (
                <Reveal as="li" key={item.id}>
                  <Link className="news-link" href={`/news/${item.id}/`}>
                    <time dateTime={item.date}>{item.dateLabel}</time>
                    <span className="news-tag">{item.tag}</span>
                    <span className="news-text">{item.title}</span>
                    <span
                      className="material-symbols-outlined news-arrow"
                      aria-hidden="true"
                    >
                      chevron_right
                    </span>
                  </Link>
                </Reveal>
              ))}
            </ul>

            <Reveal className="sec-more">
              <Link className="text-arrow" href="/news/">
                最新情報一覧
                <span className="material-symbols-outlined" aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
            </Reveal>
          </div>
        </section>

        {/* ================= 2. 大会概要 ================= */}
        <section className="section section-mist" id="outline">
          <div className="container">
            <Reveal as="header" className="sec-head">
              <p className="sec-eyebrow">
                <span className="material-symbols-outlined" aria-hidden="true">
                  flag
                </span>
                OUTLINE
              </p>
              <h2 className="sec-title">大会概要</h2>
            </Reveal>

            <Reveal as="dl" className="outline-table">
              <div className="outline-row">
                <dt>
                  <span className="material-symbols-outlined" aria-hidden="true">
                    calendar_month
                  </span>
                  開催日
                </dt>
                <dd>{LABEL.eventDateRange}</dd>
              </div>
              <div className="outline-row">
                <dt>
                  <span className="material-symbols-outlined" aria-hidden="true">
                    location_on
                  </span>
                  開催場所
                </dt>
                <dd>
                  {LABEL.address}
                  <br />
                  <a
                    className="text-arrow small"
                    href={SITE.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google Mapで開く
                    <span
                      className="material-symbols-outlined"
                      aria-hidden="true"
                    >
                      open_in_new
                    </span>
                  </a>
                </dd>
              </div>
              <div className="outline-row">
                <dt>
                  <span className="material-symbols-outlined" aria-hidden="true">
                    edit_calendar
                  </span>
                  エントリー期間
                </dt>
                <dd>{LABEL.entryPeriod}</dd>
              </div>
              <div className="outline-row">
                <dt>
                  <span className="material-symbols-outlined" aria-hidden="true">
                    payments
                  </span>
                  参加費
                </dt>
                <dd>
                  {LABEL.fees}
                  <br />
                  <small>
                    （施設利用料、エイド利用料、スポーツ保険加入代、人件費、運営費等）
                  </small>
                  <br />
                  <small>
                    参加費は銀行振込です。エントリー後、メールにて入金方法のご連絡を差し上げます。
                  </small>
                </dd>
              </div>
              <div className="outline-row">
                <dt>
                  <span className="material-symbols-outlined" aria-hidden="true">
                    groups
                  </span>
                  主催
                </dt>
                <dd>
                  {EVENT.organizer.name}
                  <br />
                  実行委員長　{EVENT.organizer.chair}
                </dd>
              </div>
            </Reveal>

            {/* 種目 */}
            <Reveal as="h3" className="sub-title">
              <span className="material-symbols-outlined" aria-hidden="true">
                directions_run
              </span>
              競技種目
            </Reveal>

            <div className="race-cards">
              <Reveal as="article" className="race-card">
                <div className="race-head">
                  <p className="race-num">
                    24<span>時間走</span>
                  </p>
                  <p className="race-cap">募集 {EVENT.race24.capacity}名</p>
                </div>
                <div
                  className="timeband"
                  role="img"
                  aria-label={`${formatDateTime(
                    EVENT.race24.startAt
                  )}スタート、夜間を挟んで${formatDateTime(
                    EVENT.race24.finishAt
                  )}まで`}
                >
                  <div className="timeband-bar band-24" />
                  <div className="timeband-labels">
                    <span>
                      {formatDayTime(EVENT.race24.startAt)}
                      <br />
                      <small>スタート</small>
                    </span>
                    <span>
                      {formatDayTime(EVENT.race24.finishAt)}
                      <br />
                      <small>制限時間</small>
                    </span>
                  </div>
                </div>
                <ul className="race-spec">
                  <li>
                    <span
                      className="material-symbols-outlined"
                      aria-hidden="true"
                    >
                      timer
                    </span>
                    スタート：{formatDateTime(EVENT.race24.startAt)}
                  </li>
                  <li>
                    <span
                      className="material-symbols-outlined"
                      aria-hidden="true"
                    >
                      sports_score
                    </span>
                    制限時間：{formatDateTime(EVENT.race24.finishAt)}
                  </li>
                  <li>
                    <span
                      className="material-symbols-outlined"
                      aria-hidden="true"
                    >
                      verified
                    </span>
                    エントリー資格：{EVENT.race24.qualification}
                  </li>
                </ul>
              </Reveal>

              <Reveal as="article" className="race-card race-card--12" delay={1}>
                <div className="race-head">
                  <p className="race-num">
                    12<span>時間走</span>
                  </p>
                  <p className="race-cap">デイ・ナイト 各{EVENT.race12.capacityEach}名</p>
                </div>
                <div
                  className="timeband"
                  role="img"
                  aria-label={`デイスタートは${formatDateTime(
                    EVENT.race12.day.startAt
                  )}から${formatDateTime(
                    EVENT.race12.day.finishAt
                  )}まで、ナイトスタートは${formatDateTime(
                    EVENT.race12.night.startAt
                  )}から${formatDateTime(EVENT.race12.night.finishAt)}まで`}
                >
                  <div className="timeband-bar band-12day" />
                  <div className="timeband-labels">
                    <span>
                      {formatDayTime(EVENT.race12.day.startAt)}
                      <br />
                      <small>デイスタート</small>
                    </span>
                    <span>
                      {formatDayTime(EVENT.race12.day.finishAt)}
                      <br />
                      <small>制限時間</small>
                    </span>
                  </div>
                  <div className="timeband-bar band-12night" />
                  <div className="timeband-labels">
                    <span>
                      {formatDayTime(EVENT.race12.night.startAt)}
                      <br />
                      <small>ナイトスタート</small>
                    </span>
                    <span>
                      {formatDayTime(EVENT.race12.night.finishAt)}
                      <br />
                      <small>制限時間</small>
                    </span>
                  </div>
                </div>
                <ul className="race-spec">
                  <li className="icon-day">
                    <span
                      className="material-symbols-outlined"
                      aria-hidden="true"
                    >
                      light_mode
                    </span>
                    デイスタート：{formatDateTime(EVENT.race12.day.startAt)}
                    （制限時間 {formatDateTime(EVENT.race12.day.finishAt)}）
                  </li>
                  <li className="icon-night">
                    <span
                      className="material-symbols-outlined"
                      aria-hidden="true"
                    >
                      dark_mode
                    </span>
                    ナイトスタート：{formatDateTime(EVENT.race12.night.startAt)}
                    （制限時間 {formatDateTime(EVENT.race12.night.finishAt)}）
                  </li>
                  <li>
                    <span
                      className="material-symbols-outlined"
                      aria-hidden="true"
                    >
                      verified
                    </span>
                    エントリー資格：{EVENT.race12.qualification}
                  </li>
                </ul>
              </Reveal>
            </div>
            <Reveal as="p" className="race-note">
              <span className="material-symbols-outlined" aria-hidden="true">
                directions_walk
              </span>
              両カテゴリにおけるウォーカーの参加歓迎
            </Reveal>

            {/* スケジュール */}
            <Reveal as="h3" className="sub-title">
              <span className="material-symbols-outlined" aria-hidden="true">
                schedule
              </span>
              イベントスケジュール
            </Reveal>
            <div className="schedule-grid">
              <Reveal className="schedule-col">
                <h4>24時間走</h4>
                <p className="sched-day">11月22日(日)</p>
                <table className="sched-table">
                  <tbody>
                    <tr>
                      <th>10:00–10:30</th>
                      <td>受付</td>
                    </tr>
                    <tr>
                      <th>11:30–</th>
                      <td>開会式（注意事項等説明）</td>
                    </tr>
                    <tr>
                      <th>12:00</th>
                      <td>スタート</td>
                    </tr>
                  </tbody>
                </table>
                <p className="sched-day">11月23日(祝)</p>
                <table className="sched-table">
                  <tbody>
                    <tr>
                      <th>12:00</th>
                      <td>制限時間</td>
                    </tr>
                    <tr>
                      <th>13:30–14:00</th>
                      <td>閉会式</td>
                    </tr>
                  </tbody>
                </table>
              </Reveal>
              <Reveal className="schedule-col" delay={1}>
                <h4>12時間走</h4>
                <p className="sched-day">11月22日(日)　＜デイスタート＞</p>
                <table className="sched-table">
                  <tbody>
                    <tr>
                      <th>10:00–10:30</th>
                      <td>受付</td>
                    </tr>
                    <tr>
                      <th>11:30–</th>
                      <td>開会式（注意事項等説明）</td>
                    </tr>
                    <tr>
                      <th>12:00</th>
                      <td>スタート</td>
                    </tr>
                  </tbody>
                </table>
                <p className="sched-day">11月22日(日)　＜ナイトスタート＞</p>
                <table className="sched-table">
                  <tbody>
                    <tr>
                      <th>22:10–22:40</th>
                      <td>受付</td>
                    </tr>
                    <tr>
                      <th>23:40–</th>
                      <td>開会式（注意事項等説明）</td>
                    </tr>
                  </tbody>
                </table>
                <p className="sched-day">11月23日(祝)</p>
                <table className="sched-table">
                  <tbody>
                    <tr>
                      <th>0:00</th>
                      <td>ナイトスタート／デイスタートの制限時間</td>
                    </tr>
                    <tr>
                      <th>0:30</th>
                      <td>賞品授与（デイスタート）</td>
                    </tr>
                    <tr>
                      <th>12:00</th>
                      <td>制限時間</td>
                    </tr>
                    <tr>
                      <th>13:30–14:00</th>
                      <td>閉会式・賞品授与</td>
                    </tr>
                  </tbody>
                </table>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ================= コース ================= */}
        <section className="section" id="course">
          <div className="container">
            <Reveal as="header" className="sec-head">
              <p className="sec-eyebrow">
                <span className="material-symbols-outlined" aria-hidden="true">
                  route
                </span>
                COURSE
              </p>
              <h2 className="sec-title">コース</h2>
            </Reveal>
            <div className="course-wrap">
              <Reveal as="figure" className="course-map">
                <img
                  src={asset("/img/coursemap.webp")}
                  alt="城山運動公園内の周回コースマップ。屋内コート前がスタート地点"
                  width="1200"
                  height="848"
                  loading="lazy"
                  decoding="async"
                />
              </Reveal>
              <Reveal className="course-info" delay={1}>
                <p className="course-stat">
                  <span className="stat-num">{EVENT.lapMeters}</span>
                  <span className="stat-unit">m／周</span>
                </p>
                <p>
                  {EVENT.venue.name}内をめぐる周回コース。屋内コート前がスタート地点です。
                </p>
                <ul className="course-points">
                  <li>
                    <span
                      className="material-symbols-outlined"
                      aria-hidden="true"
                    >
                      restaurant
                    </span>
                    エイド：豚汁、レトルト（カレー、ハヤシライス、親子丼、牛丼）、カップラーメン、おかゆ、パン、スープ類、味噌汁、菓子類、各種ドリンク等
                  </li>
                  <li>
                    <span
                      className="material-symbols-outlined"
                      aria-hidden="true"
                    >
                      home_work
                    </span>
                    管理棟は9時〜翌日15時まで利用可能（更衣室、浴室、和室4室ほか貸切）
                  </li>
                  <li>
                    <span
                      className="material-symbols-outlined"
                      aria-hidden="true"
                    >
                      battery_charging_full
                    </span>
                    1Fロビーに選手用の充電スペースあり
                  </li>
                </ul>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ================= フォト ================= */}
        <section className="photo-band" aria-label="大会の様子">
          <picture>
            <source
              type="image/webp"
              srcSet={webpSrcSet("/img/gallery-1.jpg", GALLERY_WIDTHS, asset)}
              sizes="(max-width: 700px) 50vw, 25vw"
            />
            <img
              src={asset("/img/gallery-1.jpg")}
              alt="屋内コートでの開会式の様子"
              width="1200"
              height="900"
              loading="lazy"
              decoding="async"
            />
          </picture>
          <picture>
            <source
              type="image/webp"
              srcSet={webpSrcSet("/img/gallery-2.jpg", GALLERY_WIDTHS, asset)}
              sizes="(max-width: 700px) 50vw, 25vw"
            />
            <img
              src={asset("/img/gallery-2.jpg")}
              alt="スタート前に集まる参加者"
              width="1200"
              height="900"
              loading="lazy"
              decoding="async"
            />
          </picture>
          <picture>
            <source
              type="image/webp"
              srcSet={webpSrcSet("/img/gallery-3.jpg", GALLERY_WIDTHS, asset)}
              sizes="(max-width: 700px) 50vw, 25vw"
            />
            <img
              src={asset("/img/gallery-3.jpg")}
              alt="管理棟での参加者ミーティング"
              width="1200"
              height="900"
              loading="lazy"
              decoding="async"
            />
          </picture>
          <picture>
            <source
              type="image/webp"
              srcSet={webpSrcSet("/img/gallery-4.jpg", GALLERY_WIDTHS, asset)}
              sizes="(max-width: 700px) 50vw, 25vw"
            />
            <img
              src={asset("/img/gallery-4.jpg")}
              alt="公園内の周回コース"
              width="1200"
              height="900"
              loading="lazy"
              decoding="async"
            />
          </picture>
        </section>

        {/* ================= エントリー ================= */}
        <section className="entry" id="entry">
          <div className="container">
            <Reveal className="entry-inner">
              <h2 className="entry-title">ENTRY</h2>
              {/* 受付状態はビルド時刻と lib/event.js の期間から判定する。
                  文言を直書きしていると、締切後もサイトが
                  「受付中」と言い続けてしまうため。 */}
              <p className="entry-lead">{entry.label}</p>
              <div className="entry-actions">
                {entry.open ? (
                  <a
                    className="btn btn-primary btn-lg"
                    href={SITE.entryFormUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    エントリーフォームへ
                    <span
                      className="material-symbols-outlined"
                      aria-hidden="true"
                    >
                      arrow_outward
                    </span>
                  </a>
                ) : null}
                <a
                  className="btn btn-line"
                  href={SITE.entryListUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  エントリーリストを見る
                  <span
                    className="material-symbols-outlined"
                    aria-hidden="true"
                  >
                    open_in_new
                  </span>
                </a>
              </div>
              <p className="entry-note">
                エントリーリストはエントリー確定後、随時更新します。
                {entry.state === "open"
                  ? `　定員は24時間走${EVENT.race24.capacity}名／12時間走デイ・ナイト各${EVENT.race12.capacityEach}名です。`
                  : null}
              </p>
              <div className="entry-kit">
                <h3>
                  <span
                    className="material-symbols-outlined"
                    aria-hidden="true"
                  >
                    checklist
                  </span>
                  必携品
                </h3>
                <p>
                  夜間走のためのライト／マイカップ／反射板や赤色灯／走行距離がわかるGPS付き時計やStravaアプリなど
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ================= ルール ================= */}
        <section className="section section-mist" id="rules">
          <div className="container">
            <Reveal as="header" className="sec-head">
              <p className="sec-eyebrow">
                <span className="material-symbols-outlined" aria-hidden="true">
                  gavel
                </span>
                RULES
              </p>
              <h2 className="sec-title">大会ルール</h2>
            </Reveal>

            <Reveal as="article" className="rule">
              <h3 className="rule-title">
                <span className="material-symbols-outlined" aria-hidden="true">
                  warning
                </span>
                注意事項
              </h3>
              <div className="rule-body">
                <ul>
                  <li>
                    歩道を走り、一般歩行者の妨げにならないように声かけをして外側を追い越してください。
                  </li>
                  <li>
                    応援ランは逆走でお願いいたします。（選手との並走は助力とみなされ表彰対象外となります）
                  </li>
                  <li>
                    夜間（17時頃〜翌6時頃）は車に十分注意しながら、車道の端を走行しても構いません。車道の中央に出ないようご注意ください。
                  </li>
                  <li>
                    日中は一般利用者も大勢いらっしゃいます。車や一般利用者に十分注意して走行して下さい。
                  </li>
                  <li>
                    コース上での仮眠は禁止です。仮眠は管理棟か各自の車内でお願いいたします。
                  </li>
                  <li>個人テントは設置可能な場所でお願いいたします。</li>
                  <li>火気は使用禁止です。</li>
                  <li>
                    スタッフの指示に従えない場合は失格になり、DNFとなります。
                  </li>
                  <li>
                    管理棟は飲酒禁止です。アルコールは各自の車内にてお願いいたします。
                  </li>
                </ul>
                <p className="rule-em">
                  ※{EVENT.year}年の本大会において、上記に反する行為があった場合は
                  {EVENT.year + 1}年への参加をお断りさせていただきます。
                </p>
              </div>
            </Reveal>

            <Reveal as="article" className="rule" delay={1}>
              <h3 className="rule-title">
                <span className="material-symbols-outlined" aria-hidden="true">
                  timer
                </span>
                計測について
              </h3>
              <div className="rule-body">
                <ul>
                  <li>計測は各自の時計の距離計測機能を用いて行います。</li>
                  <li>
                    計測はスタートから3時間毎に、管理棟前で待機している計測スタッフにその時の距離を申告します。
                  </li>
                  <li>
                    各自の時計による距離の誤差は、本部にて修正後、正式な記録として管理棟内に表示します。
                  </li>
                  <li>
                    管理棟内に入る際は、必ず時計の計測を一旦停止して下さい。再スタートの際は、お忘れなく計測をスタートさせて下さい。
                  </li>
                  <li>
                    制限時間直前に周回ラインを通過した場合は、1周回後、再び周回ラインに戻って来るまでの距離を正式な完走距離とします。
                  </li>
                </ul>
              </div>
            </Reveal>

            <Reveal as="article" className="rule" delay={2}>
              <h3 className="rule-title">
                <span className="material-symbols-outlined" aria-hidden="true">
                  info
                </span>
                その他・会場のご案内
              </h3>
              <div className="rule-body">
                <ul>
                  <li>
                    エイド食は豚汁、レトルト（カレー、ハヤシライス、親子丼、牛丼）、カップラーメン、おかゆ、パン、スープ類、インスタント味噌汁、菓子類、パスタスープ、各種ドリンク等です。各エイド食には数に限りがあります。その他必要と思われる補給食は各自ご用意下さい。
                  </li>
                  <li>管理棟は9時〜翌日15時まで利用可能です。</li>
                  <li>
                    更衣室、トイレ、給湯室、浴室、和室4室、会議室を貸し切ります。
                  </li>
                  <li>
                    1Fのロビー、トイレは一般の方との共同スペースです。ロビーの指定された場所以外に私物を置かないで下さい。
                  </li>
                  <li>個人の大きな荷物は2Fに置いてください。</li>
                  <li>
                    仮眠室はありません。個人的に仮眠される場合は、各自の車か、邪魔にならないスペースでお願いします。（寝具はありません）
                  </li>
                  <li>
                    1Fのホール以外で仮眠する場合は必ず計測スタッフに連絡して下さい。
                  </li>
                  <li>
                    浴室にシャンプー、リンス、石鹸、ドライヤーはありません。
                  </li>
                  <li>貴重品は各自の管理でお願いいたします。</li>
                  <li>
                    ゼッケン用安全ピンをお持ちの方はご持参下さい。（多少ご用意しています。）
                  </li>
                  <li>
                    1Fロビーに選手用の充電スペースをご用意しています。ご自由にお使いください。
                  </li>
                </ul>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
    </>
  );
}
