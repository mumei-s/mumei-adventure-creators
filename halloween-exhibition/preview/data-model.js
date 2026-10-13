export function safeURL(value, { image = false } = {}) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const text = value.trim();
  if (/^[\u0000-\u0020]|[\u0000-\u001f\\]/u.test(text)) return null;
  if (/^https:\/\//i.test(text)) { try { const url = new URL(text); return url.username || url.password ? null : url.href; } catch { return null; } }
  if (image && /^(?:\.\/)?assets\/[\w./-]+$/u.test(text) && !text.split('/').includes('..')) return text;
  return null;
}
export function validateArchive(data) {
  if (!data || data.schemaVersion !== 1 || !Array.isArray(data.creators) || !Array.isArray(data.years) || !data.years.length) throw Error('年鑑データの形式を確認してください。');
  const ids = new Set();
  for (const creator of data.creators) {
    if (!creator || typeof creator.id !== 'string' || !/^[a-z0-9][a-z0-9_-]*$/i.test(creator.id) || ids.has(creator.id) || typeof creator.name !== 'string' || !creator.name.trim()) throw Error('参加者ID・名前が不正、または重複しています。');
    if (creator.bio !== undefined && typeof creator.bio !== 'string') throw Error('紹介文の形式が不正です。');
    for(const key of ['avatar','avatarSource','profileURL']) if(creator[key] !== undefined && typeof creator[key] !== 'string') throw Error('プロフィール情報の形式を確認してください。');
    ids.add(creator.id);
  }
  const years = new Set();
  for (const year of data.years) {
    if (!Number.isInteger(year.year) || year.year < 2000 || year.year > 9999 || years.has(year.year) || !Array.isArray(year.entries) || typeof year.title !== 'string' || typeof year.description !== 'string') throw Error('年度データを確認してください。');
    if(year.plannedSlots !== undefined && (!Number.isInteger(year.plannedSlots) || year.plannedSlots<0 || year.plannedSlots>100)) throw Error('追加予定枠は0以上の整数にしてください。');
    years.add(year.year); const entered = new Set();
    for (const entry of year.entries) {
      if (!entry || !ids.has(entry.creatorId) || entered.has(entry.creatorId)) throw Error('年度の参加者IDが不正、または重複しています。');
      entered.add(entry.creatorId);
      for (const key of ['title','message','theme','image']) if (entry[key] !== undefined && typeof entry[key] !== 'string') throw Error('参加者の表示項目を確認してください。');
      if (entry.tags !== undefined && (!Array.isArray(entry.tags) || entry.tags.some(tag => typeof tag !== 'string'))) throw Error('タグの形式を確認してください。');
      for (const field of ['works','links']) if (entry[field] !== undefined && (!Array.isArray(entry[field]) || entry[field].some(item => !item || typeof item.title !== 'string' || typeof item.url !== 'string'))) throw Error('作品・リンクの形式を確認してください。');
    }
  }
  return data;
}
export function normalizeSearch(value) { return String(value).normalize('NFKC').toLocaleLowerCase('ja').trim(); }
