/** Stable article-door identity. Legacy entries remain compatible without rewriting data. */
export function doorIdFor(entry, scope = 'evergreen') {
  if (typeof entry?.doorId === 'string' && entry.doorId) return entry.doorId;
  return `legacy-${String(scope).replace(/[^a-z0-9_-]/gi,'-')}-${entry?.creatorId || ''}`;
}
export function validDoorId(value) { return typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{0,119}$/i.test(value); }

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
  if(data.evergreenEntries !== undefined && !Array.isArray(data.evergreenEntries)) throw Error('通常作品の形式を確認してください。');
  for (const year of [...data.years,...(data.evergreenEntries?[{year:9999,title:'Evergreen',description:'',entries:data.evergreenEntries,evergreen:true}]:[])]) {
    if (!Number.isInteger(year.year) || year.year < 2000 || year.year > 9999 || (!year.evergreen&&years.has(year.year)) || !Array.isArray(year.entries) || typeof year.title !== 'string' || typeof year.description !== 'string') throw Error('年度データを確認してください。');
    if(year.plannedSlots !== undefined && (!Number.isInteger(year.plannedSlots) || year.plannedSlots<0 || year.plannedSlots>100)) throw Error('追加予定枠は0以上の整数にしてください。');
    if(!year.evergreen)years.add(year.year); const entered = new Set();
    for (const entry of year.entries) {
      if (!entry || !ids.has(entry.creatorId)) throw Error('年度の参加者IDが不正です。');
      if (entry.doorId !== undefined && !validDoorId(entry.doorId)) throw Error('扉IDは英数字・ハイフン・アンダースコアで指定してください。');
      const doorId = doorIdFor(entry, year.evergreen ? 'evergreen' : `archive:${year.year}`);
      if (entered.has(doorId)) throw Error('扉IDが重複しています。同じ参加者の別記事には別の扉IDが必要です。');
      entered.add(doorId);
      if(entry.visible!==undefined&&typeof entry.visible!=='boolean')throw Error('展示の表示設定を確認してください。');
      if(entry.order!==undefined&&(typeof entry.order!=='number'||!Number.isFinite(entry.order)))throw Error('展示順を確認してください。');
      for (const key of ['title','message','theme','image']) if (entry[key] !== undefined && typeof entry[key] !== 'string') throw Error('参加者の表示項目を確認してください。');
      if (entry.tags !== undefined && (!Array.isArray(entry.tags) || entry.tags.some(tag => typeof tag !== 'string'))) throw Error('タグの形式を確認してください。');
      for (const field of ['works','links']) if (entry[field] !== undefined && (!Array.isArray(entry[field]) || entry[field].some(item => !item || typeof item.title !== 'string' || typeof item.url !== 'string' || (item.visible!==undefined&&typeof item.visible!=='boolean') || (item.order!==undefined&&(typeof item.order!=='number'||!Number.isFinite(item.order)))))) throw Error('作品・リンクの形式を確認してください。');
    }
  }
  return data;
}
export function normalizeSearch(value) { return String(value).normalize('NFKC').toLocaleLowerCase('ja').trim(); }
