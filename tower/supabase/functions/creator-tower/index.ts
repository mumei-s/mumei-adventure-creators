const SITE_ORIGIN = "https://mumei-s.github.io";
const NOTE_ORIGIN = "https://note.com";
const BASE = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ID = /^[a-z0-9_]{1,32}$/;
const KEY = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const MAX_BODY = 760_000;
const MAX_AVATAR = 307_200;
const MAX_INTERIOR = 245_760;
const MAX_VEHICLE = 98_304;
const PARKING_SPACES: Record<string, string> = { garage: 'car', parkingTower: 'car', bicycle: 'bicycle', motorcycle: 'motorcycle' };
const THEMES = ["reading", "gallery", "cinema", "story"];
const IP_LIMITS: Record<string, number> = { begin: 10, confirm: 14, save: 12, stamp: 40, leave: 8, park: 16, engineer: 8, manager: 8 };
const ERROR_STATUS: Record<string, number> = {
  invalid: 400, bad_image: 400, bad_sheet: 400, big_image: 413, avatar_required: 400, owner_required: 403,
  missing: 404, note_missing: 404, invalid_note: 400, proof_missing: 422,
  slot_taken: 409, full: 409, manager_full: 409, conflict: 409, handle_in_use: 409, own_room: 409, expired: 410,
  too_many: 429, note_down: 502, unavailable: 503, intake_pending: 503,
};

type Json = Record<string, any>;

class RequestError extends Error {
  constructor(public code: string) { super(code); }
}

const fail = (code: string): never => { throw new RequestError(code); };

function clean(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  const normalized = value.replace(/[\u0000-\u001f\u007f]+/gu, " ").replace(/\s+/gu, " ").trim();
  return [...normalized].slice(0, max).join("");
}

function noteImage(value: unknown) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    if (url.origin !== "https://assets.st-note.com" || url.username || url.password) return "";
    url.searchParams.set("width", "680");
    return url.href;
  } catch {
    return "";
  }
}

function randomHex(bytes: number) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (n) => n.toString(16).padStart(2, "0")).join("");
}

async function hash(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (n) => n.toString(16).padStart(2, "0")).join("");
}

async function rpc(command: string, input: Json = {}): Promise<Json> {
  const endpoint = command === "facilities" ? "creator_tower_facility_rpc" :
    command === "list" || command === "finish" ? "creator_tower_world_rpc" : "creator_tower_rpc";
  const response = await fetch(`${BASE}/rest/v1/rpc/${endpoint}`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ command, input }),
    signal: AbortSignal.timeout(6500),
  });
  if (!response.ok) {
    console.error("creator_tower_rpc", command, response.status);
    if (response.status === 409 && command === "stamp") return fail("missing");
    return fail("unavailable");
  }
  const data = await response.json();
  if (data.error) return fail(data.error);
  return data;
}

async function noteJson(path: string, fresh = false): Promise<Json> {
  const url = new URL(path, NOTE_ORIGIN);
  if (fresh) url.searchParams.set("_atelier", randomHex(8));
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; AtelierTower/1.0)",
        ...(fresh ? { "Cache-Control": "no-cache" } : {}),
      },
      redirect: "error",
      signal: AbortSignal.timeout(6500),
    });
  } catch {
    return fail("note_down");
  }
  if (response.status === 404) return fail("note_missing");
  if (!response.ok) {
    console.warn("note public data", response.status);
    return fail("note_down");
  }
  const value = await response.json().catch(() => null);
  if (!value?.data || typeof value.data !== "object") return fail("note_down");
  return value.data;
}

function selectTheme(id: string, text: string) {
  const matches = [
    /読書|本棚|書店|文章|エッセイ|日記|コラム|詩歌|文学/g,
    /写真|イラスト|絵画|風景|アート|デザイン|画家|撮影|工芸/g,
    /音楽|映画|動画|映像|演奏|ライブ|レビュー|アニメーション|ゲーム/g,
    /物語|小説|漫画|冒険|魔法|ファンタジー|創作|世界観|脚本/g,
  ].map((pattern) => text.match(pattern)?.length ?? 0);
  const highest = Math.max(...matches);
  const chosen = matches.map((score, index) => score === highest ? index : -1).filter((index) => index >= 0);
  const seed = Array.from(id).reduce((n, char) => (n * 31 + char.charCodeAt(0)) >>> 0, 0);
  return THEMES[chosen[seed % chosen.length]];
}

