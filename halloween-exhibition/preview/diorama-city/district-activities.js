const catalog = {
  drinks: [['緑茶', 130], ['カフェラテ', 180], ['季節のソーダ', 200]],
  snacks: [['鮭おにぎり', 160], ['たまごサンド', 260], ['プリン', 190]],
};

const rides = {
  wheel: { image: './assets/ferris-view.webp', alt: '観覧車の窓から見下ろす運河の街', seconds: 12 },
  carousel: { image: './assets/fair.webp', alt: '明かりのともったメリーゴーラウンド', seconds: 9 },
};

const yen = price => `${price.toLocaleString('ja-JP')}円`;
const total = items => items.reduce((sum, { price, quantity }) => sum + price * quantity, 0);

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function button(label, activate, className) {
  const node = element('button', label, className);
  node.type = 'button';
  node.addEventListener('click', activate);
  return node;
}

export function bindActivities(dialog, { avatar, status }) {
  const title = dialog.querySelector('#activity-title');
  const body = dialog.querySelector('#activity-content');
  const message = dialog.querySelector('#activity-message');
  const close = dialog.querySelector('#activity-close');
  const basket = new Map();
  let receipt = [], timer = 0;

  function announce(text) {
    message.hidden = !text;
    message.textContent = text;
  }

  function open(label, closeLabel) {
    title.textContent = label;
    close.textContent = closeLabel;
    body.replaceChildren();
    announce('');
    dialog.showModal();
  }

  function openShelf(shelf, label) {
    open(label, '← 売り場に戻る');
    const list = element('ul', '', 'market-list');
    const cart = element('p', '', 'market-total');
    body.append(list, cart);
    const showTotal = () => {
      const items = [...basket.values()];
      const count = items.reduce((sum, { quantity }) => sum + quantity, 0);
      cart.textContent = `かご ${count}点 · ${yen(total(items))}`;
    };
    const renderRegister = () => {
      list.replaceChildren();
      for (const item of basket.values()) {
        const { name, price, quantity } = item;
        const remove = button('1つ戻す', () => {
          if (item.quantity === 1) basket.delete(name);
          else item.quantity -= 1;
          announce(`${name}を1つ棚に戻しました。`);
          renderRegister();
          (list.querySelector('button') || close).focus();
        });
        remove.setAttribute('aria-label', `${name}を1つ戻す`);
        const row = element('li');
        row.append(element('span', `${name} × ${quantity}`), element('span', yen(price * quantity)), remove);
        list.append(row);
      }
      showTotal();
      pay.disabled = !basket.size;
    };
    const pay = button('ゲーム内で会計する', () => {
      if (!basket.size) return;
      receipt = [...basket.values()];
      basket.clear();
      renderRegister();
      const names = receipt.map(({ name, quantity }) => `${name}×${quantity}`).join('、');
      announce(`お会計完了 · ${yen(total(receipt))}\n${names}\n商品を受け取りました。`);
      status(`お会計完了。袋に${receipt.map(({ name }) => name).join('、')}を入れてもらいました。`);
      close.focus();
    }, 'visit');
    if (shelf === 'register') {
      body.append(pay);
      renderRegister();
      if (!basket.size) announce('かごは空です。飲み物か食べ物の棚で商品を選べます。');
    } else {
      for (const [name, price] of catalog[shelf]) {
        const row = element('li');
        const add = button('かごに入れる', () => {
          const item = basket.get(name) ?? { name, price, quantity: 0 };
          item.quantity += 1;
          basket.set(name, item);
          showTotal();
          announce(`${name}をかごに入れました。`);
          status(`かごに${[...basket.values()].reduce((sum, { quantity }) => sum + quantity, 0)}点入っています。右側のレジで会計できます。`);
        });
        add.setAttribute('aria-label', `${name}をかごに入れる`);
        row.append(element('span', name), element('span', yen(price)), add);
        list.append(row);
      }
      showTotal();
    }
    close.focus();
  }

  function openRide(kind, label) {
    const ride = rides[kind];
    const seconds = matchMedia('(prefers-reduced-motion: reduce)').matches ? 3 : ride.seconds;
    open(label, '← 降りる');
    const scene = element('div', '', `ride-window ride-${kind}`);
    scene.style.setProperty('--ride-duration', `${seconds}s`);
    const photo = element('img', '', 'ride-photo');
    photo.src = ride.image;
    photo.alt = ride.alt;
    scene.append(photo);
    const source = avatar();
    const w = source?.naturalWidth ?? source?.width, h = source?.naturalHeight ?? source?.height;
    if (w && h) {
      const rider = element('canvas', '', 'ride-avatar');
      rider.width = w;
      rider.height = h;
      rider.setAttribute('aria-hidden', 'true');
      const context = rider.getContext('2d');
      if (context) {
        context.drawImage(source, 0, 0);
        scene.append(rider);
      }
    }
    const progress = element('span', '', 'ride-progress');
    progress.setAttribute('aria-hidden', 'true');
    scene.append(progress);
    const controls = element('div', '', 'spot-actions ride-actions');
    const rideAgain = button('乗る', () => {
      if (timer) return;
      rideAgain.hidden = true;
      scene.classList.add('riding');
      announce(kind === 'wheel' ? 'ゴンドラが上がり始めました。窓の外を見渡せます。' : 'メリーゴーラウンドが回り始めました。');
      timer = setTimeout(() => {
        timer = 0;
        scene.classList.remove('riding');
        announce('ひと周しました。');
        status(`${label}に乗ってひと周しました。`);
        rideAgain.textContent = 'もう一周';
        rideAgain.hidden = false;
      }, seconds * 1000);
      (kind === 'wheel' ? look : close).focus();
    }, 'visit');
    const look = button('外の景色を見る', () => {
      const outer = scene.classList.toggle('ride-outside');
      look.textContent = outer ? '元の視点に戻す' : '外の景色を見る';
      look.setAttribute('aria-pressed', String(outer));
    });
    look.setAttribute('aria-pressed', 'false');
    controls.append(rideAgain);
    if (kind === 'wheel') controls.append(look);
    body.append(scene, controls);
    rideAgain.focus();
  }

  dialog.addEventListener('close', () => {
    clearTimeout(timer);
    timer = 0;
    body.replaceChildren();
  });
  return {
    openShelf, openRide,
    shoppingMemory: shelf => shelf === 'register' && receipt.length ?
      `お会計したものは${receipt.map(({ name }) => name).join('、')}。この品を絵の小物に使う。` : '',
  };
}

