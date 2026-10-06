const labelTopics={
 '光彩と幻想':['イラスト','アート','デザイン','創作'], '余白と詩情':['詩','イラスト','アート','創作'],
 '家族と暮らし':['子育て','育児','ワーママ'], '仲間とのつながり':['共同マガジン','コミュニティ','メンバーシップ'],
 '創作と表現':['イラスト','創作','漫画','デザイン','アート'], '写真と記憶':['写真'], '技術と未来':['AI','学習'],
 '支え合い':['医療','福祉','介護','看護','健康'], '自然と季節':['自然','動物'], '仕事と挑戦':['仕事','働く','タイミー','副業','収益化','マーケティング'], '旅と発見':['旅行'], '心と物語':['小説','詩','日記','エッセイ','読書']
};
export function profileForArtwork(profile,enabled,excluded=new Set()){
 if(!enabled)return {...profile,biography:'',titles:[],topics:[],inspiration:null,bodyRead:null,articles:[],activityEnabled:false};
 if(!excluded.size)return {...profile,activityEnabled:true};
 const topics=profile.topics.filter(t=>!excluded.has(t)),signals=(profile.inspiration?.signals||[]).filter(s=>(labelTopics[s.label]||[]).some(t=>topics.includes(t)));
 const inspiration=signals.length?{signals,labels:signals.map(s=>s.label),themes:[...new Set(signals.map(s=>s.theme))],phrases:signals.flatMap(s=>s.phrases),imagery:signals.map(s=>s.imagery),objects:[]}:null;
 return {...profile,biography:topics.join('・'),titles:[],topics,inspiration,bodyRead:inspiration?profile.bodyRead:null,articles:[],activityEnabled:true};
}