function publicProfile(raw: Json, entries: Json[]) {
  const id = String(raw.urlname).toLowerCase();
  const description = clean(String(raw.profile ?? "").replace(/\bAT-[0-9A-F]{12}\b/gi, ""), 240);
  const articles = entries
    .filter((entry) => entry.status === "published" && entry.canRead === true && entry.isLimited !== true &&
      entry.isMembershipConnected !== true && Number(entry.price) === 0 && entry.user?.id === raw.id &&
      typeof entry.key === "string" && /^n[a-f0-9]{8,20}$/.test(entry.key) && clean(entry.name, 140))
    .sort((a, b) => Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned)) ||
      (Date.parse(b.publishAt) || 0) - (Date.parse(a.publishAt) || 0))
    .slice(0, 6)
    .map((entry) => ({
      title: clean(entry.name, 140),
      url: `${NOTE_ORIGIN}/${id}/n/${entry.key}`,
      image: noteImage(entry.eyecatch || entry.thumbnailExternalUrl),
      date: /^\d{4}-\d{2}-\d{2}/.test(entry.publishAt) ? entry.publishAt.slice(0, 10) : "",
    }));
  return { name: clean(raw.nickname, 60) || id, description, photo: noteImage(raw.profileImageUrl), articles };
}

function defaultDesign(id: string, profile: ReturnType<typeof publicProfile>) {
  return {
    title: "", welcome: "", theme: selectTheme(id, [profile.description, ...profile.articles.map((item) => item.title)].join(" ")),
    light: "natural", pin: profile.articles[0]?.url ?? "", avatarMode: "resident", avatarName: "",
  };
}

async function publicAccount(id: string, fresh = false) {
  const value = await noteJson(`/api/v2/creators/${id}`, fresh);
  if (!Number.isSafeInteger(value.id) || value.id < 1 || typeof value.urlname !== "string" ||
      value.urlname.toLowerCase() !== id || (value.profile != null && typeof value.profile !== "string")) return fail("invalid_note");
  return value;
}

const previewCache = new Map<string, { until: number; result: Json }>();

async function profileWithArticles(id: string, raw?: Json) {
  const [account, entries] = await Promise.all([
    raw ?? publicAccount(id),
    noteJson(`/api/v2/creators/${id}/contents?kind=note&page=1`),
  ]);
  if (!Array.isArray(entries.contents)) return fail("note_down");
  return { account, profile: publicProfile(account, entries.contents) };
}

async function preview(id: string) {
  let current = previewCache.get(id);
  if (!current || current.until < Date.now()) {
    const { account, profile } = await profileWithArticles(id);
    current = { until: Date.now() + 120_000, result: { noteUser: String(account.id), profile, design: defaultDesign(id, profile) } };
    if (previewCache.size >= 96) previewCache.delete(previewCache.keys().next().value!);
    previewCache.set(id, current);
  }
  const { noteUser, profile, design } = current.result;
  const existing = await rpc("lookup", { noteUser });
  return { noteId: id, profile, design, existingId: existing.id };
}

function validateWorld(value: unknown) {
  if (!value || typeof value !== "object") return fail("invalid");
  const world = value as Json;
  const numericFields = { seed: 2 ** 32 - 1, hue: 359, accent: 359, lightness: 100, view: 3, layout: 5 };
  for (const [name, max] of Object.entries(numericFields)) {
    if (!Number.isInteger(world[name]) || world[name] < 0 || world[name] > max) return fail("invalid");
  }
  return {
    seed: world.seed, hue: world.hue, accent: world.accent, lightness: world.lightness,
    view: world.view, layout: world.layout, character: world.character === true,
  };
}

