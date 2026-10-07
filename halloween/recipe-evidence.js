import {proofsForRecipe} from './visual-proofs.js?v=24.0.0';
import {editorialReferencesFor} from './editorial-reference-sources.js?v=24.0.0';
// Consulted primary materials; association means structural/technical research,
// never visual validation of a generated image or full reproduction of an object.
const technicalSources={
 photo:{publisher:'Nikon',title:'Understanding Focal Length',url:'https://www.nikonusa.com/learn-and-explore/c/tips-and-techniques/understanding-focal-length?generate=pdf',scope:'画角・被写体の大きさ・焦点距離と被写界深度。レシピ内のmm値は創作時の設計値で、実機の撮影証拠ではない。'},
 watercolor:{publisher:'Winsor & Newton',title:'Professional Watercolour / Transparent Orange',url:'https://www.winsornewton.com/products/professional-watercolour-transparent-orange',scope:'メーカーが説明する薄塗りと紙の白からの反射。人物や作品の構図は採用しない。'},
 woodcut:{publisher:'The Metropolitan Museum of Art',title:'Woodcut / Materials and Techniques',url:'https://www.metmuseum.org/perspectives/materials-and-techniques-printmaking-woodcut',scope:'実物の木版・工具・刷りと、凸部が印刷され凹部が白く残る構造。'},
 holography:{publisher:'Byung Gyu Chae / arXiv',title:'Wide viewing-angle holographic display based on enhanced-NA Fresnel hologram',url:'https://arxiv.org/abs/2004.12543',scope:'実際の光学ホログラムは再生光と視域を伴う。アニメの半透明層や走査線は創作表現で、光学的な同等性の証明ではない。'}
};
export function sourcesForRecipe(key,value){
 if(key==='design')return editorialReferencesFor(value);
 if(key!=='medium')return [];
 if(/^実写風/.test(value))return [technicalSources.photo];
 if(['透明水彩','透明水彩アニメ'].includes(value))return [technicalSources.watercolor];
 if(['木版画','浮世絵木版画'].includes(value))return [technicalSources.woodcut];
 if(value==='宝石ホログラムアニメ')return [technicalSources.holography];
 return [];
}
export function verificationFor(key,value){
 const sources=sourcesForRecipe(key,value),proofs=proofsForRecipe(key,value);
 return {instruction:'defined',image:proofs.length?'sample-reviewed':'unreviewed',realWorld:sources.length?'research-only':'unreviewed',sources,proofs};
}

export function appendRecipeEvidence(container,key,value,{known=true}={}){
 const evidence=verificationFor(key,value);
 const p=document.createElement('p');p.className='recipe-evidence';
 p.textContent=(known?'制作条件：定義済み':'制作条件：自由入力')+' / 生成画像：'+(evidence.proofs.length?'一例の試験あり（全組合せは未検証）':'未検証')+' / 実物資料：'+(evidence.sources.length?'技法・構造の資料あり（一致の保証ではありません）':'未照合');container.append(p);
 for(const source of evidence.sources){const row=document.createElement('p'),a=document.createElement('a');a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=source.publisher+' / '+source.title;row.append(a,document.createTextNode(' — '+(source.scope||'')));container.append(row);}
 for(const proof of evidence.proofs){const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='実際の生成試験を見る（'+proof.date+'）';details.append(summary);let loaded=false;details.addEventListener('toggle',()=>{if(!details.open||loaded)return;loaded=true;const img=document.createElement('img');img.src=proof.image;img.alt=proof.medium+'の海岸の生成試験';img.loading='lazy';img.style.maxWidth='100%';img.style.height='auto';const info=document.createElement('p');info.textContent=proof.width+'×'+proof.height+' px / '+Math.round(proof.seconds)+'秒（この試験の実測） / '+proof.observed;const limits=document.createElement('p');limits.textContent=proof.limits;details.append(img,info,limits);});container.append(details);}
 return evidence;
}