const mix = (a, b, t) => a.map((value, index) => value + (b[index] - value) * t);
const unit = t => Math.min(1, Math.max(0, t));
const swingSeat = [307, 400];
const slideExit = [606, 469];

export function playgroundPose(motion, time) {
  const t = (time - motion.started) / 1000;
  if (motion.kind === 'swing') {
    const amount = (11 + 5 * motion.pumps) * Math.sin(Math.max(0, t - .65) * 3.85);
    const pose = t < .65 ? mix(motion.origin, swingSeat, unit(t / .65)) :
      [swingSeat[0] + amount * .24, swingSeat[1] + amount];
    return { pose, seated: t >= .65, tilt: amount * .22, facing: [0, 1], done: t >= 5.3 + motion.pumps * .42 };
  }
  if (t < 1.55) {
    const steps = [[935, 433], [908, 352], [857, 259], [812, 247]];
    const p = unit(t / 1.55) * steps.length, index = Math.min(steps.length - 1, Math.floor(p));
    const from = index ? steps[index - 1] : motion.origin;
    return { pose: mix(from, steps[index], p - index), facing: [index ? -1 : 1, -1] };
  }
  const descent = unit((t - 1.55) / 1.45);
  const top = [812, 247], curve = [734, 390];
  return { pose: mix(mix(top, curve, descent), mix(curve, slideExit, descent), descent),
    seated: true, tilt: 13 * Math.sin(descent * Math.PI), facing: [-1, 1], done: descent === 1, exit: slideExit };
}
