// ==UserScript==
// @name         無名S Halloween 参加者名リンク補修
// @namespace    https://github.com/mumei-s/mumei-adventure-creators/halloween-name-links
// @version      1.0.0
// @description  白い仮面の記事の参加者名にリンクだけを追加。本文・画像・改行を置換しない。外部送信なし。
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
 ['凛さん','https://note.com/airoumu_rin/n/n7179d2f821e8']
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
   // Adding an inline mark splits text nodes. Compare the canonical text runs,
   // not the incidental node boundaries, while retaining every other mark.
   if(previous?.type==='text'&&item.type==='text'&&JSON.stringify({...previous,text:''})===JSON.stringify({...item,text:''}))previous.text+=item.text;
   else content.push(item);
  }
  out.content=content;
 }
 return out;
}
function sameStructure(a,b,type){return JSON.stringify(withoutLinks(a.toJSON(),type))===JSON.stringify(withoutLinks(b.toJSON(),type));}
// The pure matching checks can run in Node without accessing a browser account.
if(typeof document==='undefined'){
 if(typeof module!=='undefined')module.exports={LINKS,matches,collect,rangeState,withoutLinks,sameStructure};
 return;
}
const page=typeof unsafeWindow!=='undefined'?unsafeWindow:window;
const target=()=>location.hostname==='editor.note.com'&&location.pathname.split('/').includes(NOTE_ID);
if(!target()||document.getElementById('halloween-name-links-v1'))return;
let cached=null,undo=null,busy=false,host=null;
function isView(v,root){try{return Boolean(v&&v.dom===root&&v.state?.doc&&v.state?.schema&&typeof v.dispatch==='function'&&typeof v.posAtDOM==='function'&&!v.isDestroyed)}catch{return false;}}
function findView(){
 const root=page.document.querySelector('.ProseMirror[contenteditable="true"]');
 if(!root)return null;
 if(isView(cached,root))return cached;
 // Use the editor-view discovery used by the separate thumbnail tool. Do not
 // call internal uploads, APIs, save/publish buttons, or arbitrary factories.
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
 shadow.innerHTML=`<style>:host{all:initial;position:fixed;right:10px;top:74px;z-index:2147483646;font:14px/1.6 system-ui,sans-serif;color:#18202a}*{box-sizing:border-box}details{width:min(320px,calc(100vw - 20px));background:#fff;color:#18202a;border:2px solid #584172;border-radius:12px;box-shadow:0 3px 15px #0004}summary{cursor:pointer;padding:10px 12px;font-weight:700;list-style:none}section{padding:0 12px 12px}p{margin:4px 0 10px;white-space:pre-wrap;font-size:13px}button{font:inherit;min-height:44px;cursor:pointer;border:1px solid #584172;border-radius:8px;background:#584172;color:#fff;padding:8px 12px;margin:4px 0;width:100%}button:disabled{opacity:.5;cursor:default}.secondary{background:#fff;color:#18202a}small{display:block;font-size:11px}button:focus-visible,summary:focus-visible{outline:3px solid #a27bd1;outline-offset:2px}[hidden]{display:none!important}</style><details open><summary>参加者リンク補修 ▾</summary><section><p>本文を貼り直さず、名前にリンクだけを追加します。ほかのリンクは上書きしません。</p><button id="apply">参加者名にリンクを付ける</button><p id="status" role="status" aria-live="polite">白い仮面の記事専用。本文・画像・改行は置き換えません。</p><button id="undo" class="secondary" hidden>今回追加したリンクを戻す</button><small>自動公開しません。noteの通常の自動保存は働く場合があります。CNA運営さんはプロフィールへリンクします。</small><button id="close" class="secondary">パネルを閉じる</button></section></details>`;
 document.body.append(host);
 const button=shadow.getElementById('apply'),status=shadow.getElementById('status'),undoButton=shadow.getElementById('undo');
 const say=text=>status.textContent=text;
 shadow.getElementById('close').onclick=()=>{shadow.querySelector('details').open=false;};
 button.onclick=async()=>{
  if(busy)return;busy=true;button.disabled=true;
  try{
   const view=currentView(),before=view.state.doc,{type,attr}=linkType(view.state.schema);
   const hits=collect(before),plan=[],skipped=[];let existing=0;
   for(const hit of hits){const s=rangeState(before,hit,type,attr);if(s==='add')plan.push(hit);else if(s==='existing')existing++;else skipped.push(hit.name);}
   if(!hits.length){say('本文に対象の名前が見つかりません。変更していません。');return;}
   const suffix=skipped.length?'\n別のリンク等がある'+skipped.length+'か所は変更していません。':'';
   if(!plan.length){say('編集データに正しいリンクが'+existing+'か所あります。追加は不要です。'+suffix);return;}
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
   say('編集データで'+plan.length+'か所の追加リンクを確認しました。既存'+existing+'か所は保持。\n下書き保存後、プレビューで名前から記事へ飛べるか確認してください。'+suffix);
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
   undo=null;undoButton.hidden=true;say('今回追加したリンクだけを戻しました。');
  }catch(error){say(error.message);}
 };
}
if(document.body)mount();else document.addEventListener('DOMContentLoaded',mount,{once:true});
})();
