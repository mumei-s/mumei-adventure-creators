// ==UserScript==
// @name         無名S Halloween 参加者名リンク補修
// @namespace    https://github.com/mumei-s/mumei-adventure-creators/halloween-name-links
// @version      1.2.0
// @description  名前リンク補修と、確認後だけ行うゲーム入口文の差し替え。対象段落以外は保持。外部送信なし。
// @match        https://editor.note.com/notes/n603c26c01384/*
// @noframes
// @run-at       document-idle
// @grant        unsafeWindow
// @updateURL    https://raw.githubusercontent.com/mumei-s/mumei-adventure-creators/main/halloween-exhibition/preview/horror-night/halloween-name-links.user.js
// @downloadURL  https://raw.githubusercontent.com/mumei-s/mumei-adventure-creators/main/halloween-exhibition/preview/horror-night/halloween-name-links.user.js
// ==/UserScript==
(function () {
'use strict';
const NOTE_ID='n603c26c01384';
const GAME_BASE='https://mumei-s.github.io/mumei-adventure-creators/halloween-exhibition/preview/horror-night/';
const GAME_URLS=[1,2,3].map(n=>GAME_BASE+'?scene='+n+'&v=20261031-roundtrip-2');
const GAME_LABELS=[
 ['ゲームⅠへ――写真にだけ、近い',0],['ゲームⅡへ――先に帰る私',1],['ゲームⅢへ――門のガラスに、私が映っていた',2],
 ['街へ①――広場で集合写真を撮る',0],['街へ②――暗くなった通りを歩き、書庫へ戻る',1],['街へ③――みんなを追いかけて、出口へ向かう',2],
 ['ゲームⅠへ',0],['ゲームⅡへ',1],['ゲームⅢへ',2],['ゲーム1へ',0],['ゲーム2へ',1],['ゲーム3へ',2]
];
const LINKS=[
 ['まこさん','https://note.com/koakumako/n/na9731433238f'],
 ['たけちさん','https://note.com/imota14/n/n618813fb0e89'],
 ['Pajama de mamaさん','https://note.com/mama_ca/n/n8e74b9e2b535'],
 ['まりもさん','https://note.com/soh_style_work/n/nc02977b1ebf9'],
 ['🍞たんたん🐼さん','https://note.com/glossy_guppy6230/n/n4b2ef2311c28'],
 ['たんたん🐼さん','https://note.com/glossy_guppy6230/n/n4b2ef2311c28'],
 ['たんたんさん','https://note.com/glossy_guppy6230/n/n4b2ef2311c28'],
 ['やまこんさん','https://note.com/fond_holly3483/n/ne5a25ae27a20'],
 ['CNA運営さん','https://note.com/grand_daisy8632'],
 ['天界記録さん','https://note.com/tenkai_notes/n/n72ea89e9a32e'],
 ['ミナト汐さん','https://note.com/n_kazumai55633/n/n4cc7e57a4182'],
 ['ロキろんさん','https://note.com/cheeky_rhino7031/n/nd58ac4b4c53d'],
 ['あいはんさん','https://note.com/aihan_days/n/nfa274d6fe464'],
 ['アイリスさん','https://note.com/real_hyena9474/n/nde7d4a19044d'],
 ['なえもさん','https://note.com/naemotion/n/n26b717b6c247'],
 ['カモミールさん','https://note.com/clever_hare2654/n/nf731501cfb0e'],
 ['カモミールさ〜ん','https://note.com/clever_hare2654/n/nf731501cfb0e'],
 ['ドイルさん','https://note.com/dandy_snake880/n/n084c0d58f567'],
 ['凛さん','https://note.com/airoumu_rin/n/n7179d2f821e8'],
 ...GAME_LABELS.map(([label,index])=>[label,GAME_URLS[index]])
].sort((a,b)=>b[0].length-a[0].length);
function matches(text,start=0){
 const hits=[];
 for(const [name,url] of LINKS){
  let at=0;
  while((at=text.indexOf(name,at))!==-1){
   const from=start+at,to=from+name.length;
   if(!hits.some(h=>from<h.to&&to>h.from))hits.push({name,url,from,to});
   at+=name.length;
  }
 }
 return hits.sort((a,b)=>a.from-b.from);
}
function collect(doc){
 const hits=[];
 doc.descendants((block,pos)=>{
  if(block.type?.spec?.code||block.type?.name==='image'||block.isAtom)return false;
  if(!block.isTextblock)return;
  let text='',start=0;
  const flush=()=>{if(text)hits.push(...matches(text,start));text='';};
  block.forEach((node,offset)=>{
   const forbidden=node.marks?.some(m=>m.type?.spec?.code||m.type?.name==='code');
   if(!node.isText||forbidden){flush();return;}
   if(!text)start=pos+1+offset;
   text+=node.text;
  });
  flush();return false;
 });
 return hits;
}
function rangeState(doc,hit,type,attr){
 let covered=0,correct=0,conflict=false,allowed=true;
 doc.nodesBetween(hit.from,hit.to,(node,pos,parent)=>{
  if(!node.isText)return;
  const count=Math.max(0,Math.min(hit.to,pos+node.nodeSize)-Math.max(hit.from,pos));
  if(!count)return;
  covered+=count;
  if(parent?.type?.allowsMarkType&&!parent.type.allowsMarkType(type))allowed=false;
  const mark=node.marks?.find(m=>m.type===type);
  if(mark){if(mark.attrs[attr]===hit.url)correct+=count;else conflict=true;}
 });
 if(covered!==hit.to-hit.from||!allowed)return 'unsupported';
 if(conflict)return 'conflict';
 return correct===covered?'existing':'add';
}
function withoutLinks(json,typeName){
 const out={...json};
 if(out.marks){out.marks=out.marks.filter(m=>m.type!==typeName);if(!out.marks.length)delete out.marks;}
 if(out.content){
  const content=[];
  for(const raw of out.content){
   const item=withoutLinks(raw,typeName),previous=content[content.length-1];
   if(previous?.type==='text'&&item.type==='text'&&JSON.stringify({...previous,text:''})===JSON.stringify({...item,text:''}))previous.text+=item.text;
   else content.push(item);
  }
  out.content=content;
 }
 return out;
}
function sameStructure(a,b,type){return JSON.stringify(withoutLinks(a.toJSON(),type))===JSON.stringify(withoutLinks(b.toJSON(),type));}
function gameReport(hits,doc,type,attr){
 const rows=GAME_URLS.map((url,index)=>{
  const found=hits.filter(h=>h.url===url);
  const c=STORY_CTAS[index];
  doc.descendants((n,pos)=>{if(n.isTextblock&&n.textContent===c.label){found.push({from:pos+1,to:pos+1+c.label.length,url:c.url});return false;}});
  const ok=found.length&&found.every(h=>rangeState(doc,h,type,attr)==='existing');
  return 'ゲーム'+['Ⅰ','Ⅱ','Ⅲ'][index]+'：'+(ok?'リンク設定済み':found.length?'既存リンク等を確認してください':'入口の文字が見つかりません');
 });
 return rows.join('\n');
}

// Separate, opt-in story action. Never used by the existing link-only action.
const STORY_CTAS=[
 {lines:['せっかくだし、一枚だけ。','……あの人も、写るんだろうか。'],label:'広場で写真を撮る → タップ'},
 {lines:['みんなは、あの奥にいる。','……行かなきゃ。'],label:'暗くなった書庫へ進む → タップ'},
 {lines:['まだ、追いつける。','門が閉まる前に。'],label:'みんなを追いかける → タップ'}
].map((c,i)=>({...c,url:GAME_BASE+'?scene='+(i+1)}));
function storyPlan(doc,schema,type,attr){
 const entries=[],diagnostics=[],blocks=[];
 doc.forEach((node,pos,index)=>blocks.push({node,pos,index}));
 for(let i=0;i<STORY_CTAS.length;i++){
  const c=STORY_CTAS[i],prefix='ゲーム'+['Ⅰ','Ⅱ','Ⅲ'][i]+'：';
  const labels=GAME_LABELS.filter(x=>x[1]===i).map(x=>x[0]);
  // Inspect all textblocks, not just top-level, so nested duplicates also block edits.
  const candidates=[];let prior=false;
  doc.descendants((n,pos)=>{if(n.isTextblock){if(labels.includes(n.textContent))candidates.push(pos);if([c.label,...c.lines].some(t=>n.textContent.includes(t)))prior=true;return false;}});
  if(prior){diagnostics.push(prefix+'新しい入口文またはその一部が存在します。重ねて追加しません。');continue;}
  if(candidates.length!==1){diagnostics.push(prefix+(candidates.length?'入口が複数あります。変更しません。':'完全一致する入口段落がありません。変更しません。'));continue;}
  const b=blocks.find(b=>b.pos===candidates[0]);
  if(!b||b.node.type!==schema.nodes.paragraph||!b.node.isTextblock){diagnostics.push(prefix+'通常の最上位段落ではないため変更しません。');continue;}
  let safe=true;
  b.node.forEach(n=>{if(!n.isText||n.marks.some(m=>m.type!==type||![GAME_URLS[i],c.url].includes(m.attrs[attr])))safe=false;});
  if(!safe||!b.node.type.allowsMarkType(type)){diagnostics.push(prefix+'装飾・別リンク・画像等があるため変更しません。');continue;}
  const mark=type.create({[attr]:c.url});
  const nodes=[...c.lines.map(t=>schema.nodes.paragraph.createChecked(null,schema.text(t))),b.node.type.createChecked(b.node.attrs,schema.text(c.label,[mark]),b.node.marks)];
  entries.push({...b,nodes,scene:i+1});diagnostics.push(prefix+'入口1段落を、導入2段落＋リンク1段落に変更');
 }
 return {before:doc,entries,diagnostics};
}
function storyTransaction(state,plan){
 if(state.doc!==plan.before)throw Error('確認後に本文が変わりました。再度「入口文の変更内容を確認」を押してください。');
 const expected=[],byIndex=new Map(plan.entries.map(e=>[e.index,e]));
 state.doc.forEach((n,p,i)=>expected.push(...(byIndex.get(i)?.nodes||[n])));
 const expectedDoc=state.doc.type.createChecked(state.doc.attrs,expected,state.doc.marks);
 const tr=state.tr;
 for(const e of [...plan.entries].sort((a,b)=>b.pos-a.pos))tr.replaceWith(e.pos,e.pos+e.node.nodeSize,e.nodes);
 if(tr.steps.length!==plan.entries.length||tr.steps.some(s=>s.toJSON().stepType!=='replace')||!tr.doc.eq(expectedDoc))throw Error('対象の入口段落以外に変更が及ぶため停止しました。');
 return tr;
}

if(typeof document==='undefined'){
 if(typeof module!=='undefined')module.exports={STORY_CTAS,storyPlan,storyTransaction,LINKS,GAME_URLS,GAME_LABELS,matches,collect,rangeState,withoutLinks,sameStructure,gameReport};
 return;
}
const page=typeof unsafeWindow!=='undefined'?unsafeWindow:window;
const target=()=>location.hostname==='editor.note.com'&&location.pathname.split('/').includes(NOTE_ID);
if(!target()||document.getElementById('halloween-name-links-v1'))return;
let cached=null,undo=null,busy=false,host=null,storyPreview=null;
function isView(v,root){try{return Boolean(v&&v.dom===root&&v.state?.doc&&v.state?.schema&&typeof v.dispatch==='function'&&typeof v.posAtDOM==='function'&&!v.isDestroyed)}catch{return false;}}
function findView(){
 const root=page.document.querySelector('.ProseMirror[contenteditable="true"]');
 if(!root)return null;
 if(isView(cached,root))return cached;
 const queue=[],seen=new Set();
 let e=root;for(let i=0;i<6&&e;i++,e=e.parentElement)queue.push([e,0]);
 const skip=new Set(['window','document','ownerDocument','parentNode','children','childNodes','style','cookie','localStorage','sessionStorage']);
 for(let i=0;i<queue.length&&i<14000;i++){
  const [v,depth]=queue[i];if(!v||seen.has(v))continue;seen.add(v);
  if(isView(v,root))return cached=v;
  for(const key of ['view','editorView']){try{if(isView(v[key],root))return cached=v[key];}catch{}}
  let descriptors;try{descriptors=Object.getOwnPropertyDescriptors(v)}catch{continue;}
  for(const [key,d] of Object.entries(descriptors)){
   if(skip.has(key)||!('value' in d))continue;
   const x=d.value;
   if(isView(x,root))return cached=x;
   if(depth<7&&x&&(typeof x==='object'||typeof x==='function')&&x!==page&&x!==page.document&&queue.length<18000)queue.push([x,depth+1]);
  }
 }
 return null;
}
function linkType(schema){
 const type=schema.marks.link;
 const attr=type?.attrs?.href?'href':type?.attrs?.url?'url':null;
 if(!type||!attr||typeof type.spec.toDOM!=='function')throw Error('リンクの編集形式を確認できません。本文は変更していません。');
 const test='https://note.com/koakumako/n/na9731433238f';
 const mark=type.create({[attr]:test}),dom=type.spec.toDOM(mark,true);
 if(!Array.isArray(dom)||dom[0]!=='a'||dom[1]?.href!==test)throw Error('リンク形式が想定と異なります。本文は変更していません。');
 return{type,attr};
}
function currentView(){
 if(!target())throw Error('対象の記事ではありません。変更しません。');
 const view=findView();
 if(!view)throw Error('noteの編集データを取得できません。変更していません。');
 if(view.composing)throw Error('文字変換を確定してから押してください。変更していません。');
 const text=view.state.doc.textContent;
 if(!text.includes('宮殿前の広場')||!text.includes('白い仮面'))throw Error('白い仮面の記事を確認できません。変更していません。');
 return view;
}
function mount(){
 if(host||!target())return;
 host=document.createElement('div');host.id='halloween-name-links-v1';
 const shadow=host.attachShadow({mode:'open'});
 shadow.innerHTML=`<style>:host{all:initial;position:fixed;right:10px;top:74px;z-index:2147483646;font:14px/1.6 system-ui,sans-serif;color:#18202a}*{box-sizing:border-box}details{width:min(320px,calc(100vw - 20px));background:#fff;color:#18202a;border:2px solid #584172;border-radius:12px;box-shadow:0 3px 15px #0004}summary{cursor:pointer;padding:10px 12px;font-weight:700;list-style:none}section{padding:0 12px 12px}p{margin:4px 0 10px;white-space:pre-wrap;font-size:13px}button{font:inherit;min-height:44px;cursor:pointer;border:1px solid #584172;border-radius:8px;background:#584172;color:#fff;padding:8px 12px;margin:4px 0;width:100%}button:disabled{opacity:.5;cursor:default}.secondary{background:#fff;color:#18202a}small{display:block;font-size:11px}button:focus-visible,summary:focus-visible{outline:3px solid #a27bd1;outline-offset:2px}[hidden]{display:none!important}</style><details open><summary>名前・ゲームリンク補修 1.2.0 ▾</summary><section><p>本文を貼り直さず、参加者名とゲームⅠ〜Ⅲの入口文字にリンクだけを追加します。別のリンクや追加した挿絵は変更しません。</p><button id="apply">名前とゲームのリンクを付ける</button><button id="story-preview" class="secondary">入口文の変更内容を確認</button><p id="story-details"></p><button id="story-apply" hidden>確認した入口文だけを差し替える</button><p id="status" role="status" aria-live="polite">白い仮面の記事専用。本文・画像・改行は置き換えません。</p><button id="undo" class="secondary" hidden>今回の変更を戻す</button><small>自動公開しません。noteの通常の自動保存は働く場合があります。CNA運営さんはプロフィールへリンクします。ゲームの戻り先は現時点では専用本文ページです。noteの続きへの接続完了ではありません。</small><button id="close" class="secondary">パネルを閉じる</button></section></details>`;
 document.body.append(host);
 const button=shadow.getElementById('apply'),status=shadow.getElementById('status'),undoButton=shadow.getElementById('undo');
 const say=text=>status.textContent=text;

 const previewButton=shadow.getElementById('story-preview'),storyButton=shadow.getElementById('story-apply'),storyDetails=shadow.getElementById('story-details');
 previewButton.onclick=()=>{
  if(busy)return;storyPreview=null;storyButton.hidden=true;
  try{
   const view=currentView(),{type,attr}=linkType(view.state.schema);
   const plan=storyPlan(view.state.doc,view.state.schema,type,attr);
   const previews=plan.entries.map(e=>{const c=STORY_CTAS[e.scene-1];return 'ゲーム'+e.scene+'\n'+c.lines.join('\n')+'\n'+c.label+'\n'+c.url;});
   storyDetails.textContent=plan.diagnostics.join('\n')+'\n\n'+previews.join('\n\n')+'\n\n対象'+plan.entries.length+'段落の文字を差し替え、導入'+(plan.entries.length*2)+'段落を追加。画像・他の段落・見出しは変更しません。漫画の追加・位置確認は別途必要です。noteの自動保存が働く場合があります。';
   // Build and verify without dispatching; preview itself never edits the document.
   storyTransaction(view.state,plan);
   storyPreview={view,plan};storyButton.hidden=!plan.entries.length;
   say('変更内容とリンク先を確認してから差し替えボタンを押してください。まだ変更していません。');
  }catch(error){say(error.message);}
 };
 storyButton.onclick=()=>{
  if(busy||!storyPreview)return;busy=true;storyButton.disabled=true;
  try{
   const view=currentView();
   if(view!==storyPreview.view)throw Error('編集画面が変わりました。再確認してください。');
   const plan=storyPreview.plan,tr=storyTransaction(view.state,plan);
   if(!plan.entries.length)return;
   const inverse=tr.steps.map((s,i)=>s.invert(tr.docs[i])).reverse();
   tr.setMeta('addToHistory',true);
   // Undo data stays in memory only; never log, upload, or persist draft content.
   const record={view,before:plan.before,after:tr.doc,inverse};
   view.dispatch(tr);
   storyPreview=null;storyButton.hidden=true;
   if(!view.state.doc.eq(tr.doc))throw Error('編集側の反映を確認できません。完了扱いにしていません。プレビューを確認してください。');
   undo=record;undoButton.hidden=false;
   say(plan.entries.length+'か所の入口文とリンクを編集データで確認しました。画像・他の段落は保持しています。保存後の下書きプレビューで確認してください。公開はしていません。');
  }catch(error){storyPreview=null;storyButton.hidden=true;say(error.message);}
  finally{busy=false;storyButton.disabled=false;}
 };
 shadow.getElementById('close').onclick=()=>{shadow.querySelector('details').open=false;};
 button.onclick=async()=>{
  if(busy)return;busy=true;button.disabled=true;
  try{
   const view=currentView(),before=view.state.doc,{type,attr}=linkType(view.state.schema);
   const hits=collect(before),plan=[],skipped=[];let existing=0;
   for(const hit of hits){const s=rangeState(before,hit,type,attr);if(s==='add')plan.push(hit);else if(s==='existing')existing++;else skipped.push(hit.name);}
   if(!hits.length){say('本文に対象の名前・入口文字が見つかりません。変更していません。');return;}
   const suffix=skipped.length?'\n別のリンク等がある'+skipped.length+'か所は変更していません。':'';
   if(!plan.length){say('編集データに正しいリンクが'+existing+'か所あります。追加は不要です。\n'+gameReport(hits,before,type,attr)+suffix);return;}
   const tr=view.state.tr;
   for(const hit of plan)tr.addMark(hit.from,hit.to,type.create({[attr]:hit.url}));
   if(!tr.steps.length||tr.steps.some(s=>s.toJSON().stepType!=='addMark')||!sameStructure(before,tr.doc,type.name))throw Error('文字や構成が変わる処理を検出したため停止しました。本文は変更していません。');
   if(!plan.every(h=>rangeState(tr.doc,h,type,attr)==='existing'))throw Error('予定したリンクを確認できません。本文は変更していません。');
   if(view.state.doc!==before)throw Error('本文が更新されたため停止しました。もう一度押してください。');
   const inverse=tr.steps.map((s,i)=>s.invert(tr.docs[i])).reverse();
   tr.setMeta('addToHistory',true);view.dispatch(tr);
   if(!view.state.doc.eq(tr.doc))throw Error('編集側が変更を受け入れたことを確認できません。完了扱いにしていません。');
   undo={view,before,after:tr.doc,inverse};undoButton.hidden=false;
   say('リンクを設定しています…');
   await new Promise(resolve=>setTimeout(resolve,600));
   if(!target()||!view.dom.isConnected||!view.state.doc.eq(undo.after))throw Error('その後に編集データが変わったため、完了確認を停止しました。下書きプレビューを確認してください。');
   if(!plan.every(h=>rangeState(view.state.doc,h,type,attr)==='existing'))throw Error('リンクが保持されたことを確認できません。完了扱いにしていません。');
   say('編集データで'+plan.length+'か所の追加リンクを確認しました。既存'+existing+'か所は保持。\n'+gameReport(hits,view.state.doc,type,attr)+'\n下書き保存後、プレビューでリンク先を確認してください。'+suffix);
  }catch(error){say(error.message||'確認できないため停止しました。');}
  finally{busy=false;button.disabled=false;}
 };
 undoButton.onclick=()=>{
  if(!undo||busy)return;
  try{
   const view=currentView();
   if(view!==undo.view||!view.state.doc.eq(undo.after))throw Error('追加後に本文が編集されています。古い位置で戻さず停止しました。');
   const tr=view.state.tr;for(const step of undo.inverse)tr.step(step);
   if(!tr.doc.eq(undo.before))throw Error('元の状態との一致を確認できません。変更していません。');
   view.dispatch(tr);
   if(!view.state.doc.eq(undo.before))throw Error('取り消しを確認できません。');
   undo=null;undoButton.hidden=true;say('今回の変更だけを戻しました。');
  }catch(error){say(error.message);}
 };
}
if(document.body)mount();else document.addEventListener('DOMContentLoaded',mount,{once:true});
})();

