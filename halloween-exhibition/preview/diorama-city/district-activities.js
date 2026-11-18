import { makeRideStage } from './ride-stage.js?v=20261118-city2';

const catalog = {
  drinks: [['緑茶', 130], ['カフェラテ', 180], ['季節のソーダ', 200]],
  snacks: [['鮭おにぎり', 160], ['たまごサンド', 260], ['プリン', 190]],
};

const rideSeconds = {wheel:12, carousel:9};
const glassColors = {
  amber: { label: '琥珀', light: '#ffc177' },
  teal: { label: '青緑', light: '#68f0d6' },
  indigo: { label: '藍', light: '#839aff' },
};
const eveningGlass = ['amber', 'teal', 'indigo'];
const glassNames = order => order.map(color => glassColors[color].label).join('・');
const isEvening = order => eveningGlass.every((color, index) => order[index] === color);

const yen = price => `${price.toLocaleString('ja-JP')}円`;
const total = items => items.reduce((sum, { price, quantity }) => sum + price * quantity, 0);

// A walk belongs to this traveller in this tab. Card URLs never contain personal play history.
const prices = new Map(Object.values(catalog).flat());
const actionNotes = {
  cafe: {
    counter: '真鍮のカウンターでコーヒーを注文して受け取った。',
    reading: '窓辺の読書席でしおりを裏返すと、小さな部屋番号が書かれていた。',
  },
  park: {
    bench: '水盤そばの木のベンチでひと休みした。',
    dusk: '展望デッキから、塔の向こうに残る夕景を眺めた。',
    night: '展望デッキから、夜の運河に窓明かりが映る様子を眺めた。',
  },
  playground: {
    swing: '運河沿いのブランコに腰かけて、風を感じた。',
    slide: '青い滑り台を滑って、遊具広場の地面に降りた。',
  },
  fair: {
    wheel: '観覧車に乗り、ゴンドラから運河の街を眺めながら一周した。',
    carousel: 'メリーゴーラウンドに乗り、白い木馬で一周した。',
    coach: 'メリーゴーラウンドの馬車席に乗り、灯りの下を一周した。',
  },
  manor: { plaque: '屋敷の入口で古い案内札を読み、三色のガラスの手がかりを見つけた。' },
};

function readItems(pairs) {
  const items = new Map();
  if (Array.isArray(pairs)) for (const pair of pairs) {
    if (!Array.isArray(pair)) continue;
    const [name, quantity] = pair;
    if (prices.has(name) && Number.isSafeInteger(quantity) && quantity > 0 && quantity <= 99)
      items.set(name, { name, price: prices.get(name), quantity });
  }
  return items;
}