function validateDesign(input: Json, profile: Json) {
  if (!input || typeof input !== "object" || !THEMES.includes(input.theme) ||
      !["natural", "warm", "blue"].includes(input.light) ||
      !["resident", "profile", "custom"].includes(input.avatarMode)) return fail("invalid");
  const pin = Array.isArray(profile.articles) && profile.articles.some((article: Json) => article.url === input.pin)
    ? input.pin : "";
  return {
    title: clean(input.title, 38), welcome: clean(input.welcome, 180), theme: input.theme,
    light: input.light, pin, avatarMode: input.avatarMode, avatarName: clean(input.avatarName, 24),
    ...(input.world ? { world: validateWorld(input.world) } : {}),
  };
}

function parseImage(value: unknown, maxBytes: number) {
  if (typeof value !== "string") return fail("bad_image");
  if (value.length > Math.ceil(maxBytes / 3) * 4) return fail("big_image");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return fail("bad_image");
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
  } catch {
    return fail("bad_image");
  }
  if (bytes.length > maxBytes) return fail("big_image");
  if (bytes.length < 30) return fail("bad_image");

  const head = String.fromCharCode(...bytes.subarray(0, 12));
  const data = new DataView(bytes.buffer);
  const png = head.startsWith("\x89PNG\r\n\x1a\n");
  const gif = /^GIF8[79]a/.test(head);
  const webp = head.startsWith("RIFF") && head.endsWith("WEBP");
  let width = 0;
  let height = 0;
  if (png && [...bytes.subarray(12, 16)].join(",") === "73,72,68,82") {
    width = data.getUint32(16);
    height = data.getUint32(20);
  } else if (gif) {
    width = data.getUint16(6, true);
    height = data.getUint16(8, true);
  } else if (webp) {
    const chunk = String.fromCharCode(...bytes.subarray(12, 16));
    if (chunk === "VP8X") {
      width = 1 + (bytes[24] | bytes[25] << 8 | bytes[26] << 16);
      height = 1 + (bytes[27] | bytes[28] << 8 | bytes[29] << 16);
    } else if (chunk === "VP8L" && bytes[20] === 0x2f) {
      width = 1 + ((bytes[22] & 0x3f) << 8 | bytes[21]);
      height = 1 + ((bytes[24] & 0xf) << 10 | bytes[23] << 2 | bytes[22] >> 6);
    } else if (chunk === "VP8 " && bytes[23] === 0x9d && bytes[24] === 1 && bytes[25] === 0x2a) {
      width = data.getUint16(26, true) & 0x3fff;
      height = data.getUint16(28, true) & 0x3fff;
    }
  }
  if (!width || !height || width > 1200 || height > 1200) return fail("bad_image");
  return { mime: png ? "image/png" : gif ? "image/gif" : "image/webp", base64: value, width, height };
}

async function roomMedia(design: Json, body: Json, previous: Json = {}) {
  const avatar = design.avatarMode === "custom" && body.avatarB64 ? parseImage(body.avatarB64, MAX_AVATAR) : null;
  const atlas = avatar && body.avatarAtlas === true;
  if (atlas && (avatar.mime === "image/gif" || avatar.width % 4 || avatar.height % 4 || avatar.width < 160 || avatar.height < 160)) return fail("bad_sheet");
  const artwork = body.interiorB64 ? parseImage(body.interiorB64, MAX_INTERIOR) : null;
  if (artwork?.mime === "image/gif") return fail("bad_image");
  if ((atlas || artwork) && !design.world) return fail("invalid");

  if (design.world) {
    design.world = { ...design.world, atlas: design.avatarMode === "custom" && (avatar ? atlas : previous.world?.atlas === true) };
    delete design.world.artwork;
    if (artwork) {
      design.interiorB64 = artwork.base64;
      design.interiorMime = artwork.mime;
      design.world.artwork = (await hash(artwork.base64)).slice(0, 24);
    } else if (body.clearInterior !== true && previous.world?.artwork) {
      design.interiorB64 = previous.interiorB64;
      design.interiorMime = previous.interiorMime;
      design.world.artwork = previous.world.artwork;
    }
  }
  return { design, ...(avatar ? { avatarMime: avatar.mime, avatarB64: avatar.base64 } : {}) };
}

