import { chatgptAppLink, towerUrl } from './prompt-play.js?v=20261118-speed';

const models = {
  car: {name:'車', shop:'車のショールーム', space:'parking', bay:'地下駐車場', example:'深緑の小さなワゴン、アイボリーの屋根', details:'四輪の位置、タイヤの接地、窓とドアの境界、前後の灯火が自然につながる車体にする。'},
  motorcycle: {name:'バイク', shop:'バイク工房', space:'motorcycle', bay:'バイク置き場', example:'紺色のツーリングバイク、革のサイドバッグ', details:'前後輪、フロントフォーク、エンジン、サドル、排気系を自然につなぎ、スタンドで支える。'},
  bicycle: {name:'自転車', shop:'自転車店', space:'bicycle', bay:'駐輪コート', example:'空色の街乗り自転車、籐の前かご', details:'二つの車輪、スポーク、フレーム、クランク、チェーン、ペダルのつながりと遠近を確認する。'},
};

export function vehiclePrompt(kind, ideas, id, space) {
  const model = models[kind];
  const parking = new URL(towerUrl);
  parking.searchParams.set('space', space || model.space);
  parking.hash = 'vehicle-registration';
  return [
    '【#無名Sプロンプト｜' + model.shop + 'で自分の' + model.name + 'をつくる】',
    id && '参加クリエイター：@' + id,
    '画像生成機能で、私のオリジナルの' + model.name + 'を１台、完成画像としてこのチャットに表示してください。写真・ID・外部検索・デザイン案の確認は不要です。希望がそろった今すぐ描いてください。',
    ideas.trim() ? '希望の車種・色・装備・画風：' + ideas.trim() :
      '色・形・装備はおまかせ。同じ会話で私の作品や好みが分かる場合は、それを１つデザインに取り入れてください。',
    '指定した実写・アニメ・幻想などの画風を守ってください。斜め前から見て手前を向く構図で、車体全体と全ての車輪を余白の内側に収めます。' + model.details,
    '背景は本物のアルファ透過PNG。影はタイヤ直下に薄く。人物、文字、ロゴ、ナンバーの文字、背景の市松模様は描かず、車両単体を出力してください。',
    '完成したら、画像を保存して、自分の号室の区画へ登録するリンクを案内してください。\n' + parking.href,
  ].filter(Boolean).join('\n\n');
}

const make = (tag, text) => {
  const node = document.createElement(tag);
  node.textContent = text || '';
  return node;
};

export function vehicleStudio(kind, {id, space, onRegister} = {}) {
  const model = models[kind];
  const section = make('section');
  section.className = 'vehicle-studio';
  const intro = make('p', '車両の写真は不要です。希望を書いてプロンプトをコピーし、ChatGPTで画像をつくれます。');
  const label = make('label', '形・色・装備・画風（任意）');
  const ideas = make('input');
  ideas.maxLength = 300;
  ideas.placeholder = model.example;
  label.append(ideas);
  const preview = make('details');
  const output = make('textarea');
  output.readOnly = true;
  output.rows = 6;
  output.setAttribute('aria-label', model.name + 'の生成プロンプト');
  preview.append(make('summary', 'プロンプトを表示'), output);
  const render = () => { output.value = vehiclePrompt(kind,ideas.value,id,space); };
  ideas.addEventListener('input', render);
  render();
  const copy = make('button', model.name + 'の生成プロンプトをコピー');
  copy.type = 'button';
  const status = make('p');
  status.setAttribute('role','status');
  copy.addEventListener('click',async () => {
    try {
      await navigator.clipboard.writeText(output.value);
      status.textContent = 'コピーしました。ChatGPTに貼り付けてください。';
    } catch {
      preview.open = true;
      output.focus();
      output.select();
      status.textContent = '選択中のプロンプトをコピーできます。';
    }
  });
  const app = chatgptAppLink(navigator);
  const links = make('div');
  for (const [text,href,newTab] of [[app.label,app.href,app.newTab],['Web版を開く',new URL('./chatgpt-web.html',import.meta.url).href,true]]) {
    const link = make('a',text);
    link.href = href;
    if (newTab) { link.target = '_blank'; link.rel = 'noopener'; }
    links.append(link);
  }
  const parking = new URL('./',import.meta.url);
  parking.searchParams.set('space',space || model.space);
  parking.hash = 'vehicle-registration';
  const register = make('a', 'できた画像を号室に登録する');
  register.href = parking.href;
  if (onRegister) register.addEventListener('click',event => {event.preventDefault();onRegister();});
  section.append(intro,label,preview,copy,status,links,make('p','できた画像を端末に保存してください。入居後、自分の号室の区画に展示できます。'),register);
  return section;
}
