// =========================================================
// 一覧APIの全件取得（再試行つき）
// ---------------------------------------------------------
// lib/microcms.js から使う。外部に依存しない小さな関数にしてあるのは、
// 「一時的な失敗は再試行する／設定の誤りはすぐ失敗にする／100件を超えても全件取る」
// という挙動を、ネットワークなしで単体で確かめられるようにするため。
// =========================================================

const sleepDefault = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 一時的な失敗（通信エラー・5xx・429）だけ再試行する。
// 401/403/404 などは設定の誤りなので、待っても直らない。すぐ失敗にする
export function isTransient(err) {
  const status = Number(/status:\s*(\d{3})/.exec(err?.message || "")?.[1]);
  if (!status) return true; // ステータスが無い＝通信エラー
  return status === 429 || status >= 500;
}

/**
 * getPage({ limit, offset }) が { contents, totalCount } を返す前提で全件を集める。
 * 以前は limit:100 の1回きりで、101件目以降は黙って切れていた。
 */
export async function fetchAllContents(
  getPage,
  { pageSize = 100, maxAttempts = 3, sleep = sleepDefault, onRetry = () => {} } = {}
) {
  const contents = [];
  for (let offset = 0; ; offset += pageSize) {
    let page;
    for (let attempt = 1; ; attempt++) {
      try {
        page = await getPage({ limit: pageSize, offset });
        break;
      } catch (err) {
        if (attempt >= maxAttempts || !isTransient(err)) throw err;
        const wait = 1000 * 3 ** (attempt - 1); // 1秒 → 3秒
        onRetry({ attempt, wait, err });
        await sleep(wait);
      }
    }
    contents.push(...page.contents);
    if (contents.length >= page.totalCount || page.contents.length === 0) break;
  }
  return contents;
}