function roomResponse(room: Json) {
  if (!room.design) return room;
  const { interiorB64, interiorMime, ...design } = room.design;
  if (design.transport) design.transport = Object.fromEntries(Object.entries(design.transport)
    .map(([space, raw]) => { const { base64, mime, ...metadata } = raw as Json; return [space, metadata]; }));
  return { ...room, design };
}

async function requestJson(request: Request): Promise<Json> {
  if (Number(request.headers.get("content-length") ?? "0") > MAX_BODY) return fail("big_image");
  if (!request.headers.get("content-type")?.startsWith("application/json") || !request.body) return fail("invalid");
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BODY) {
        void reader.cancel();
        return fail("big_image");
      }
      text += decoder.decode(value, { stream: true });
    }
    const result = JSON.parse(text + decoder.decode());
    if (!result || typeof result !== "object" || Array.isArray(result)) return fail("invalid");
    return result;
  } catch (error) {
    if (error instanceof RequestError) throw error;
    return fail("invalid");
  } finally {
    reader.releaseLock();
  }
}

async function ownerHash(request: Request) {
  const token = request.headers.get("X-Tower-Key") ?? "";
  if (!KEY.test(token)) return fail("owner_required");
  return await hash(token);
}

function requireUuid(value: unknown) {
  if (typeof value !== "string" || !UUID.test(value)) return fail("invalid");
  return value;
}

function requireNoteId(value: unknown) {
  if (typeof value !== "string" || !ID.test(value)) return fail("invalid");
  return value;
}

function requireSlot(value: unknown) {
  if (value == null) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 2147483647) return fail("invalid");
  return value;
}

async function rateLimit(request: Request, action: string, limit: number) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const bucket = await hash(`${SERVICE_KEY}:${action}:${ip.slice(0, 96)}`);
  const result = await rpc("limit", { bucket, limit });
  if (!result.allowed) return fail("too_many");
}

const PAGES = 'https://mumei-s.github.io/mumei-adventure-creators/tower/published/';
async function acknowledgePublicImages(body: Json){
  const id=requireUuid(body.id);
  if(!Number.isSafeInteger(body.version) || !Array.isArray(body.items) || body.items.length>6) return fail('invalid');
  // Only a copy visible at our fixed, public Pages origin can release pending bytes.
  const receipt=await fetch(PAGES+'receipts/'+id+'.json',{cache:'no-store',signal:AbortSignal.timeout(6000)});
  if(!receipt.ok)return {released:0};
  const published=await receipt.json();
  if(published.version!==body.version || published.id!==id || !Array.isArray(published.items))return {released:0};
  const approved=[];
  for(const item of body.items){
    if(!['avatar','interior',...Object.keys(PARKING_SPACES)].includes(item.kind)||
      !/^([0-9]+|[a-f0-9]{24})$/.test(String(item.version))||!/^[a-f0-9]{64}$/.test(item.sha256))return fail('invalid');
    if(!published.items.some((saved:Json)=>saved.kind===item.kind&&String(saved.version)===String(item.version)&&saved.sha256===item.sha256))continue;
    const res=await fetch(PAGES+'media/'+id+'/'+item.kind+'-'+item.version+'.img',{cache:'no-store',signal:AbortSignal.timeout(7000)});
    if(!res.ok)continue;
    const bytes=await res.arrayBuffer();if(bytes.byteLength>MAX_AVATAR)continue;
    const digestBytes=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
    const digest=Array.from(digestBytes,b=>b.toString(16).padStart(2,'0')).join('');
    if(digest===item.sha256)approved.push(item);
  }
  if(!approved.length)return {released:0};
  const result=await fetch(BASE+'/rest/v1/rpc/creator_tower_archive_ack',{method:'POST',headers:{apikey:SERVICE_KEY,Authorization:'Bearer '+SERVICE_KEY,'Content-Type':'application/json'},body:JSON.stringify({input:{id,version:body.version,items:approved}}),signal:AbortSignal.timeout(6000)});
  if(!result.ok)return fail('unavailable');
  return result.json();
}

