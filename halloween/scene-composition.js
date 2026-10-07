import {sceneContract} from './worlds.js?v=28.1.0';

// Resolve the selected subject and place as one scene before the individual
// recipes add detail. World-bearing stories change the environment of that
// place; they are not reduced to a detached prop or a second picture.
export function sceneComposition(plan){
 const values=plan.values;
 const emblem=values.costume==='紋章・アイコンにする';
 const motif=values.costume==='モチーフだけで構成する';
 const abstract=/墨の余白|金箔の空間|抽象的な色面/.test(values.place);
 const planar=emblem||motif||abstract;
 const cosmic=/宇宙|星海|星雲/.test(values.theme+' '+values.place);
 const candy=values.theme==='お菓子の王国';
 return [
  values.sceneUnified?'【選んだ世界観・シーン】':'【物語・世界観・舞台を一つの場面へ】',
  ...(values.sceneUnified?['選択は「'+values.theme+'」の一場面。物語・世界・テーマ・場所を独立した四つの設定に分けず、このシーンの中で出来事・空間・主役への光を決める。作風は別途選んだ描線・画材で、この世界そのものを変更しない。']:[]),
  '完成場面：「'+values.place+'」で「'+values.theme+'」が成立している一瞬。'+(plan.noPerson?'主役は選択した景物・物体・図案。':'主役は参照の同じキャラクター、衣装は「'+values.costume+'」、身体の動作は「'+values.pose+'」。')+'項目ごとに別の絵や背景を作らず、出来事の対象と舞台、主役を同じ配置・画風・配色へ結ぶ。',
  '物語名に含まれる世界の性質・素材・光・時間も、この舞台の環境に統合する。単に小物を一つ置いてテーマを代用せず、舞台の識別構造を残したまま場面全体で意味が読めるようにする。別背景の禁止は画像の分割・無関係な場所の追加を防ぐ条件であり、選んだ世界観を消す条件ではない。',
  ...(cosmic?[planar?'選択された宇宙の世界観を主画像から削除しない。宇宙の広がりと舞台の識別形を、同じ図案内の大小・重なり・抜き・選択技法の明暗で結ぶ。星雲や星の間隔を少数の形と余白へ整理し、未選択の地平線・窓・建物・写実的な別景観を追加しない。':'選択された宇宙の世界観を主画像から削除しない。舞台の地形・建築・支持面を保ち、その空・開口部・奥行きへ星雲と遠い星の広がりを連続させる。宇宙光を主役と舞台の同じ面へ返し、宇宙を小さな飾り・窓内の別絵・別枠だけに閉じ込めない。']:[]),
  ...(candy?[planar?'お菓子の王国は、舞台の識別形と菓子の素材・輪郭を一つの図案で結ぶ。菓子を別枠へ並べず、重なりと抜きで主題を作る。':'お菓子の王国は、選んだ舞台の建築・地形・道具の形を保ちながら、飴の透過、焼菓子の層、砂糖の粒などの素材へ置き換えた一つの場所として描く。菓子の小物を添えるだけで終えず、主役の支持面と周囲にも同じ素材と光をつなぐ。']:[]),
  ...sceneContract(values,{collection:plan.collection,noPerson:plan.noPerson}).filter(line=>!cosmic||!line.startsWith('選択された宇宙の世界観')),
  planar?'空間は選択した図案・背景面の大小、重なり、輪郭、抜き、余白で統合する。物語のために未選択の写実的な景観や人体を追加しない。':'選択作風が平面・墨・版画なら、この一場面の前後関係をその技法の面・線・余白へ翻訳する。世界観の保持のために写真や3Dへ変える必要はない。'
 ];
}