export function createCityVisit(storage, traveller) {
  const key = 'atelier-city:visit:v1:' + traveller;
  let saved;
  try { saved = JSON.parse(storage?.getItem(key)); } catch { /* Memory works without storage. */ }
  const basket = readItems(saved?.basket);
  let receipt = [...readItems(saved?.receipt).values()];
  let glass = Array.isArray(saved?.glass) && saved.glass.length === 3 &&
    saved.glass.every(color => Object.hasOwn(glassColors,color)) ? saved.glass : null;
  const actions = new Set(Array.isArray(saved?.actions) ? saved.actions.filter(value => {
    if (typeof value !== 'string') return false;
    const [venue,point] = value.split('.');
    return Object.hasOwn(actionNotes,venue) && Object.hasOwn(actionNotes[venue],point);
  }) : []);
  const pairs = items => Array.from(items, ({name,quantity}) => [name,quantity]);
  function save() {
    try { storage?.setItem(key, JSON.stringify({basket:pairs(basket.values()),receipt:pairs(receipt),glass,actions:[...actions]})); }
    catch { /* Retain the visit in memory if the browser rejects storage. */ }
  }
  function purchaseNote() {
    if (!receipt.length) return '';
    const items = receipt.map(({name,quantity}) => `${name}を${quantity}点`).join('、');
    const names = receipt.map(item => item.name).join('と');
    return `水辺のコンビニで${items}選んだ。木のレジで${yen(total(receipt))}を支払い、${names}の入った紙袋を受け取った。`;
  }
  return {
    basket,
    get receipt() { return receipt; },
    get glass() { return glass; },
    add(name) {
      if (!prices.has(name)) return false;
      const item = basket.get(name) ?? {name, price:prices.get(name), quantity:0};
      if (item.quantity >= 99) return false;
      item.quantity++;
      basket.set(name,item);
      save();
      return true;
    },
    remove(name) {
      const item = basket.get(name);
      if (!item) return;
      if (--item.quantity === 0) basket.delete(name);
      save();
    },
    pay() {
      if (!basket.size) return false;
      receipt = [...basket.values()];
      basket.clear();
      save();
      return true;
    },
    setGlass(colors) {
      glass = [...colors];
      save();
    },
    remember(venue,point) {
      if (!Object.hasOwn(actionNotes,venue) || !Object.hasOwn(actionNotes[venue],point)) return;
      if (venue === 'park' && (point === 'dusk' || point === 'night'))
        actions.delete('park.' + (point === 'dusk' ? 'night' : 'dusk'));
      actions.add(venue+'.'+point);
      save();
    },
    experience(venue,point) {
      if (venue === 'market') {
        if (basket.size) {
          const selected = [...basket.values()].map(({name,quantity}) => `${name}を${quantity}点`).join('、');
          return `水辺のコンビニで${selected}かごに入れた。会計はこれから。`;
        }
        return purchaseNote();
      }
      if (venue === 'mirrorRoom' && glass) return `作業台で左から${glassNames(glass)}の色ガラスを選び、水鏡に灯した。`;
      const notes = actionNotes[venue];
      if (!notes) return '';
      if (venue==='fair' && point==='carousel' && actions.has('fair.coach')) return notes.coach;
      if (point && Object.hasOwn(notes,point))
        return actions.has(venue+'.'+point) ? notes[point] : '';
      return Object.entries(notes).filter(([name]) => actions.has(venue+'.'+name)).map(([,text]) => text).join('');
    },
  };
}

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

