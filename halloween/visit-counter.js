/* Halloween Atelier: gentle public counter, once per browser per JST day.
 * No account, IP address, fingerprint or creator identifier is collected.
 * Only a daily random 256-bit digest is sent; table data is private. */
const API_URL = "https://xxhaerjvrgmnadxjqetz.supabase.co/rest/v1/rpc/atelier_record_visit";
const API_KEY = "sb_publishable_yUoJtk-zLMLBZFyBUZehIw_9Bym2Z3w";
const counter = document.getElementById("atelier-counter");
const number = document.getElementById("atelier-counter-total");
const note = document.getElementById("atelier-counter-note");

function todayInJapan() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date());
}

function dailySeed(day) {
  // The identity is scoped to this Atelier and replaced every new calendar day.
  // If storage or secure randomness is unavailable, show the count without
  // recording a visit. This prevents silent double-counting from reloads.
  if (!globalThis.crypto?.getRandomValues) return null;
  try {
    const key = "halloween-atelier-daily-visit-v1";
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    if (saved?.date === day && /^[0-9a-f]{48}$/.test(saved.seed)) return saved.seed;
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const seed = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
    localStorage.setItem(key, JSON.stringify({date: day, seed}));
    return seed;
  } catch { return null; }
}

async function anonymousDailyToken() {
  const day = todayInJapan();
  const seed = dailySeed(day);
  if (!seed || !globalThis.crypto?.subtle) return null;
  const message = new TextEncoder().encode("halloween-atelier|" + day + "|" + seed);
  const digest = await crypto.subtle.digest("SHA-256", message);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

function drawCount(total) {
  if (!Number.isSafeInteger(total) || total < 0) return false;
  // Initial zero is real: old article visits are not carried into this counter.
  number.textContent = total < 100000 ? String(total).padStart(5, "0") : total.toLocaleString("ja-JP");
  counter.dataset.status = "ready";
  counter.title = "Halloween Atelierの延べ来場数（同じ端末では1日1回）";
  note.textContent = "ご来場ありがとう ✨";
  return true;
}

async function loadCounter() {
  if (!counter || !number || !note) return;
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), 8500);
  try {
    const token = await anonymousDailyToken();
    const response = await fetch(API_URL, {
      method: "POST", mode: "cors", cache: "no-store",
      headers: {"apikey": API_KEY, "content-type": "application/json"},
      body: JSON.stringify({p_token: token}), signal: controller.signal
    });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data = await response.json();
    if (!drawCount(Number(data?.total))) throw new Error("Invalid counter value");
  } catch {
    counter.dataset.status = "unavailable";
    number.textContent = "— — —";
    note.textContent = "またあとで見てね";
    counter.title = "アクセス数の取得に失敗しました";
  } finally {
    clearTimeout(deadline);
  }
}
void loadCounter();
