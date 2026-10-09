// These are structural limits, not a rating of how two visual styles look.
// Simple names, headlines and writing directions remain independent choices.
// A rich preset that explicitly promises another publication structure cannot
// be squeezed into the chosen format or silently rewritten as different copy.
import {designLayoutFor} from './layout-preview-specs.js?v=28.4.6';

const magazineCovers=Object.freeze(['週刊誌の表紙','ファッション雑誌の表紙','カルチャー誌の表紙','ゴシック雑誌の表紙','文芸誌の表紙','ZINEの表紙']);
const informationLayouts=Object.freeze(['広告ビジュアル','スイス式グリッドポスター','音楽フェスポスター','ゲームのパッケージ']);
export const structuredCopyRules=Object.freeze([
 Object.freeze({type:'雑誌風・見出しと特集をたっぷり',designs:magazineCovers,structure:'左右の特集見出し4組',suggestion:'雑誌の表紙を選ぶか、文字を「短いタイトル＋名前」などへ変えてください。'}),
 Object.freeze({type:'広告チラシ風・情報をたっぷり',designs:informationLayouts,structure:'広告の見出しと本文3組を横3列',suggestion:'「広告ビジュアル」などを選ぶか、そのデザイン向けの文字へ変えてください。'}),
 Object.freeze({type:'新聞風・記事と段組み',designs:Object.freeze(['新聞の一面']),structure:'本文3件と副記事2組の新聞段組み',suggestion:'「新聞の一面」を選ぶか、文字を「短いタイトル＋名前」などへ変えてください。'}),
 Object.freeze({type:'映画ポスター風・タイトルとクレジット',designs:Object.freeze(['映画ポスター','舞台ポスター']),structure:'下部の大きな題名と最下端の制作クレジット3行',suggestion:'「映画ポスター」か「舞台ポスター」を選ぶか、文字を短い見出しなどへ変えてください。'})
]);
const byType=new Map(structuredCopyRules.map(rule=>[rule.type,rule]));
export const shortCopyDesigns=Object.freeze(['写真集の表紙','絵本の表紙','音楽アルバムジャケット','レトロ旅行ポスター','アイコン・肖像','スマホ壁紙','ステッカー','切手','ポストカード','紋章・エンブレム','図案・パターン','通常の一枚絵','キャラクターのキービジュアル','幻想風景画','自然・都市の風景画','映画のワンシーン','物語の挿絵','絵巻物','屏風絵','掛け軸','noteサムネイル']);
const shortFormats=new Set(shortCopyDesigns);
export const longCopyTypes=Object.freeze(['雑誌風・見出しと特集をたっぷり','広告チラシ風・情報をたっぷり','新聞風・記事と段組み','映画ポスター風・タイトルとクレジット','物語の装丁風・タイトルと紹介','商品広告・キャッチと特徴3点','イベント告知・見どころと案内','展覧会告知・作品名と制作ノート','映画予告・キャッチとあらすじ','キャラクター名鑑・役柄とスキル','ゲーム告知・世界紹介とクエスト']);
const longManuscripts=new Set(longCopyTypes);

export function layoutCopyConflicts(values={}){
 const {design,type}=values;
 // Unknown custom text/layout specifications need review, not guessed bans.
 if(!designLayoutFor(design)||!type||type==='おまかせ'||type==='デザインに合わせて自動編集')return [];
 const rule=byType.get(type);
 if(rule&&!rule.designs.includes(design)){
  const newspaper=design==='新聞の一面';
  return [{code:'layout-copy-structure-conflict',keys:['design','type'],reason:newspaper?
   '「新聞の一面」と「'+type+'」の配置は両立しません。新聞の記事と段組み、短い見出し、文字なしなどを選んでください。':
   '「'+design+'」に、'+rule.structure+'は配置できません。'+rule.suggestion,
   compatibleDesigns:[...rule.designs],compatibleTypes:newspaper?['新聞風・記事と段組み','短いタイトル＋名前','文字を一切入れない']:['短いタイトル＋名前','文字を一切入れない']}];
 }
 if(shortFormats.has(design)&&longManuscripts.has(type))return [{code:'long-copy-in-short-copy-design',keys:['design','type'],reason:'「'+design+'」は短い文字向けです。「'+type+'」の本文や複数の情報欄は収まりません。短い見出し・名前・文字なしを選ぶか、本文のある誌面へ変えてください。',compatibleTypes:['短いタイトル＋名前','クリエイター名だけ','文字を一切入れない']}];
 return [];
}
