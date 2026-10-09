import {canonicalSelectionLabel} from './legacy-selection-aliases.js?v=28.4.6';
// The names below describe independent physical requirements. Preview row
// coordinates are illustrative; only the axes actually named are fixed.
const angles=Object.create(null),moods=Object.create(null),poses=Object.create(null);
const register=(target,values,spec)=>{
 for(const value of values.split('|')){
  if(target[value])throw new Error('Duplicate view constraint: '+value);
  target[value]=Object.freeze({value,...spec});
 }
};
const angle=(value,spec)=>register(angles,value,{kind:'position',axes:{},cameraSide:null,cameraFacing:null,frame:'body',...spec});
angle('目線の高さ・正面',{axes:{pitch:0,yaw:0},cameraSide:'level',cameraFacing:'front'});
angle('斜め前45度',{axes:{yaw:45},cameraFacing:'front'});
angle('真横90度',{axes:{yaw:90},cameraFacing:'side'});
angle('背面から見る',{cameraFacing:'rear'});
angle('背面斜め45度',{axes:{yaw:135},cameraFacing:'rear'});
angle('肩越しの視点',{cameraFacing:'rear'});
for(const [value,pitch] of [['少し上から・15度',15],['ハイアングル・30度',30],['俯瞰・45度',45],['急な俯瞰・70度',70],['真上から・90度',90],['少し下から・15度',-15],['ローアングル・30度',-30],['煽り・45度',-45],['超ローアングル・70度',-70],['真下から・90度',-90]])
 angle(value,{axes:{pitch},cameraSide:pitch>0?'above':'below'});
angle('鳥の目・広い俯瞰',{cameraSide:'above',frame:'wide'});
angle('地面すれすれの視点',{cameraSide:'below',frame:'wide'});
angle('斜めに傾いた画面・15度',{kind:'roll',axes:{roll:15}});
angle('大胆な傾斜・30度',{kind:'roll',axes:{roll:30}});
for(const [value,frame] of [['顔のクローズアップ','face'],['目元の超接写','eyes'],['上半身の接写','upper'],['手元・動作の接写','hands'],['足元・接地の接写','feet']])angle(value,{kind:'crop',frame});
angle('全身・周囲も見せる',{kind:'frame'});
angle('遠景・世界を主役に',{kind:'frame',frame:'wide'});
for(const value of ['超広角の遠近','望遠・奥行きを圧縮','魚眼の曲面遠近'])angle(value,{kind:'lens'});
angle('主役に向き合う一人称',{kind:'subjective'});
for(const value of ['遮蔽物の隙間から','水平線を低く配置','水平線を高く配置','対角線で奥へ導く','鏡・水面越しの視点'])angle(value,{kind:'layout'});

register(moods,'毎回大胆に変える|おまかせ',{kind:'auto'});
register(moods,'静かで美しい|妖しく気高い|儚く切ない|温かく懐かしい|神秘的で透明感|寂しく詩的|優雅でクラシカル|強く挑発的|不敵な微笑み|いたずら好き|明るく祝祭的|可愛くコミカル|疾走する冒険|劇的な勝利|少しだけ不気味|ひやりとするホラー|圧倒的な恐怖・流血なし|奇妙でシュール|無表情の緊張感',{kind:'tone'});
register(moods,'歯を見せて大笑い|目を見開いて驚く|眉を寄せて怒る|涙を浮かべる|目を閉じて安らぐ|勝ち誇ってニヤリ|片目を閉じてウインク|牙を見せて威嚇|真剣な無表情',{kind:'expression',faceRequired:true});
register(moods,'正面・首をまっすぐ|正面＋満面の笑顔',{kind:'face',faceRequired:true,faceProjection:'front'});
register(moods,'完全な左横顔90度|左横顔＋静かな無表情',{kind:'face',faceRequired:true,faceProjection:'left-profile'});
register(moods,'完全な右横顔90度|右横顔＋大笑い',{kind:'face',faceRequired:true,faceProjection:'right-profile'});
register(moods,'真上からの俯瞰|俯瞰＋目を見開く',{kind:'camera',faceRequired:true,cameraSide:'above'});
register(moods,'真下からのローアングル|ローアングル＋威嚇',{kind:'camera',faceRequired:true,cameraSide:'below'});
register(moods,'背中から振り向く|背中から振り向く＋ニヤリ',{kind:'camera',faceRequired:true,cameraFacing:'rear'});
register(moods,'顔を上に向ける',{kind:'head',headDirection:'up'});
register(moods,'顔を下に向ける',{kind:'head',headDirection:'down'});

