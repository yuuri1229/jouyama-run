import Link from "next/link";
import { preload } from "react-dom";
import Hero from "../components/Hero";
import Icon from "../components/Icon";
import Reveal from "../components/Reveal";
import {
  EntryClock,
  EntryLabel,
  EntryChip,
  DaysLeft,
  WhenEntryOpen,
} from "../components/EntryClock";
import StickyEntryBar from "../components/StickyEntryBar";
import { getNewsItems } from "../lib/microcms";
import { asset, SITE } from "../lib/site";
import {
  GALLERY_WIDTHS,
  HERO_LCP_IMAGE,
  HERO_WIDTHS,
  IMAGE_FORMATS,
  imageSrcSet,
} from "../lib/assets";
import { skyGradient, skyMarkers } from "../lib/sky";
import {
  EVENT,
  LABEL,
  formatDate,
  formatDateTime,
  formatDayTime,
} from "../lib/event";

const NEWS_ON_TOP = 3; // トップに表示するお知らせの件数

// フォトバンドの写真（public/img/ の元jpgと説明文）
const GALLERY = [
  { src: "/img/gallery-1.jpg", alt: "屋内コートでの開会式の様子" },
  { src: "/img/gallery-2.jpg", alt: "スタート前に集まる参加者" },
  { src: "/img/gallery-3.jpg", alt: "管理棟での参加者ミーティング" },
  { src: "/img/gallery-4.jpg", alt: "公園内の周回コース" },
];

// セクション見出し「01 ─ [icon] NEWS ／ 最新情報」。番号は上から順に振る
function SectionHead({ num, icon, en, title }) {
  return (
    <Reveal as="header" className="sec-head">
      <p className="sec-eyebrow">
        <span className="sec-num">{num}</span>
        <span className="sec-bar" aria-hidden="true" />
        <Icon name={icon} />
        {en}
      </p>
      <h2 className="sec-title">{title}</h2>
    </Reveal>
  );
}

// 種目カードの時間帯バー。左端が開始、右端が終了。
// 空の色は実際の日の入り・日の出から組み立て（lib/sky.js）、
// 帯の上に日没・日の出の時刻を目印として添える。
function TimeBand({ startAt, endAt, startNote, endNote, second = false }) {
  const marks = skyMarkers(startAt, endAt);
  return (
    <>
      <div
        className={`timeband-marks${second ? " timeband-marks--second" : ""}`}
        aria-hidden="true"
      >
        {marks.map((m) => (
          <span key={m.label} style={{ left: `${m.pct}%` }}>
            {m.label} {m.time}
          </span>
        ))}
      </div>
      <div
        className="timeband-bar"
        style={{ background: skyGradient(startAt, endAt) }}
      >
        {marks.map((m) => (
          <i key={m.label} aria-hidden="true" style={{ left: `${m.pct}%` }} />
        ))}
      </div>
      <div className="timeband-labels">
        <span>
          {formatDayTime(startAt)}
          <br />
          <small>{startNote}</small>
        </span>
        <span>
          {formatDayTime(endAt)}
          <br />
          <small>{endNote}</small>
        </span>
      </div>
    </>
  );
}

