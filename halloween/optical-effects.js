import {colorPolicy} from './color-policy.js?v=18';

// A color theme controls the base image. Dispersion is part of the selected
// optical medium; only an explicitly limited palette removes spectral hues.
export function opticalColors(values={}) {
 const policy=colorPolicy(values);
 const optical=['クリスタル透光アニメ','宝石ホログラムアニメ','クリスタルホログラム造形アニメ','漆と螺鈿'].includes(values.medium);
 return { ...policy,optical,spectral:optical&&!policy.restricted,
  instruction:!optical?'':policy.restricted
   ?'限定配色を保ち、屈折による輪郭のずれ、内部反射、透過の濃度差を許可色の明暗で描く。虹色は描かず、色数を制限した光学表現として扱う。'
   :'基調・衣装・背景は選択配色を保つ。分散と薄膜干渉の領域にはシアン・菫・マゼンタ・淡金のスペクトル色を使い、角度で色が変わる帯を描く。光学色はその領域だけに使い、髪・瞳の固有色や画面全体を塗り替えない。'};
}

export function opticalSignature(values={}, {noPerson=false}={}) {
 const color=opticalColors(values);
 if(values.medium==='クリスタルホログラム造形アニメ')return ['広い透明結晶面の厚み・背後の輪郭の屈折ずれ・暗い二重内部反射・面の角度に沿う虹色干渉帯・鋭い光と深い影。光粒だけでは成立しない。',color.instruction];
 if(values.medium==='クリスタル透光アニメ')return [
  '縮小しても読める結晶的な透光：主題に沿った透明な色層の重なり、面の境界で曲がる光帯と背後の輪郭の屈折、内部の二重反射、鋭い白光と隣接する深い有彩色の影。宝飾の小さな点光だけでは成立しない。',
  noPerson?'景物の広い面とその周囲の空間を澄んだプリズムの色層でつなぐ。主景の構造と外形は保つ。':'髪束・衣装の外周から周囲へ連続する広いプリズムの光帯を描き、顔の識別点を避けて透明な色層を重ねる。主役の外形と衣装の被覆は保つ。',
  color.instruction
 ];
 if(values.medium==='宝石ホログラムアニメ')return [
  '縮小しても読めるホログラム：主題の前後へ離れた2層以上の半透明投影面、背後の輪郭が通り抜ける濃度差、角度で切り替わる干渉色の帯、位置がずれた二重像、投影面の中だけで途切れる走査線。宝石の小物や通常の逆光だけでは成立しない。',
  '投影面は主題の外形に沿って主図版の広い領域へ連続させ、手前・奥・重なりを見分けられる大きさにする。光の層はこの画風の必須要素であり、未選択の持ち物として消さない。',
  color.instruction
 ];
 return [];
}