// Every pose is classified, including flexible actions whose torso direction
// is deliberately unspecified. A floor contact alone does not imply occlusion.
const pose=(values,spec)=>register(poses,values,{orientation:'flexible',support:'flexible',...spec});
pose('まっすぐ立つ|片足に体重を乗せる|背伸びをする|長い杖を地面につく',{orientation:'upright',support:'feet'});
pose('腰に手を当てる|腕を組む|両手を広げる|片手を高く掲げる',{});
pose('振り向く|振り向きながら走る',{cameraFacing:'rear'});
pose('膝をついて誓う|片膝をつく|両膝でひざまずく',{orientation:'upright',support:'knees'});
pose('椅子に腰掛ける|横向きに座る|椅子の背にもたれる|座って脚を組む|ベンチの端に腰掛ける|机に片肘をついて考える',{orientation:'seated',support:'seat',bodyOnSupport:true});
pose('床であぐらをかく|膝を抱えて座る|脚を伸ばして座る|片膝を立てて座る|正座する',{orientation:'seated',support:'floor',bodyOnSupport:true});
pose('低くしゃがむ|腰を落として構える|走り出す|着地する|身をひねって避ける',{orientation:'crouched',support:'feet'});
pose('四つん這いで進む',{orientation:'all-fours',support:'hands-knees'});
pose('仰向けに寝る',{orientation:'supine',support:'floor-or-bed',bodyOnSupport:true});
pose('横向きに寝る|ソファに横たわる',{orientation:'side-reclined',support:'floor-or-seat',bodyOnSupport:true});
pose('うつ伏せで頬杖をつく',{orientation:'prone',support:'floor',bodyOnSupport:true});
pose('両足でジャンプ|片膝を曲げて跳ぶ|空中で回転|浮遊する|障害物を跳び越える|跳びながら手を伸ばす',{support:'none'});
pose('ゆっくり歩く|大股で歩く|全力で走る|片手を差し出す|両手を差し出す|手を振る|頬に手を添える|口元に指を添える|本を読む|花束を抱える|カップを両手で持つ|楽器を演奏する|絵を描く|くるりと踊る|バレエのアラベスク|帽子のつばに手を添える|髪を耳にかける|人差し指で行き先を示す|両手でハートを作る|階段を一段上がる|小走りで駆け寄る|風に向かって踏み出す|流れる布を片手でつかむ|灯りを前に掲げる|カメラを構える|片手で扉を開く|剣を両手で構える|弓を引く',{});
pose('壁にもたれる',{support:'wall-feet'});
pose('両手を背中で組む',{handsBehind:true});
pose('傘を差す',{overheadOccluder:true});
pose('片手を床について着地する',{orientation:'crouched',support:'hand-foot'});

export const angleConstraintValues=Object.freeze(Object.keys(angles));
export const moodConstraintValues=Object.freeze(Object.keys(moods));
export const poseConstraintValues=Object.freeze(Object.keys(poses));
export const angleConstraint=value=>angles[value]||null;
export const moodConstraint=value=>moods[canonicalSelectionLabel('mood',value)]||null;
export const poseConstraint=value=>poses[value]||null;
export const automaticView=value=>!value||['おまかせ','毎回大胆に変える','場面に合わせたアングル'].includes(value);

