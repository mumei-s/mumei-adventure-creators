// Installation is optional. No account, notification permission or background sync.
const scope = new URL('./', import.meta.url);
const worker = new URL('./sw.js', import.meta.url);
let installEvent = null;
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const trigger = document.createElement('button');
trigger.id = 'atelier-install-open';
trigger.className = 'pwa-open';
trigger.textContent = 'ホーム追加';
trigger.setAttribute('aria-label', 'ホーム画面への追加方法をひらく');
document.querySelector('.header-actions')?.append(trigger);
const dialog = document.createElement('dialog');
dialog.className = 'pwa-guide';
dialog.setAttribute('aria-labelledby', 'pwa-title');
const close = document.createElement('button');
close.className = 'close';
close.setAttribute('aria-label', 'アプリの案内を閉じる');
close.textContent = '×';
const title = document.createElement('h2');
title.id = 'pwa-title';
title.textContent = 'とびらを、ホーム画面に。';
const guide = document.createElement('p');
const steps = document.createElement('ol');
steps.className = 'pwa-steps';
for (const text of [
  'Safariでこの展示を開きます。アプリ内ブラウザの場合はSafariへ移動します。',
  '共有を開きます。表示によってはページメニューから「共有」を選びます。',
  '「ホーム画面に追加」を選びます。見つからないときは、共有メニューの「アクションを編集」を確認します。',
  '「Webアプリとして開く」が表示される場合はONにして、「追加」を押します。'
]) { const item = document.createElement('li'); item.textContent = text; steps.append(item); }
const appleLinks = document.createElement('p'); appleLinks.className = 'pwa-apple-links';
for (const [label, url] of [
  ['Apple公式：iPhoneでの追加方法','https://support.apple.com/guide/iphone/iphea86e5236/ios'],
  ['Apple公式：iPadでの追加方法','https://support.apple.com/guide/ipad/open-as-web-app-ipad8f1f7a29/ipados']
]) { const link=document.createElement('a');link.textContent=label;link.href=url;link.target='_blank';link.rel='noopener noreferrer';appleLinks.append(link); }
const note = document.createElement('p');
note.className = 'pwa-note';
note.textContent = '追加方法は端末やブラウザで異なります。項目がない場合は、通常のブラウザでこのページを開いてください。作品・プロフィール・最新の年鑑にはインターネット接続が必要です。';
const status = document.createElement('p');
status.className = 'pwa-note';
status.setAttribute('role', 'status');
const install = document.createElement('button');
install.className = 'pwa-install';
install.textContent = 'このアトリエを追加';
install.hidden = true;
dialog.append(close, title, guide, steps, appleLinks, install, status, note);
document.body.append(dialog);
function refreshGuide() {
  const appleDevice = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  steps.hidden = appleLinks.hidden = !appleDevice || standalone();
  install.hidden = !installEvent || standalone();
  guide.textContent = standalone() ? 'このアトリエはアプリ表示で開いています。' : installEvent ?
    '下のボタンから、このアトリエをホーム画面やアプリ一覧に追加できます。' :
    appleDevice ?
      'iPhone・iPadでは、Safariの共有メニューから追加できます。OSや表示設定でメニュー名や場所が少し異なります。' :
      '対応ブラウザのメニューに「アプリをインストール」「ホーム画面に追加」などが表示されていれば、そこから追加できます。';
}
trigger.addEventListener('click', () => { refreshGuide(); if (!dialog.open) dialog.showModal(); });
close.addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => trigger.focus());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const r = dialog.getBoundingClientRect();
  if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
});
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installEvent = event; refreshGuide(); });
window.addEventListener('appinstalled', () => { installEvent = null; status.textContent = 'ホーム画面への追加が完了しました。'; refreshGuide(); });
install.addEventListener('click', async () => {
  if (!installEvent) return;
  const event = installEvent;
  installEvent = null;
  install.disabled = true;
  try {
    await event.prompt();
    const result = await event.userChoice;
    status.textContent = result.outcome === 'accepted' ? '追加の操作を受け付けました。端末側の案内をご確認ください。' : '追加は見送りました。ブラウザでそのまま楽しめます。';
  } catch {
    status.textContent = 'このブラウザでは追加画面を開けませんでした。ブラウザのメニューをご確認ください。';
  } finally { install.disabled = false; refreshGuide(); }
});

async function registerPreviewWorker() {
  // Even an accidentally copied module must not install a root/other-app worker.
  if (!isSecureContext || !('serviceWorker' in navigator) || !scope.pathname.endsWith('/halloween-exhibition/preview/')) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const overlapping = registrations.filter(reg => scope.href.startsWith(reg.scope) || reg.scope.startsWith(scope.href));
    const conflict = overlapping.some(reg => reg.scope !== scope.href || [reg.active, reg.waiting, reg.installing].some(sw => sw && sw.scriptURL !== worker.href));
    if (conflict) {
      status.textContent = 'このサイトには別のオフライン機能があるため、既存の設定をそのまま使います。';
      return;
    }
    await navigator.serviceWorker.register(worker.href, { scope: scope.href, updateViaCache: 'none' });
  } catch {
    // Network, private browsing and storage restrictions never block the gallery.
    status.textContent = 'この環境ではオフライン用の保存を利用できません。オンラインでご覧ください。';
  }
}
// Keep shell precaching off the first castle image and archive critical path.
function schedulePreviewWorker(){if('requestIdleCallback' in window)window.requestIdleCallback(()=>registerPreviewWorker(),{timeout:5000});else setTimeout(()=>registerPreviewWorker(),1500);}
if(document.readyState==='complete')schedulePreviewWorker();else window.addEventListener('load',schedulePreviewWorker,{once:true});
