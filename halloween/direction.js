import {noPersonSelection,landscapeSelection} from './collection.js?v=28.3.1';
import {applyPose} from './poses.js?v=28.3.1';
import {resolveArtDirection} from './art-direction.js?v=28.3.1';
import {automaticView,angleConstraint,moodConstraint,poseConstraint} from './view-constraints.js?v=28.3.1';
export const shotPlans=[
 {family:'front-close',face:'正面0度。顔をまっすぐ起こし首の傾き0度',expression:'歯を見せた大きな笑顔、頬が上がり目尻が縮む',distance:'顔中心の真正面クローズアップ',pose:'両手で大きく帽子を掲げる。肩は水平',layout:'顔を画面中央上部に置き、下部に大胆な横組み文字',camera:'目線と同じ高さ、正面に水平なカメラ'},
 {family:'left-profile',face:'完全な左横顔90度。片方の目だけ見える。鑑賞者を見ない',expression:'眉を寄せ、唇を引き結ぶ明確な怒り',distance:'膝まで入る左側面のミディアムロング',pose:'横向きに歩く。両腕は後方へ流れ、体軸は前傾',layout:'左向きの横顔と移動を右下から左上へ対角線に配置',camera:'真横から水平に、主役と平行な視線'},
 {family:'right-profile',face:'完全な右横顔90度。片方の目だけ見える。首は傾けない',expression:'目を閉じて穏やかに息を吐く',distance:'横顔の鼻先から胸までのタイトな右側面',pose:'両手を胸元で組み、肘を下ろす',layout:'右端に主役、左側の広い余白に大きな縦の文字列',camera:'右真横の近距離、横顔のシルエット重視'},
 {family:'overhead',face:'頭上から顔を見下ろす。顔は上向き、首の左右傾き0度',expression:'目を大きく見開き、口が丸く開く驚き',distance:'頭頂と全身が見える極端な俯瞰',pose:'地面に座って上を見上げ、両手を広げる',layout:'上から見た円状の構造と小さな全身。放射状の視線誘導',camera:'真上に近い70〜85度の高いカメラ'},
 {family:'ground-low',face:'顎を上げ下方のカメラを睨む。顔は前向き、首はまっすぐ',expression:'目を細め、牙または歯を露わにする威嚇',distance:'靴から頭まで見える全身ロング',pose:'両足を踏ん張り、腕を大きく広げてマントを展開',layout:'低い地平線、巨大な全身シルエット、上方に大胆な文字',camera:'地面近くから見上げる極端なローアングル'},
 {family:'rear-turn',face:'背中から撮影し顔だけ左に振り返る。顎を肩に寄せない',expression:'片眉を上げ、口角を片方だけ上げる勝ち誇った笑み',distance:'後ろ姿の腰まで入るミディアム',pose:'背中は鑑賞者側へ向け、左手を肩より高く上げる',layout:'主役を左側、顔と逆側に横長の文字ブロックを重ねる',camera:'背中の高さから、顔への斜めの視線'},
 {family:'jump-wide',face:'顔は正面から右へ30度。首は垂直、顎を引く',expression:'口を開けて豪快に笑う。目は細くなる',distance:'人物が画面の高さの40%程度に収まる環境ロング',pose:'宙へ跳び上がり片膝を曲げる。両腕を上方へ伸ばす',layout:'遠い全身を右上に、左下に巨大な余白と文字',camera:'遠方から水平に、身体全体と動きを捉える'},
 {family:'crouch-low',face:'顔を下から左斜め前で捉える。顔は左へ45度、首は傾けない',expression:'片目を閉じた大きなウインク。口角を高く上げる',distance:'足先まで入る近い全身',pose:'低くしゃがみ、片手を地面につき、もう一方を後ろに伸ばす',layout:'三角形の全身構図。文字を上辺の帯に集める',camera:'低い位置から35度上を向く近いカメラ'},
 {family:'up-gaze',face:'顔を上へ40度向ける。目は空を見て、鑑賞者を見ない',expression:'涙を浮かべ、口を固く閉じた悲しみ',distance:'胸から上のミディアムクローズ',pose:'片手を真上へ伸ばし、体は右側へ反らせる',layout:'手から顔へ縦のライン、下部と左端に文字の小窓',camera:'横斜め前から見上げる'},
 {family:'down-gaze',face:'顔を下へ35度向ける。目は手元。首の左右傾き0度',expression:'唇を押さえた真剣な無表情。眉は水平',distance:'卓上と上半身まで入るミディアム',pose:'机へ両手を置いて、前を向いた体から顔だけ手元へ下げる',layout:'横長の机を前景とし、上下に情報の段を作る',camera:'正面から少し高い水平位置'},
 {family:'recline-wide',face:'顔は左へ20度、顎を持ち上げる。首は身体の軸と一直線',expression:'眉を上げ、口が半開きの不思議そうな表情',distance:'横たわる全身を含む横長ワイド',pose:'椅子に横たわり、片腕を額より上に広げる',layout:'身体を横方向の長い曲線にし、余白を上下で分ける',camera:'真横から全身と空間を捉える'},
 {family:'dynamic-run',face:'顔は右へ60度。顎は前。首の傾き0度',expression:'眉を寄せて口を大きく開けた叫び',distance:'走る全身を入れたミディアムロング',pose:'足を前後へ大きく開いて疾走。左腕を前、右腕を後ろへ',layout:'斜めの走るラインを中心に文字を大小の帯として配置',camera:'横斜め前から動きと平行に捉える'}
];
export const everydayShotPlans=shotPlans.map(plan=>({...plan,
 pose:{'front-close':'両手を自然に下ろし、肩を水平に保つ','left-profile':'歩幅に合わせて腕を自然に振り、横向きに歩く','ground-low':'両足を自然に接地し、衣服の裾を風に沿わせる','overhead':'椅子に腰掛けて顔を上げ、片手を軽く上げる','crouch-low':'片膝を曲げて低いものを眺め、もう一方の足で身体を支える','up-gaze':'姿勢をまっすぐ保ち、顔を上げて遠景を見る','dynamic-run':'左右の腕と脚を交互に動かし、地面を蹴って走る'}[plan.family]||plan.pose,
 expression:{'left-profile':'口元を緩めた穏やかな横顔','ground-low':'目を細め、歯を見せた堂々とした笑顔','overhead':'顔を上げ、自然な笑顔で見返す','up-gaze':'口を軽く閉じ、明るい空を静かに見つめる','dynamic-run':'前方へ集中した表情で息を吐く'}[plan.family]||plan.expression,
 layout:'主役と選択した場所の関係が読める配置。余白と情報量は選んだ形式に合わせる'
}));
const light=['硬い真昼の光と短い影','霧を透かす朝の逆光','夕日の側面光と長い影','赤い劇場照明と暗い奥行き','冷たい月光と暖かい蝋燭','白いスタジオの拡散光','単一スポットライトの深い明暗','街のネオンが濡れた床へ反射'];
const objects=['黒い羽根の仮面','朱色の封蝋の手紙','銀の小さな鈴','巨大な時計の針','真鍮の星図','ガラスの小瓶','黒いリボンの花束','錆びた鍵束','一冊の古書','空の肖像額'];
const backgrounds=['横に流れる薄い雲と開けた空間','一方向へ走る強い建築のパース','大きな一つの円と広い余白','平面の色面と明快なコントラスト','前景の大きなシルエットと遠い奥行き','細密な下部と静かな上部','左右で密度の異なる明暗','大きな縦の柱と水平の地平線'];
const spatial=['強い広角パース。手前の物体を大きく、奥の物体を小さくし、遠近の差を明確にする','前景・中景・遠景の三層。遮蔽と空気遠近法で空間を読み分ける','立体的な量感。光源に一貫した陰影、落ち影、接地、反射で体積を見せる','鑑賞者の近くに前景を置き、空間の中に立っているような臨場感を出す','大胆な俯瞰または見上げに合う消失点を揃え、厚みのある空間を構成する','浮遊感。宙の物と背景の距離を、位置・影・大きさの差で示す'];
const motion=['髪・布・煙を同じ風向きに流し、曲線の連なりで流動感を出す','動作の前後が想像できる重心と手足の配置。静止画の中に運動の続きを残す','顔と重要な文字を鮮明に保ち、背景や裾の限定的なブラーで速度を示す','奥から手前へ続く軌跡で迫る勢いを作る。過度な発光に頼らない','小道具と布の慣性を動作に合わせ、身体と環境の相互作用で臨場感を出す','静かな画風では、墨・線・空気・光の方向の流れで動きを示す'];
function sceneLight(values,collection){
 const context=(values.theme||'')+' '+(values.place||'');
 if(/宇宙|星海/.test(context))return /墨の余白|抽象|色面|金箔/.test(values.place||'')?['選んだ背景面と余白へ宇宙の明暗を翻訳し、別の空間を足さない']:['選択舞台へ続く宇宙の恒星光と、その場所にある灯り。景物と主役に同じ方向の光と反射を返す'];
 if(/朝の/.test(context))return ['朝の窓から入る柔らかな斜光。光源と影の方向を揃える','低い朝日が床と卓上を照らす。奥は穏やかな反射光','朝の薄曇りの拡散光。物の色と素材が自然に読める'];
 if(/雨|濡れ/.test(context))return ['雨雲からの拡散光と濡れた路面の反射','選択した街灯の光が濡れた床へ反射。映る位置を光源へ対応','曇り空の柔らかな光。近景の水滴と遠景の霞を描き分ける'];
 if(/星空|深夜|真夜中|月夜|月下|夜の|Halloween|ハロウィーン/.test(context))return ['夜の空と選択場面にある実際の灯り。発光する物だけが周囲を照らす','月光と窓や街灯の穏やかな補助光。暗部にも形を残す','夜の弱い環境光と局所の反射。空と景物の明度を分ける'];
 if(/スタジオ/.test(context))return ['大きな一つの面光源と自然な接地影','側面のソフトボックスと弱い反射光','選択背景の明度を保った柔らかなスタジオ光'];
 if(/キッチン|工房|アトリエ|読書室|骨董品店|映画館|改札/.test(context))return ['窓・天窓・室内灯の実在する光源に沿った室内光','一方向の柔らかな光が机や床へ自然な影を作る','室内の拡散光と壁からの弱い反射光'];
 return collection==='everyday'?['柔らかな自然光。空と地面からの反射を整える','雲間から差す一方向の自然光と実際の落ち影','薄曇りの光。遠景を大気で淡くし、近景の質感を保つ','昼の斜光と穏やかな影。地形・建物に同じ光源を適用']:light;
}
function sceneMotifs(values){
 const context=(values.theme||'')+' '+(values.place||'');
 if(/読書|図書館/.test(context))return ['開いた本としおり。ページ・手・読む視線を自然につなぐ','選択した本と机の道具だけ。読書に不要な持物を足さない'];
 if(/ものづくり|工房|アトリエ/.test(context))return ['制作に使う画材と未完成の作品を作業台へ配置','素材と道具の接触が読める作業中の一場面'];
 if(/再会|改札/.test(context))return ['再会した相手との視線と手の合図。場所に必要な物だけを置く','待ち合わせの目印を背景に置き、人物のやりとりを主役にする'];
 if(/朝の|喫茶店/.test(context))return ['カップや日用品を生活の場所へ自然に置く','実際の生活道具を必要な数だけ使い、手の動作と整合させる'];
 if(/ファッション/.test(context))return ['選択した衣服の素材と縫製、風による自然な皺を見せる','装いと街の色・素材の関係を見せる。無関係な持物は加えない'];
 return ['選択した世界と出来事を、舞台の景物と主役の関係で成立させる','世界の環境・素材・光をその場所へつなぐ。無関係な道具は加えない'];
}
const sceneryPlans=[
 {family:'scenery-layers',camera:'地面に立つ目線の高さから景観を見渡す',layout:'手前の景物・中景の主題・遠景を三層に配置する',distance:'景観の広さと奥行きを見渡せる全景'},
 {family:'scenery-path',camera:'場所にある道や地形に沿って奥へ視線を向ける',layout:'手前から奥へ続く地形・道・建物の線で主題へ導く',distance:'手前の質感と遠くの形の両方が読める環境ロング'},
 {family:'scenery-overlook',camera:'実際に立てる高台や建物から穏やかに見下ろす',layout:'選択景観の主題を中景へ広げ、近景の一部で高さを示す',distance:'地形・水域・街区のつながりを一望できる広景'},
 {family:'scenery-frame',camera:'選択した場所の前景の脇から景観へ視線を向ける',layout:'枝や建築など、その場に実在する前景で画面の一部を囲う',distance:'近い前景越しに中景と遠景が抜ける全景'},
 {family:'scenery-low-horizon',camera:'水平を保ち、選択した場所の地平や屋根の高さを捉える',layout:'景観の主題の高さに合わせて空と地面の面積を調整する',distance:'空・景物・地面の比率が読み取れるパノラマ'},
 {family:'scenery-detail-depth',camera:'場所を象徴する近景の素材の高さから奥を見渡す',layout:'手前の岩・植物・建材などを一つだけ大きくし、主題を奥へ置く',distance:'前景の具体的な質感から遠景へ連なる広い画角'}
];
// Concrete AUTO cameras have their own geometry. Facial rotation is not a
// torso-relative camera angle, and ranges must not be rounded to UI presets.
export const shotCameraConstraints=Object.freeze({
 'front-close':{cameraSide:'level',cameraFacing:'front',axes:{pitch:0,yaw:0}},
 'left-profile':{cameraSide:'level',cameraFacing:'side',axes:{pitch:0,yaw:90}},
 'right-profile':{cameraFacing:'side',axes:{yaw:90}},
 overhead:{cameraSide:'above',pitchRange:[70,85]},
 'ground-low':{cameraSide:'below'},
 'rear-turn':{cameraFacing:'rear'},
 'jump-wide':{cameraSide:'level',axes:{pitch:0}},
 'crouch-low':{cameraSide:'below',axes:{pitch:-35}},
 'up-gaze':{cameraSide:'below',cameraFacing:'front'},
 'down-gaze':{cameraSide:'above',cameraFacing:'front',axes:{yaw:0}},
 'recline-wide':{cameraFacing:'side',axes:{yaw:90}},
 'dynamic-run':{cameraFacing:'front'}
});
const autoExpressions=['歯を見せて大笑い','目を見開いて驚く','眉を寄せて怒る','涙を浮かべる','目を閉じて安らぐ','勝ち誇ってニヤリ','片目を閉じてウインク','歯を見せて威嚇','真剣な無表情'];
const lightDirections=[
 ['left-front','画面の左手前側から主光を受け、右奥側へ影をつなぐ'],
 ['right-front','画面の右手前側から主光を受け、左奥側へ影をつなぐ'],
 ['left-side','画面の左側から主光を受け、右側の面へ影を残す'],
 ['right-side','画面の右側から主光を受け、左側の面へ影を残す'],
 ['left-rear','画面の左奥側から主光を受け、左奥の縁を明部とし手前側へ影をつなぐ'],
 ['right-rear','画面の右奥側から主光を受け、右奥の縁を明部とし手前側へ影をつなぐ']
];
const pick=(list,random)=>list[Math.max(0,Math.min(list.length-1,Math.floor((Number(random())||0)*list.length)))];
const expressionKey=text=>/威嚇|牙/.test(text||'')?'threat':/ウインク|片目を閉じ/.test(text||'')?'wink':/目を閉じ|閉じた.*目/.test(text||'')?'closed':/涙|悲し/.test(text||'')?'tears':/怒|眉を寄せ|睨/.test(text||'')?'anger':/驚|目を.*見開|口を丸/.test(text||'')?'surprise':/ニヤリ|勝ち誇|片側.*笑み/.test(text||'')?'smirk':/無表情|真剣/.test(text||'')?'neutral':/大笑|豪快|歯を見せ|満面/.test(text||'')?'laugh':text||'';
function hashDirection(text){
 let a=2166136261,b=2246822507;
 for(let i=0;i<text.length;i++){const n=text.charCodeAt(i);a=Math.imul(a^n,16777619);b=Math.imul(b^n,3266489909);}
 return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');
}
function cameraFits(spec,values,control){
 if(!automaticView(values.angle))return true; // The explicitly selected angle owns these axes.
 const m=moodConstraint(control),p=poseConstraint(values.pose);
 if((p?.cameraFacing==='rear'||m?.cameraFacing==='rear')&&spec.cameraFacing!=='rear')return false;
 if(m?.cameraSide&&spec.cameraSide&&m.cameraSide!==spec.cameraSide)return false;
 return true;
}
function automaticCamera(source,viewPlan,control){
 const mood=moodConstraint(control),sourceSpec=shotCameraConstraints[source.family];
 if(!viewPlan||mood?.kind!=='camera')return {family:source.family,spec:sourceSpec,text:source.camera};
 const viewSpec=shotCameraConstraints[viewPlan.family];
 if(!mood.cameraSide)return {family:viewPlan.family,spec:viewSpec,text:viewPlan.camera};
 const axes={...(sourceSpec.axes?.yaw!==undefined?{yaw:sourceSpec.axes.yaw}:{}),...(viewSpec.axes?.pitch!==undefined?{pitch:viewSpec.axes.pitch}:{})};
 const spec={cameraSide:mood.cameraSide,...(sourceSpec.cameraFacing?{cameraFacing:sourceSpec.cameraFacing}:{}),...(Object.keys(axes).length?{axes}:{}),...(viewSpec.pitchRange?{pitchRange:viewSpec.pitchRange}:{})};
 const facing=spec.cameraFacing==='rear'?'背中側から':spec.cameraFacing==='side'?'側面側から':spec.cameraFacing==='front'?'正面側から':'主題へ';
 return {family:source.family,spec,text:facing+(mood.cameraSide==='above'?'見下ろす':'見上げる')+'同じカメラ。'+viewPlan.camera};
}
function meaningfulDirection(raw,values,collection){
 const posed=applyPose(raw,values.pose);
 return values.medium&&values.design?resolveArtDirection(values,posed,collection):posed;
}
function chooseDirection(bases,used,control,random,collection,values,{automaticExpression=false}={}){
 const previous=used.slice(-3),candidates=new Map();
 for(const base of bases)for(const [lightKey,lightDirection] of lightDirections){
  const raw={...base,signature:'pending',directionVariation:{lightKey,lightDirection,expressionKey:expressionKey(base.expression)},light:base.light+'。'+lightDirection+'。'};
  const actual=meaningfulDirection(raw,values,collection);
  const fields=['face','expression','distance','pose','camera','light','layout','background','depth','motion','motif'];
  const rendered=Object.fromEntries(fields.map(key=>[key,actual[key]||'']));
  const context=Object.fromEntries(['medium','theme','place','costume','design','palette','type','angle','mood'].map(key=>[key,values[key]||'']));
  const key=hashDirection(JSON.stringify({collection,context,rendered})),signature='direction28-'+collection+'-'+key;
  if(!candidates.has(key))candidates.set(key,{...raw,signature,directionSignature:key});
 }
 if(!candidates.size)throw new Error('表情「'+control+'」とポーズ「'+(values.pose||'おまかせ')+'」を同じカメラで実行できる自動演出がありません。アングルか、視点を含む表情・ポーズを確認してください。');
 const semanticKey=record=>record.directionSignature||record.signature?.match(/^direction28-[^-]+-([0-9a-f]{16})/)?.[1];
 let available=[...candidates.values()].filter(candidate=>!used.some(record=>semanticKey(record)===candidate.directionSignature));
 const reused=!available.length;
 if(reused){
  const recentKeys=new Set(previous.map(semanticKey)),fresh=[...candidates.values()].filter(candidate=>!recentKeys.has(candidate.directionSignature));
  available=fresh.length?fresh:[...candidates.values()].filter(candidate=>semanticKey(previous.at(-1)||{})!==candidate.directionSignature);
  if(!available.length)throw new Error('この固定条件で成立する演出が一つだけのため、直前と違う演出を選べません。おまかせにする項目を増やすか、表情・ポーズ・アングルのいずれかを変えてください。');
 }
 let eligible=available;
 if(automaticExpression){const recentExpressions=new Set(previous.map(record=>record.directionVariation?.expressionKey||expressionKey(record.expression)));const fresh=eligible.filter(candidate=>!recentExpressions.has(candidate.directionVariation.expressionKey));if(fresh.length)eligible=fresh;}
 const recentFamilies=new Set(previous.map(record=>record.family)),freshFamilies=eligible.filter(candidate=>!recentFamilies.has(candidate.family));if(freshFamilies.length)eligible=freshFamilies;
 const chosen=pick(eligible,random);
 const repeats=used.filter(record=>semanticKey(record)===chosen.directionSignature).length;
 return {...chosen,signature:chosen.signature+(reused?'-reuse-'+repeats:''),previous:previous.map(record=>({face:record.face,expression:record.expression,distance:record.distance,pose:record.pose,layout:record.layout,family:record.family,camera:record.camera})),randomization:{eligible:candidates.size,remaining:available.length,reused,...(reused?{reason:'この固定条件の候補を一巡したため、直近の実演出を避けて以前の候補から選びました。'}:{})}};
}
function buildSceneryDirection(used,control,random,collection,values){
 const landscape=values.costume==='風景を主役にする',emblem=values.costume==='紋章・アイコンにする';
 const pool=landscape?sceneryPlans:sceneryPlans.map((p,i)=>({...p,family:(emblem?'emblem-':'motif-')+i,camera:emblem?'図案全体を正面から読む視点':'選択した物の形と接地が分かる静物の視点',layout:emblem?'固有の輪郭と記号を独自の図案として整理する':'選択したモチーフの主従と素材、物同士の間隔を整理する',distance:emblem?'輪郭と余白を切らずに収める図案の全体':'主題の物と周囲の余白が読める静物の全体'}));
 const tone=['静かで美しい','儚く切ない','温かく懐かしい','神秘的で透明感','寂しく詩的','優雅でクラシカル','明るく祝祭的','奇妙でシュール'].includes(control)?control:'';
 const bases=pool.map(plan=>({...plan,noPerson:true,landscape,face:'',expression:'',pose:'',tone,light:sceneLight(values,collection)[0],motif:landscape?'選択した世界の環境・素材・光を、舞台の地形・建築・植生・水域へつなぐ':'選択された世界とモチーフを、固有の形・素材・余白で一つに構成する',background:landscape?'選択した世界にある一つの舞台を保ち、地形・建物・空の位置を一貫させる':'指定した背景と余白を維持し、主題の輪郭を読みやすくする',depth:emblem?'平面の図案として輪郭・重なり・余白を整理する':spatial[0],motion:'選択した天候による空気や反射を局所的に表す',locked:'人物の顔・表情・身体ポーズは適用せず、選択した主題の構図を変える'}));
 return chooseDirection(bases,used,control,random,collection,values);
}
export function buildDirection(used=[],control='毎回大胆に変える',random=Math.random,collection='halloween',values={}){
 if(noPersonSelection(values))return buildSceneryDirection(used,control,random,collection,values);
 const allPlans=collection==='everyday'?everydayShotPlans:shotPlans;
 const toneOptions=['静かで美しい','妖しく気高い','儚く切ない','温かく懐かしい','神秘的で透明感','寂しく詩的','優雅でクラシカル','強く挑発的','不敵な微笑み','いたずら好き','明るく祝祭的','可愛くコミカル','疾走する冒険','劇的な勝利','少しだけ不気味','ひやりとする怪談','圧倒的な恐怖・流血なし','奇妙でシュール','無表情の緊張感'];
 const tone=toneOptions.includes(control)?control:'';
 const toneExpressions={
 '静かで美しい':['目を閉じて安らぐ','口元を緩めた自然な笑顔','眉を水平に保ち静かに見つめる'],
 '妖しく気高い':['片眉を上げて不敵に微笑む','顎を高く保ち真剣に見つめる','目を細めた余裕のある笑顔'],
 '儚く切ない':['涙を浮かべて口を閉じる','唇を軽く噛み目元に悲しみ','眉を内側へ上げて遠くを見る'],
 '温かく懐かしい':['歯を見せた優しい笑顔','目を閉じて自然に微笑む','頬が上がる穏やかな笑顔'],
 '神秘的で透明感':['目を大きく開いた静かな好奇心','目を閉じた穏やかな表情','眉を水平に保つ澄んだ無表情'],
 '寂しく詩的':['涙を一粒浮かべた目','唇を引き結んだ悲しみ','目元を伏せて寂しさを表す'],
 '優雅でクラシカル':['歯を少し見せた品のある笑顔','目を閉じた落ち着いた表情','口角を静かに上げた微笑み'],
 '強く挑発的':['歯を見せて挑発的に笑う','眉を寄せ鋭く睨む','口角を片方だけ上げる'],
 '不敵な微笑み':['片眉を上げてニヤリと笑う','目を細め歯を見せて笑う','片目を閉じて大胆にウインク'],
 'いたずら好き':['口角を上げたいたずらな笑顔','片目を閉じた大きなウインク','歯を見せて楽しそうに笑う'],
 '明るく祝祭的':['口を大きく開けて大笑い','両目を輝かせ歯を見せて笑う','目を細めた満面の笑顔'],
 '可愛くコミカル':['口を丸く開いて驚く','頬を膨らませたコミカルな表情','歯を見せて豪快に笑う'],
 '疾走する冒険':['口を開いて叫ぶ決意','眉を寄せて真剣に見つめる','歯を見せた興奮の笑顔'],
 '劇的な勝利':['口を開けた喜びの笑顔','涙を浮かべて大きく笑う','片眉を上げ勝ち誇って笑う'],
 '少しだけ不気味':['唇を閉じてじっと見つめる','片側の口角だけが上がる笑顔','目を大きく開いた不自然な沈黙'],
 'ひやりとする怪談':['目を見開いて息を呑む','口が半開きの驚き','眉を寄せて緊張を表す'],
 '圧倒的な恐怖・流血なし':['目を見開き口を大きく開ける恐怖','涙を浮かべ眉を上げた恐怖','眉を寄せ歯を露わにした威嚇'],
 '奇妙でシュール':['目を見開き口を丸く開く','片眉だけ上げる不可解な表情','左右で異なる口角の奇妙な笑顔'],
 '無表情の緊張感':['眉を水平に保ち唇を引き結ぶ無表情','まばたきを忘れた真剣な目','口を閉じ緊張を含む無表情']};
 const selected=control!=='毎回大胆に変える'&&control!=='おまかせ'&&!tone;
 const keys={ '正面・首をまっすぐ':'front-close','完全な左横顔90度':'left-profile','完全な右横顔90度':'right-profile','真上からの俯瞰':'overhead','真下からのローアングル':'ground-low','背中から振り向く':'rear-turn','顔を上に向ける':'up-gaze','顔を下に向ける':'down-gaze'};
 const sets={'正面＋満面の笑顔':['front-close','歯を見せた満面の笑顔'],'左横顔＋静かな無表情':['left-profile','静かな無表情'],'右横顔＋大笑い':['right-profile','口を開けた大笑い'],'俯瞰＋目を見開く':['overhead','目を大きく見開く驚き'],'ローアングル＋威嚇':['ground-low','歯を露わにする威嚇'],'背中から振り向く＋ニヤリ':['rear-turn','勝ち誇った片側の笑み']};
 const fixedView=keys[control]||sets[control]?.[0];
 const viewPlan=fixedView?allPlans.find(p=>p.family===fixedView):null;
 const daily=collection==='everyday',fantasy=/浮遊|空中都市|星.*集める|妖精|精霊|異世界/.test([values.theme,values.costume,values.place,values.pose].join(' '));
 const lights=sceneLight(values,collection),motifs=daily?sceneMotifs(values):objects,depths=daily&&!fantasy?spatial.slice(0,-1):spatial;
 const movements=daily&&/読書|ものづくり|朝の光/.test(values.theme||'')?['手と道具の接触を保ち、静かな作業の途中を捉える','布や紙の自然な曲がりと光の方向で穏やかな流れを作る','場面の静けさを保ち、必要な動作だけを明確にする']:motion;
 const automaticExpression=!selected||!!keys[control],expressions=tone?toneExpressions[tone]:sets[control]?[sets[control][1]]:selected&&!keys[control]?[control]:autoExpressions;
 const landscape=landscapeSelection(values),bases=[];
 for(const source of allPlans){
  let plan={...source};
  const camera=automaticCamera(source,viewPlan,control),cameraSpec=camera.spec;
  if(!cameraFits(cameraSpec,values,control))continue;
  if(viewPlan){
   plan={...plan,face:viewPlan.face,camera:camera.text};
   if(moodConstraint(control)?.kind==='camera')plan.distance=viewPlan.distance;
   if(plan.family==='rear-turn'&&fixedView!=='rear-turn')plan.pose='片足を踏み出し、片腕を横へ伸ばして体を大きく開く';
   if(fixedView==='rear-turn')plan.pose='背中を鑑賞者へ向け、片腕を遠くへ伸ばし、指定の向きに顔だけ振り返る';
  }
  const fixedAngle=angleConstraint(values.angle);
  if(automaticView(values.pose)&&/背中/.test(plan.pose)&&['front','side'].includes(fixedAngle?.cameraFacing))continue;
  const directionWarnings=automaticView(values.angle)&&moodConstraint(control)?.kind==='face'&&cameraSpec.cameraFacing==='rear'
   ?['ポーズに合う背面カメラから顔の指定「'+control+'」を見せるには、胸郭と首の自然な回転が必要です。顔が隠れる部分を描き足したり首だけを無理に回したりせず、見える範囲と両立を確認してください。']:[];
  for(const expression of expressions)bases.push({...plan,landscape,expression,tone,...(automaticView(values.angle)?{automaticCamera:{family:camera.family,...cameraSpec}}:{}),directionWarnings,light:lights[0],motif:motifs[0],background:landscape?'選択した景観の主題を広く残し、人物は景色の一部として配置':backgrounds[0],depth:depths[0],motion:movements[0],distance:landscape?'風景を広く見渡す環境ロング。人物は景観の一部の大きさに留める':plan.distance,layout:landscape?'景観を主役とする全景の中に、明示された衣装の人物を小さく置く':plan.layout,locked:selected?'選択された表情または角度は固定し、残りの演出を変更':'表情・角度・距離・身体動作をまとめて大きく変更'});
 }
 return chooseDirection(bases,used,control,random,collection,values,{automaticExpression});
}
export function isAdvertising(design){return /雑誌|誌面|見開き|新聞|映画ポスター|舞台ポスター|フェス|フライヤー|広告|チラシ/.test(design);}
export {buildEditorial as buildTextPlan} from './editorial.js?v=28.3.1';