const issue=(severity,code,keys,reason)=>({severity,code,keys,reason});
export function viewSelectionIssues(values={}){
 const result=[],a=angleConstraint(values.angle),m=moodConstraint(values.mood),p=poseConstraint(values.pose);
 if(/風景を主役|モチーフだけ|紋章・アイコン/.test(values.costume||''))return result;
 if(!a){
  if(!automaticView(values.angle))result.push(issue('warning','custom-angle-review',['angle'],'自由指定「'+values.angle+'」のカメラ位置は既知の視点として判定できません。選んだ顔向き・ポーズとの両立を制作前に確認してください。'));
  return result;
 }
 if(m?.cameraSide&&a.cameraSide&&m.cameraSide!==a.cameraSide)
  result.push(issue('error','opposed-camera-height',['mood','angle'],'「'+values.mood+'」は'+(m.cameraSide==='above'?'主題より上から見下ろす':'主題より下から見上げる')+'視点です。「'+values.angle+'」の'+(a.cameraSide==='level'?'水平な視点':a.cameraSide==='above'?'上から見下ろす視点':'下から見上げる視点')+'とは同じカメラで両立しません。視点を含まない表情か、同じ方向のアングルを選んでください。'));
 for(const [key,spec] of [['mood',m],['pose',p]])if(spec?.cameraFacing==='rear'&&['front','side'].includes(a.cameraFacing))
  result.push(issue('error','opposed-camera-facing',['angle',key],'「'+values[key]+'」はカメラ側へ背中を向ける指定です。「'+values.angle+'」は主題の'+(a.cameraFacing==='side'?'側面90度':'正面側')+'から見るため、同じ胴体の投影では両立しません。背面のアングルか、背中向きを含まない'+(key==='mood'?'表情':'ポーズ')+'を選んでください。'));
 if(m?.faceRequired){
  if(['hands','feet'].includes(a.frame))result.push(issue('warning','face-outside-crop',['mood','angle'],'「'+values.angle+'」では顔が画角外になり、「'+values.mood+'」を画像で確認できない場合があります。表情を見せたい場合は顔や上半身が入る画角を選んでください。'));
  else if(a.frame==='wide')result.push(issue('warning','face-small-in-wide-view',['mood','angle'],'「'+values.angle+'」では人物が小さくなり、「'+values.mood+'」の細部を読み取りにくくなります。世界の広がりを保ったまま表情が見える大きさを確認してください。'));
  if(a.cameraFacing==='rear'&&m.cameraFacing!=='rear')result.push(issue('warning','face-from-rear',['mood','angle','pose'],'背面のカメラから「'+values.mood+'」を見せるには、胸郭と首の自然な回転が必要です。顔の見えない部分を描き足したり、首だけを無理に回したりせず、選択ポーズとの両立を確認してください。'));
  if((a.axes.pitch||0)>=70&&p&&p.orientation!=='supine'&&p.support!=='none')result.push(issue('warning','face-from-steep-overhead',['mood','angle','pose'],'「'+values.angle+'」と「'+values.pose+'」では頭頂や背中が中心になり、「'+values.mood+'」の顔の面が隠れたり強く短縮されたりします。ポーズ・カメラを変えずに見える範囲を確認してください。'));
 }
 if(a.axes.pitch===-90&&p?.bodyOnSupport)result.push(issue('warning','support-occludes-bottom-view',['angle','pose'],'「'+values.pose+'」の床・座面・寝台が真下からの視線を遮る場合があります。支持面を透かしたり浮遊へ変更したりせず、同じポーズと真下90度で実際に見える範囲を確認してください。'));
 if((a.axes.pitch||0)>=70&&p?.overheadOccluder)result.push(issue('warning','umbrella-occludes-overhead',['angle','pose'],'頭上の傘が上からの視線を遮り、顔や身体が隠れる場合があります。傘を透明にしたり位置を変えたりせず、選択した視点での遮蔽を確認してください。'));
 if(['face','eyes','upper','hands','feet'].includes(a.frame)&&p)result.push(issue('warning','pose-outside-crop',['angle','pose'],'「'+values.angle+'」では「'+values.pose+'」の身体全体や支持点が画角外になります。動作は保たれますが、画像で確認できるのは接写に入る部分だけです。全体を見せたい場合は全身の画角を選んでください。'));
 if(a.frame==='eyes'&&m?.faceRequired&&!['目を見開いて驚く','眉を寄せて怒る','涙を浮かべる','目を閉じて安らぐ','片目を閉じてウインク'].includes(values.mood))result.push(issue('warning','expression-outside-eye-crop',['mood','angle'],'目元だけの超接写では、口・顎・横顔の輪郭を使う「'+values.mood+'」を全て見せられません。目元に見える特徴と、画角外になる特徴を確認してください。'));
 if(p?.handsBehind&&(a.cameraFacing==='front'||a.frame==='hands'))result.push(issue('warning','hands-behind-body',['pose','angle'],'背中で組んだ手は身体の後ろに隠れる場合があります。手を見せるために前へ移さず、同じポーズから見える輪郭を確認してください。'));
 for(const key of ['mood','pose'])if(!automaticView(values[key])&&!(key==='mood'?m:p))result.push(issue('warning','custom-'+key+'-review',[key,'angle'],'自由指定「'+values[key]+'」は既知の身体・視点条件として判定できません。「'+values.angle+'」との両立を制作前に確認してください。'));
 return result;
}
