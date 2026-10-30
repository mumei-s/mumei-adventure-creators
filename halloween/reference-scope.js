// Normalize only phrases emitted by the existing compilers. User selections
// and free input are protected byte-for-byte; this is not an NLP classifier.
const noPerson=values=>/風景を主役|モチーフだけ|紋章・アイコン/.test(values.costume||'');
const strings=(value,out=[])=>{if(typeof value==='string')out.push(value);else if(Array.isArray(value))value.forEach(item=>strings(item,out));else if(value&&typeof value==='object')Object.values(value).forEach(item=>strings(item,out));return out;};
const replacements=[
 ['顔立ち、髪型、年齢感・性別表現・体格・識別の唯一の基準','今回参照すると指定した顔立ち・識別特徴の基準'],
 ['顔の輪郭・目鼻口と眉顎鼻首の特徴的な組合せ・髪型・識別色・固有の印・元々ある髭・民族的特徴・年齢感・性別表現・基礎体格を保つ','顔の輪郭・目鼻口と眉顎鼻首の特徴的な組合せと、今回固定指定した外見だけを保つ'],
 ['輪郭・目鼻口・髪型・年齢感・性別表現・体格・頭身を保つ','輪郭・目鼻口と今回固定指定した外見・頭身だけを保つ'],
 ['顔の輪郭、眉・目鼻口・顎・首の特徴の組合せ、髪型、元々ある髭、識別色、年齢感・性別表現・基礎体格を同じ人物として保ち','顔の輪郭、眉・目鼻口・顎・首の特徴の組合せと今回固定指定した外見だけを同じ人物として保ち'],
 ['髪型・顔の輪郭・目鼻口の特徴的な並び・年齢感・性別表現の組合せを読み取り','顔の輪郭・目鼻口の特徴的な並びと今回参照すると指定した特徴の組合せを読み取り'],
 ['髪型・識別色・固有の印と明示された非人間の形は保持し','今回固定指定した識別色・固有の印と明示された非人間の形は保持し'],
 ['頭髪の識別形は保ち','頭髪の形は今回の指定に従い'],
 ['実際の髪型と髪瞳の基礎色','今回固定指定した外見'],
 ['本人の輪郭・眉目鼻口の組合せ・髪・年齢感・性別表現・体格・頭身を','本人の輪郭・眉目鼻口の組合せと今回固定指定した外見・頭身を'],
 ['本人の識別特徴・実際の髪型','本人の識別特徴・今回固定指定した外見'],
 ['と髪瞳の基礎色','と今回固定指定した色'],
 ['自然な髪・瞳・固有の印の識別色を保つ','今回固定指定した瞳・固有の印の識別色だけを保ち、髪色は今回の指定に従う'],
 ['自然な髪・瞳などの識別色を保持する','今回固定指定した識別色だけを保持し、髪色は今回の指定に従う'],
 ['髪・瞳・固有の印の識別色を保つ','今回固定指定した識別色だけを保ち、髪色は今回の指定に従う'],
 ['主参照の自然な髪・瞳・固有の印の色を保つ','主参照の今回固定指定した色だけを保ち、髪色は今回の指定に従う'],
 ['参照の識別色を保ち','今回固定指定した参照の識別色だけを保ち'],
 ['主参照の髪・肌・瞳の基礎色は識別のために残し','主参照の今回固定指定した基礎色だけを残し'],
 ['髪・肌・瞳の識別に必要な基礎色を保ち','今回固定指定した識別に必要な基礎色だけを保ち'],
 ['参照の識別色を反射で別の色へ変えない','今回固定指定した参照の色だけは反射で別の色へ変えない'],
 ['主参照の顔立ち・目鼻口・髪・固有の印の特徴的な組合せで','主参照の顔立ち・目鼻口と今回固定指定した固有の特徴の組合せで'],
 ['識別特徴・髪型・固有の印・元の年齢感・性別表現・基礎体格と基本頭身を読み取り','識別特徴と今回固定指定した外見・基本頭身を読み取り'],
 ['衣装の被覆、閉眼、髪なし、自然な遮蔽を守り','衣装の被覆、閉眼、今回固定指定した髪の有無、自然な遮蔽を守り'],
 ['髪なしは髪なし','髪の有無は今回の指定どおり'],
 ['閉眼・髪なし・元々ある髭','閉眼・今回固定指定した髪の有無・元々ある髭'],
 ['閉眼・髪なし・被覆・遮蔽','閉眼・今回固定指定した髪の有無・被覆・遮蔽'],
 ['髪がない主参照へ髪を足さない','髪の有無も今回の指定に従う'],
 ['髪を足さない','固定指定された髪の有無を変えない'],
 ['hairline and actual hairstyle, ',''],
 ['actual hair/beard','actual beard and explicitly fixed hair'],
 ['new hair or new beard','unrequested hair changes or new beard'],
 ['absent hair and chibi proportions','explicitly fixed hair absence and chibi proportions'],
 ['natural identifying hair, iris and mark colors','explicitly fixed identifying colors'],
 ['自然な肌・髪・瞳などの識別色','今回指定した肌・髪・瞳などの色']
];

export function applyUserReferenceScope(prompt,values={}, {contract}={}){
 if(typeof prompt!=='string'||noPerson(values))return prompt;
 // Do not protect a stored generated prompt from the optional contract.
 const policy=contract?.constraints||{},protectedValues=[...strings(values),...strings(policy),...strings(contract?.freeInput)].filter(text=>text.length>1);
 const tokens=[];let text=prompt;
 for(const literal of [...new Set(protectedValues)].sort((a,b)=>b.length-a.length)){
  if(!text.includes(literal))continue;
  const marker='\uE000SCOPE'+tokens.length+'\uE001';tokens.push([marker,literal]);text=text.split(literal).join(marker);
 }
 for(const [from,to]of replacements)text=text.split(from).join(to);
 for(const [marker,literal]of tokens.reverse())text=text.split(marker).join(literal);
 const rule='【今回の参照範囲】顔・髪型・髪色・衣装などは今回の選択と自由入力を基準にする。主参照を選んだだけで、元画像の全属性を固定しない。髪型・髪色の固定は今回明示した場合だけ。変更可の属性は参照と異なっても誤りとしない。顔の特徴を参照する指定は、元の衣服・姿勢・背景を固定する指定ではない。';
 return text.includes(rule)?text:text+'\n'+rule;
}