export default async function HomePage() {
  // ファーストビューの写真（LCP要素）を、HTMLを読んだ直後から取りに行く。
  // 以前は共通レイアウトで指定していたため、ヒーローの無い最新情報ページでも
  // 使わない写真をダウンロードしていた。対応形式のうち最も軽い AVIF を先読みする
  // （非対応のブラウザは type を見て先読みを飛ばし、通常どおり WebP を読む）。
  preload(asset(HERO_LCP_IMAGE), {
    as: "image",
    type: `image/${IMAGE_FORMATS[0]}`,
    imageSrcSet: imageSrcSet(HERO_LCP_IMAGE, HERO_WIDTHS, IMAGE_FORMATS[0], asset),
    imageSizes: "100vw",
    fetchPriority: "high",
  });

  const newsItems = await getNewsItems();
  // 受付中／受付終了はブラウザ側で現在時刻から再判定する（EntryClock）。
  // 最初の描画はこのビルド時刻で行い、書き出したHTMLと揃える。
  const builtAt = Date.now();

  return (
    <EntryClock builtAt={builtAt}>
      <Hero />

      {/* ================= 基本情報バー ================= */}
      <section className="facts" aria-label="大会の基本情報">
        <div className="container">
          <dl className="facts-grid">
            <div className="fact">
              <dt>
                <Icon name="calendar_month" />
                開催日
              </dt>
              <dd className="fact-main fact-main--num">{LABEL.factDate}</dd>
              <dd className="fact-sub">{LABEL.factDateNote}</dd>
            </div>
            <div className="fact">
              <dt>
                <Icon name="location_on" />
                会場
              </dt>
              <dd className="fact-main fact-main--text">{EVENT.venue.name}</dd>
              <dd className="fact-sub">{LABEL.venueAddress}</dd>
            </div>
            <div className="fact">
              <dt>
                <Icon name="route" />
                1周の距離
              </dt>
              <dd className="fact-main fact-main--num">
                {EVENT.lapMeters}
                <span className="fact-unit">m</span>
              </dd>
              <dd className="fact-sub">公園内の周回コース</dd>
            </div>
            <div className="fact">
              <dt>
                <Icon name="edit_calendar" />
                エントリー締切
              </dt>
              <dd className="fact-main fact-main--num">
                {LABEL.deadlineDot}
                <span className="fact-dow">{LABEL.deadlineEn}</span>
              </dd>
              <dd>
                <span className="fact-chip">
                  <EntryChip />
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <main id="main">
        {/* ================= 1. 最新情報 ================= */}
        <section className="section" id="news">
          <div className="container">
            <SectionHead num="01" icon="campaign" en="NEWS" title="最新情報" />

            <ul className="news-list">
              {newsItems.slice(0, NEWS_ON_TOP).map((item) => (
                <Reveal as="li" key={item.id}>
                  <Link className="news-link" href={`/news/${item.id}/`}>
                    <time dateTime={item.date}>{item.dateLabel}</time>
                    <span className="news-tag">{item.tag}</span>
                    <span className="news-text">{item.title}</span>
                    <Icon name="chevron_right" className="news-arrow" />
                  </Link>
                </Reveal>
              ))}
            </ul>

            <Reveal className="sec-more">
              <Link className="text-arrow" href="/news/">
                最新情報一覧
                <Icon name="arrow_forward" />
              </Link>
            </Reveal>
          </div>
        </section>

        {/* ================= 2. 大会概要 ================= */}
        <section className="section section-mist" id="outline">
          <div className="container">
            <SectionHead num="02" icon="flag" en="OUTLINE" title="大会概要" />

            <Reveal as="dl" className="outline-table">
              <div className="outline-row">
                <dt>
                  <Icon name="calendar_month" />
                  開催日
                </dt>
                <dd>{LABEL.eventDateRange}</dd>
              </div>
              <div className="outline-row">
                <dt>
                  <Icon name="location_on" />
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
                    <Icon name="open_in_new" />
                  </a>
                </dd>
              </div>
              <div className="outline-row">
                <dt>
                  <Icon name="edit_calendar" />
                  エントリー期間
                </dt>
                <dd>{LABEL.entryPeriod}</dd>
              </div>
              <div className="outline-row">
                <dt>
                  <Icon name="payments" />
                  参加費
                </dt>
                <dd>
                  <span className="fee-list">
                    <span className="fee">
                      24時間走
                      <b className="fee-num">
                        {EVENT.race24.fee.toLocaleString()}
                        <span>円</span>
                      </b>
                    </span>
                    <span className="fee fee--12">
                      12時間走
                      <b className="fee-num">
                        {EVENT.race12.fee.toLocaleString()}
                        <span>円</span>
                      </b>
                    </span>
                  </span>
                  <small className="fee-note">
                    （施設利用料、エイド利用料、スポーツ保険加入代、人件費、運営費等）
                    <br />
                    参加費は銀行振込です。エントリー後、メールにて入金方法のご連絡を差し上げます。
                  </small>
                </dd>
              </div>
              <div className="outline-row">
                <dt>
                  <Icon name="groups" />
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
              <Icon name="directions_run" />
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
                  <TimeBand
                    startAt={EVENT.race24.startAt}
                    endAt={EVENT.race24.finishAt}
                    startNote="スタート"
                    endNote="制限時間"
                  />
                </div>
                <ul className="race-spec">
                  <li>
                    <Icon name="timer" />
                    スタート：{formatDateTime(EVENT.race24.startAt)}
                  </li>
                  <li>
                    <Icon name="sports_score" />
                    制限時間：{formatDateTime(EVENT.race24.finishAt)}
                  </li>
                  <li>
                    <Icon name="verified" />
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
                  <TimeBand
                    startAt={EVENT.race12.day.startAt}
                    endAt={EVENT.race12.day.finishAt}
                    startNote="デイスタート"
                    endNote="制限時間"
                  />
                  <TimeBand
                    second
                    startAt={EVENT.race12.night.startAt}
                    endAt={EVENT.race12.night.finishAt}
                    startNote="ナイトスタート"
                    endNote="制限時間"
                  />
                </div>
                <ul className="race-spec">
                  <li className="icon-day">
                    <Icon name="light_mode" />
                    デイスタート：{formatDateTime(EVENT.race12.day.startAt)}
                    （制限時間 {formatDateTime(EVENT.race12.day.finishAt)}）
                  </li>
                  <li className="icon-night">
                    <Icon name="dark_mode" />
                    ナイトスタート：{formatDateTime(EVENT.race12.night.startAt)}
                    （制限時間 {formatDateTime(EVENT.race12.night.finishAt)}）
                  </li>
                  <li>
                    <Icon name="verified" />
                    エントリー資格：{EVENT.race12.qualification}
                  </li>
                </ul>
              </Reveal>
            </div>
            <Reveal as="p" className="race-note">
              <Icon name="directions_walk" />
              両カテゴリにおけるウォーカーの参加歓迎
            </Reveal>

            {/* スケジュール */}
            <Reveal as="h3" className="sub-title">
              <Icon name="schedule" />
              イベントスケジュール
            </Reveal>
            <div className="schedule-grid">
              <Reveal className="schedule-col">
                <h4>
                  <span className="fig-en">24</span>時間走
                </h4>
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
                    <tr className="is-key">
                      <th>12:00</th>
                      <td>スタート</td>
                    </tr>
                  </tbody>
                </table>
                <p className="sched-day">11月23日(祝)</p>
                <table className="sched-table">
                  <tbody>
                    <tr className="is-key">
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
              <Reveal className="schedule-col schedule-col--12" delay={1}>
                <h4>
                  <span className="fig-en">12</span>時間走
                </h4>
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
                    <tr className="is-key">
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
                    <tr className="is-key">
                      <th>0:00</th>
                      <td>ナイトスタート／デイスタートの制限時間</td>
                    </tr>
                    <tr>
                      <th>0:30</th>
                      <td>賞品授与（デイスタート）</td>
                    </tr>
                    <tr className="is-key">
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
            <SectionHead num="03" icon="route" en="COURSE" title="コース" />
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
                    <Icon name="restaurant" />
                    エイド：豚汁、レトルト（カレー、ハヤシライス、親子丼、牛丼）、カップラーメン、おかゆ、パン、スープ類、味噌汁、菓子類、各種ドリンク等
                  </li>
                  <li>
                    <Icon name="home_work" />
                    管理棟は9時〜翌日15時まで利用可能（更衣室、浴室、和室4室ほか貸切）
                  </li>
                  <li>
                    <Icon name="battery_charging_full" />
                    1Fロビーに選手用の充電スペースあり
                  </li>
                </ul>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ================= フォト ================= */}
        <section className="photo-band" aria-label="大会の様子">
          {GALLERY.map((photo) => (
            <picture key={photo.src}>
              {IMAGE_FORMATS.map((format) => (
                <source
                  key={format}
                  type={`image/${format}`}
                  srcSet={imageSrcSet(photo.src, GALLERY_WIDTHS, format, asset)}
                  sizes="(max-width: 700px) 50vw, 25vw"
                />
              ))}
              <img
                src={asset(photo.src)}
                alt={photo.alt}
                width="1200"
                height="900"
                loading="lazy"
                decoding="async"
              />
            </picture>
          ))}
        </section>

        {/* ================= エントリー ================= */}
        <section className="entry" id="entry">
          <div className="container">
            <Reveal className="entry-inner">
              <div className="entry-main">
                <h2 className="entry-title">ENTRY</h2>
                {/* 受付状態は現在時刻と lib/event.js の期間から判定する
                    （EntryClock がブラウザ側でも再判定する）。文言を直書き
                    していると、締切後もサイトが「受付中」と言い続けてしまうため。 */}
                <p className="entry-lead">
                  <EntryLabel />
                </p>
                <div className="entry-actions">
                  <WhenEntryOpen>
                    <a
                      className="btn btn-primary btn-lg"
                      href={SITE.entryFormUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      エントリーフォームへ
                      <Icon name="arrow_outward" />
                    </a>
                  </WhenEntryOpen>
                  <a
                    className="btn btn-line"
                    href={SITE.entryListUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    エントリーリストを見る
                    <Icon name="open_in_new" />
                  </a>
                </div>
                <p className="entry-note">
                  エントリーリストはエントリー確定後、随時更新します。
                  <WhenEntryOpen>
                    {`　定員は24時間走${EVENT.race24.capacity}名／12時間走デイ・ナイト各${EVENT.race12.capacityEach}名です。`}
                  </WhenEntryOpen>
                </p>
              </div>

              <div className="entry-side">
                <WhenEntryOpen>
                  <div className="entry-deadline">
                    <div className="entry-deadline-head">
                      <p className="entry-deadline-en">DEADLINE</p>
                      <p className="entry-deadline-text">
                        エントリー締切 {formatDate(EVENT.entryCloseAt)}
                      </p>
                    </div>
                    <p className="entry-countdown">
                      <span>あと</span>
                      <b>
                        <DaysLeft />
                      </b>
                      <span>日</span>
                    </p>
                  </div>
                </WhenEntryOpen>
                <div className="entry-kit">
                  <h3>
                    <Icon name="checklist" />
                    必携品
                  </h3>
                  <p>
                    夜間走のためのライト／マイカップ／反射板や赤色灯／走行距離がわかるGPS付き時計やStravaアプリなど
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ================= ルール ================= */}
        <section className="section section-mist" id="rules">
          <div className="container">
            <SectionHead num="04" icon="gavel" en="RULES" title="大会ルール" />

            <Reveal as="article" className="rule">
              <h3 className="rule-title">
                <Icon name="warning" />
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
                <Icon name="timer" />
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
                <Icon name="info" />
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

      <StickyEntryBar />
    </EntryClock>
  );
}