async function mutate(request: Request) {
  const body = await requestJson(request);
  const action = body.action;
  if(action==='ack_public_images'){await rateLimit(request,'archive_ack',60);return acknowledgePublicImages(body);}
  if (typeof action !== "string") return fail("invalid");
  if (Object.hasOwn(IP_LIMITS, action)) await rateLimit(request, action, IP_LIMITS[action]);

  if (action === "begin") {
    const noteId = requireNoteId(body.noteId);
    const slot = requireSlot(body.slot);
    const account = await publicAccount(noteId);
    const key = randomHex(32);
    const code = `AT-${randomHex(6).toUpperCase()}`;
    await rpc("begin", { noteId, noteUser: String(account.id), hash: await hash(key), code, slot });
    return { code, key, expiresIn: 1200 };
  }

  const owner = await ownerHash(request);
  if (action === "confirm") {
    const proof = await rpc("challenge", { hash: owner });
    if (proof.done) return proof.done;
    const account = await publicAccount(requireNoteId(proof.noteId), true);
    const exactCode = new RegExp(`(^|[^A-Za-z0-9-])${proof.code}($|[^A-Za-z0-9-])`);
    if (String(account.id) !== proof.noteUser || !exactCode.test(String(account.profile ?? ""))) return fail("proof_missing");
    const { profile } = await profileWithArticles(proof.noteId, account);
    const slot = requireSlot(body.slot);
    const defaults = defaultDesign(proof.noteId, profile);
    const design = {
      ...defaults,
      title: clean(body.title, 38) || defaults.title,
      theme: THEMES.includes(body.theme) ? body.theme : defaults.theme,
      avatarMode: body.avatarB64 ? "custom" : defaults.avatarMode,
      ...(body.world ? { world: validateWorld(body.world) } : {}),
    };
    const media = await roomMedia(design, body);
    return rpc("finish", { noteId: proof.noteId, noteUser: proof.noteUser, hash: owner, slot, profile, ...media });
  }

  const id = requireUuid(body.id);
  if (action === "visit") return rpc("visit", { id, hash: owner });
  if (action === "leave") return rpc("leave", { id, hash: owner });
  if (action === "stamp") {
    if (body.kind !== null && !["read", "hello", "inspired"].includes(body.kind)) return fail("invalid");
    return rpc("stamp", { id, hash: owner, kind: body.kind, enabled: body.enabled !== false });
  }
  if (action === "park" || action === "engineer" || action === "manager") {
    const current = await rpc("owner", { id, hash: owner });
    if (!Number.isSafeInteger(body.version) || body.version !== current.version) return fail("conflict");
    const design = { ...current.design };
    if (action === "park") {
      if (typeof body.space !== "string" || !Object.hasOwn(PARKING_SPACES, body.space)) return fail("invalid");
      const transport = { ...design.transport };
      if (body.facing !== undefined && !["left","right"].includes(String(body.facing))) return fail("invalid");
      if (body.facingOnly === true) {
        if (!transport[body.space] || !body.facing) return fail("invalid");
        transport[body.space] = { ...transport[body.space], facing: body.facing };
      } else if (body.clear === true) delete transport[body.space];
      else {
        const image = parseImage(body.imageB64, MAX_VEHICLE);
        if (image.mime === "image/gif" || image.width < 100 || image.height < 80 || image.width > 1000 || image.height > 1000) return fail("bad_image");
        transport[body.space] = { base64: image.base64, mime: image.mime,
          version: (await hash(image.base64)).slice(0, 24), kind: PARKING_SPACES[body.space], facing: body.facing || (PARKING_SPACES[body.space] === "car" ? "left" : "right"),
          title: clean(body.title, 40), style: clean(body.style, 60) };
      }
      design.transport = transport;
    } else {
      if (typeof body.join !== "boolean") return fail("invalid");
      // A public creative role only; this never grants database or management access.
      design[action] = body.join;
    }
    return rpc("save", { id, hash: owner, version: current.version, design });
  }
  if (action === "save") {
    if (!Number.isSafeInteger(body.version) || body.version < 1) return fail("invalid");
    const current = await rpc("owner", { id, hash: owner });
    let profile = current.profile;
    if (body.refresh === true) {
      const refreshed = await profileWithArticles(current.noteId);
      if (String(refreshed.account.id) !== current.noteUser) return fail("invalid_note");
      profile = refreshed.profile;
    }
    const validated = validateDesign(body.design, profile);
    const design = { world: current.design.world, ...validated,
      ...(current.design.transport ? { transport: current.design.transport } : {}),
      ...(current.design.engineer !== undefined ? { engineer: current.design.engineer } : {}),
      ...(current.design.manager !== undefined ? { manager: current.design.manager } : {}) };
    const media = await roomMedia(design, body, current.design);
    return rpc("save", { id, hash: owner, version: body.version, ...media,
      ...(body.refresh === true ? { profile } : {}) });
  }
  return fail("invalid");
}

