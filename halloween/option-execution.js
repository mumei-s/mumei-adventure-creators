import {mediumExecution} from './medium-execution.js?v=28.4.6';
import {artworkBasisContract} from './artwork-basis.js?v=28.4.6';
import {formatExecution} from './format-execution.js?v=28.4.6';
import {colorPolicy} from './color-policy.js?v=28.4.6';
import {photoReconstruction} from './photo-design.js?v=28.4.6';
import {luminousWorldContract} from './luminous-world.js?v=28.4.6';

// The option's own physical recipe is the source of its execution contract.
// No generic "beautiful / atmospheric" default replaces a missing preset.
const regions={
 angle:'カメラの高さ・方向・傾き・画角・主題と景物の投影',
 medium:'主画像全域の輪郭・色面・影・素材境界',
 design:'完成作品全体の主画像領域・文字領域・余白・読み順',
 costume:'主役の外形・衣服の重なり・留め具・道具との接点',
 theme:'選んだ世界の環境・素材・空間と、出来事の対象・変化・痕跡',
 place:'その世界にある舞台の構造・近景と遠景の接続・支持面',
 mood:'眉・眼瞼・頬・口角・鼻と耳の投影・首との接続',
 pose:'肩から手首・骨盤から足先・接触点・重心と支持面',
 palette:'大きな主色面・隣り合う副色面・小さな焦点・最明暗部',
 type:'確定原稿の文字列・印字量・階層・字組み',
 line:'許可されたセリフの全文・句読点・改行順',
 size:'画面外周・縦横比・用途ごとの内側余白'
};
const counts={angle:3,costume:3,theme:2,place:3,mood:5,pose:3,type:2,line:2,size:2};

export function executionFor(key,value,recipe,{noPerson=false,values={}}={}){
 const sections=recipe.sections.map(s=>({part:s.label,draw:s.text}));
 const luminous=key==='medium'?luminousWorldContract({...values,medium:value},{noPerson}):null;
 let method=luminous?recipe.executionMethod||luminous.method:key==='medium'?recipe.executionMethod||mediumExecution.get(value)
  :key==='design'?recipe.executionMethod||formatExecution.get(value)
  :recipe.executionMethod||sections.slice(0,counts[key]||2).map(s=>s.draw).join(' ');
 if(recipe.known&&!method)throw new Error('個別の実行指示がありません：'+key+' / '+value);
 if(!method)method=sections.map(s=>s.draw).join(' ');
 // The literal medium rows sometimes describe a person. Scenery-only recipes
 // already contain the medium's dedicated non-human construction instructions.
 // Starting the actual image call with a face directive would otherwise defeat
 // the user's no-person choice before that choice is even read.
 if(key==='medium'&&noPerson&&!luminous&&!recipe.executionMethod)method=sections.filter(s=>s.part!=='日本を基準にした個別条件'&&!s.part.startsWith('作画基準／')).slice(0,4).map(s=>s.draw).join(' ');
 if(key==='medium'){
  const basis=artworkBasisContract(value,{noPerson,values});
  if(basis)method=basis.method+' '+method;
  const photo=photoReconstruction(value,{noPerson,values});
  method+=' Apply this selected making process consistently to '+(noPerson?'the scenery, objects, materials and background.':photo?'the face, hair, body, clothing and background. Preserve identifying features while reconstructing an illustrated reference as physically plausible photographed anatomy and materials; do not retain its outlines, cel shading or painted surface.':'the face, hair, body, clothing and background. Preserve reference identity as recognizable features translated into this medium; redraw rather than retain a photographic face or surface from the reference.');
  if(photo)method+=' '+photo.sections.map(section=>section.text).join(' ');
  const policy=colorPolicy(values);
  if(policy.restricted)method+=' Use only '+policy.allowed+'. Translate every material color, optical band and reflection into values within those permitted colors. '+(photo?'Preserve the photographic technique through real material structure, optical focus, continuous exposure tones and coherent lighting.':'Preserve the technique through its line, layering, boundary and depth structure.');
 }
 method+=' '+sections.filter(s=>s.part==='日本を基準にした個別条件').map(s=>s.draw).join(' ');
 const inactive=noPerson&&['mood','pose'].includes(key);
 let region=regions[key]||'自由指定の対象領域';
 if(noPerson){
  if(key==='costume')region='選択した景物・物体・図案の外形・接続・支持';
  if(key==='mood')region='既存の景物・物体・図案の間隔・余白・明暗';
  if(key==='pose')region='実在する物体の接地・重力・支持。人体動作は非適用';
 }
 const evidence=recipe.checks.map(required=>({region,required}));
 return {selected:value,
  applicability:inactive?'人物条件は非適用。景物の形を変形せず、その個別レシピ内の自然な配置だけを実行する。':'適用',
  method,
  evidence,
  reject:evidence.map(e=>'領域「'+e.region+'」で要求「'+e.required+'」が満たされない場合、この選択は未達成。'),
  source:recipe.known?'individual-preset':'custom-input'};
}