export function bindActivities(dialog, { avatar, status, journey, openArticle, motionAllowed = () => !matchMedia('(prefers-reduced-motion: reduce)').matches }) {
  const title = dialog.querySelector('#activity-title');
  const body = dialog.querySelector('#activity-content');
  const message = dialog.querySelector('#activity-message');
  const close = dialog.querySelector('#activity-close');
  const basket = journey.basket;
  let syncRide = null;
  document.addEventListener('visibilitychange',()=>syncRide?.(!document.hidden));
  window.addEventListener('pagehide',()=>syncRide?.(false));
  window.addEventListener('pageshow',()=>syncRide?.(!document.hidden));

  function announce(text) {
    message.hidden = !text;
    message.textContent = text;
  }

  function open(label, closeLabel) {
    syncRide?.(false);
    syncRide=null;
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
          journey.remove(name);
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
      article.hidden = !journey.receipt.length || basket.size > 0;
    };
    const pay = button('ゲーム内で会計する', () => {
      if (!journey.pay()) return;
      const receipt = journey.receipt;
      renderRegister();
      const names = receipt.map(({ name, quantity }) => `${name}×${quantity}`).join('、');
      announce(`お会計完了 · ${yen(total(receipt))}\n${names}\n商品を受け取りました。`);
      status(`お会計完了。袋に${receipt.map(({ name }) => name).join('、')}を入れてもらいました。`);
      close.focus();
    }, 'visit');
    const article = button('この買い物で記事を書く', () => {
      dialog.close();
      openArticle();
    }, 'spot-prompt');
    if (shelf === 'register') {
      body.append(pay,article);
      renderRegister();
      if (!basket.size) announce(journey.receipt.length
        ? '前回のお会計 · ' + yen(total(journey.receipt)) + '　' + journey.receipt.map(({name,quantity}) => name+'×'+quantity).join('、')
        : 'かごは空です。飲み物か食べ物の棚で商品を選べます。');
    } else {
      for (const [name, price] of catalog[shelf]) {
        const row = element('li');
        const add = button('かごに入れる', () => {
          if (!journey.add(name)) { announce('同じ商品は99点までです。'); return; }
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
    const seconds = rideSeconds[kind];
    open(label, '← 降りる');
    const scene = element('div', '', `ride-window ride-${kind}`);
    scene.style.setProperty('--ride-duration', `${seconds}s`);
    const stage = makeRideStage(scene, kind, avatar(kind==='carousel'?'saddle':'sit'));
    const progress = element('span', '', 'ride-progress');
    progress.setAttribute('aria-hidden', 'true');
    scene.append(progress);
    const controls = element('div', '', 'spot-actions ride-actions');
    const rideAgain = button('乗る', () => {
      if (syncRide) return;
      rideAgain.hidden = true;
      const finish = () => {
        syncRide = null;
        scene.classList.remove('riding');
        announce('ひと周しました。');
        status(`${label}に乗ってひと周しました。`);
        journey.remember('fair',kind==='carousel' && scene.querySelector('.carousel-coach') ? 'coach' : kind);
        rideAgain.textContent = 'もう一周';
        rideAgain.hidden = false;
      };
      if(!motionAllowed()){finish();rideAgain.focus();return;}
      scene.classList.add('riding');
      announce(kind === 'wheel' ? 'ゴンドラが上がり始めました。窓の外を見渡せます。' : 'メリーゴーラウンドが回り始めました。');
      let frame=0,elapsed=0,since=null;
      const duration=seconds*1000;
      const tick=now=>{
        if(since===null)return;
        elapsed+=now-since;
        since=now;
        const fraction=Math.min(1,elapsed/duration);
        stage.draw(fraction);
        if(fraction===1||!motionAllowed()){stage.draw(1);finish();return;}
        frame=requestAnimationFrame(tick);
      };
      syncRide=visible=>{
        cancelAnimationFrame(frame);
        const now=performance.now();
        if(since!==null)elapsed+=now-since;
        since=visible?now:null;
        scene.classList.toggle('ride-paused',!visible);
        if(visible)frame=requestAnimationFrame(tick);
      };
      syncRide(!document.hidden);
      (kind === 'wheel' ? look : close).focus();
    }, 'visit');
    const look = button('外の景色を見る', () => {
      const outer = stage.switchView();
      look.textContent = outer ? '観覧車全体に戻す' : '外の景色を見る';
      look.setAttribute('aria-pressed', String(outer));
    });
    look.setAttribute('aria-pressed', 'false');
    controls.append(rideAgain);
    if (kind === 'wheel') controls.append(look);
    body.append(scene, controls);
    rideAgain.focus();
  }

  function reflectionStatus() {
    const glass = journey.glass;
    if (!glass) return '水面は静かです。色ガラスの台で灯りを映せます。';
    return isEvening(glass) ? '琥珀・青緑・藍。「夕暮れの灯り」が水鏡にそろいました。' :
      `${glassNames(glass)}の光が水面で揺れています。`;
  }

  function openGlass(label, reflect) {
    open(label, '← 水鏡の間に戻る');
    const selected = journey.glass?.slice() ?? ['indigo', 'amber', 'teal'];
    const fieldset = element('fieldset', '', 'glass-choices');
    fieldset.append(element('legend', '水鏡に映す色'));
    ['左', '中央', '右'].forEach((name, index) => {
      const row = element('label', name);
      const select = element('select');
      select.setAttribute('aria-label', `${name}の色ガラス`);
      const sample = element('span', '', 'glass-swatch');
      sample.setAttribute('aria-hidden', 'true');
      for (const [key, color] of Object.entries(glassColors)) {
        const option = element('option', color.label);
        option.value = key;
        select.append(option);
      }
      const update = () => {
        selected[index] = select.value;
        sample.style.setProperty('--glass-light', glassColors[select.value].light);
      };
      select.value = selected[index];
      select.addEventListener('change', update);
      update();
      row.append(select, sample);
      fieldset.append(row);
    });
    const apply = button('水面に灯す', () => {
      journey.setGlass(selected);
      reflect(selected.map(color => glassColors[color].light));
      dialog.close();
      status(reflectionStatus());
    }, 'visit');
    body.append(fieldset, apply);
    fieldset.querySelector('select').focus();
  }

  dialog.addEventListener('close', () => {
    if(dialog.open)return;
    syncRide?.(false);
    syncRide=null;
    body.replaceChildren();
  });
  return {
    openShelf, openRide, openGlass, reflectionStatus,
    openVehicle(label, panel) {
      open(label, '← お店に戻る');
      body.append(panel);
    },
    restoreGlass(reflect) {
      if (journey.glass) reflect(journey.glass.map(color => glassColors[color].light));
    },
  };
}

const mix = (a, b, t) => a.map((value, index) => value + (b[index] - value) * t);
const unit = t => Math.min(1, Math.max(0, t));
// Positions are the sprite’s feet; seated hips lie above them on the painted seat.
const swingSeat = [306, 423];
const slideExit = [606, 486];

export function playgroundPose(motion, time) {
  let t = Math.max(0,(time - motion.started) / 1000);
  const smooth=value=>{const n=unit(value);return n*n*(3-2*n);};
  const stop=motion.dismount;
  if(stop&&motion.kind==='slide'){
    const elapsed=t-stop.at;
    if(stop.at<1.55){
      t=Math.max(0,stop.at-elapsed*1.5);
      if(!t)return {pose:motion.origin,exit:motion.origin,facing:[0,1],done:true};
    }else t=stop.at+elapsed*1.35;
  }else if(stop){
    const progress=smooth((t-stop.at)/.65);
    return {pose:mix(stop.from,motion.origin,progress),seated:false,facing:[0,1],done:progress===1,exit:motion.origin};
  }
  if (motion.kind === 'bench') {
    const seat=[181,389];
    const pose=t<.8?mix(motion.origin,seat,smooth(t/.8)):mix(seat,motion.origin,smooth((t-4.2)/.8));
    return {pose,seated:t>=.8&&t<=4.2,facing:[0,1],done:t>=5,exit:motion.origin};
  }
  if (motion.kind === 'swing') {
    const pumps=motion.pumpTimes??[];
    const end=5.3+.45*pumps.length;
    const amplitude=11+pumps.reduce((sum,at)=>sum+5*smooth((t-at)/.6),0);
    const envelope=smooth((t-.65)/.55)*smooth((end-t)/.75);
    const angle=amplitude*envelope*Math.sin(Math.max(0,t-.65)*3.85)*Math.PI/180;
    const arc=66*Math.sin(angle);
    const pose=t<.65?mix(motion.origin,swingSeat,smooth(t/.65)):
      t>end?mix(swingSeat,motion.origin,smooth((t-end)/.7)):
      [swingSeat[0]+arc*.24,swingSeat[1]+arc*.60-66*(1-Math.cos(angle))];
    return {pose,seated:t>=.65&&t<=end,tilt:angle*28,facing:[0,1],done:t>=end+.7,exit:motion.origin};
  }
  if (t < 1.55) {
    const steps = [[932, 410], [903, 349], [862, 272], [789, 254]];
    const p = unit(t / 1.55) * steps.length, index = Math.min(steps.length - 1, Math.floor(p));
    const from = index ? steps[index - 1] : motion.origin;
    const pose=mix(from,steps[index],p-index);
    return {pose, groundY:index===0?pose[1]:steps[0][1], facing:[index?-1:1,-1]};
  }
  const descent = unit((t - 1.55) / 1.45);
  const top = [789, 254], curve = [728, 410];
  return { pose: mix(mix(top, curve, descent), mix(curve, slideExit, descent), descent),
    groundY:410+(slideExit[1]-410)*descent, seated:true, tilt:13*Math.sin(descent*Math.PI), facing:[-1,1], done:descent===1, exit:slideExit };
}