async function intakeReady(): Promise<boolean> {
  const response = await fetch(BASE+'/rest/v1/rpc/creator_tower_archive_ready', {
    method:'POST', headers:{apikey:SERVICE_KEY,Authorization:'Bearer '+SERVICE_KEY,'Content-Type':'application/json'},
    body:'{}', signal:AbortSignal.timeout(5000),
  });
  return response.ok && (await response.json()) === true;
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin");
  const local = origin && /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d{1,5})?$/.test(origin);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": local ? origin : SITE_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, x-tower-key",
    "Access-Control-Max-Age": "600",
    "Vary": "Origin",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
  const json = (data: Json, status = 200) => Response.json(data, { status, headers });
  if (origin && origin !== SITE_ORIGIN && !local) return json({ error: "invalid" }, 403);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });

  try {
    if (request.method === "POST") {
      if (!await intakeReady()) return json({error:"intake_pending"},503);
      return json(roomResponse(await mutate(request)));
    }
    if (request.method !== "GET") return json({ error: "invalid" }, 405);
    const url = new URL(request.url);
    const view = url.searchParams.get("view") ?? "list";
    if (view === "archive-status") return json({ready:await intakeReady()});
    if (view === "list") return json(await rpc("list"));
    if (view === "facilities") return json(await rpc("facilities"));
    if (view === "preview") {
      if (!await intakeReady()) return json({error:"intake_pending"},503);
      const noteId = requireNoteId(url.searchParams.get("noteId"));
      await rateLimit(request, "preview", 35);
      return json(await preview(noteId));
    }
    const id = requireUuid(url.searchParams.get("id"));
    if (view === "room") return json(roomResponse(await rpc("room", { id })));
    if (view === "vehicle") {
      const space = url.searchParams.get("space") ?? "", version = url.searchParams.get("v") ?? "";
      if (!Object.hasOwn(PARKING_SPACES, space) || !/^[a-f0-9]{24}$/.test(version)) return fail("invalid");
      const { design } = await rpc("room", { id });
      const vehicle = design.transport?.[space];
      if (!vehicle?.base64 || vehicle.version !== version) return fail("missing");
      const bytes = Uint8Array.from(atob(vehicle.base64), c => c.charCodeAt(0));
      return new Response(bytes, { headers: { ...headers, "Content-Type": vehicle.mime } });
    }
    if (view === "interior") {
      const version = url.searchParams.get("v") ?? "";
      if (!/^[a-f0-9]{24}$/.test(version)) return fail("invalid");
      const { design } = await rpc("room", { id });
      if (design.world?.artwork !== version || !design.interiorB64) return fail("missing");
      const bytes = Uint8Array.from(atob(design.interiorB64), (c) => c.charCodeAt(0));
      return new Response(bytes, { headers: { ...headers, "Content-Type": design.interiorMime } });
    }
    if (view === "avatar") {
      const version = Number(url.searchParams.get("v"));
      if (!Number.isSafeInteger(version) || version < 1) return fail("invalid");
      const image = await rpc("avatar", { id, version });
      if (!image.base64) return fail("missing");
      const bytes = Uint8Array.from(atob(image.base64), (c) => c.charCodeAt(0));
      return new Response(bytes, { headers: { ...headers, "Content-Type": image.mime } });
    }
    return fail("invalid");
  } catch (error) {
    if (error instanceof RequestError) return json({ error: error.code }, ERROR_STATUS[error.code] ?? 400);
    console.error("creator-tower error", error instanceof Error ? error.name : "unknown");
    return json({ error: "unavailable" }, 503);
  }
});
