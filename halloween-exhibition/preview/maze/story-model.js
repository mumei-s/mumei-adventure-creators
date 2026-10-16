// Original fiction for the palace adventure. No participant speech or biography is invented here.
export const STORY_MONSTER_IDS = Object.freeze(['pumpkin','ghost','zombie','vampire','franken','bat']);
export const STORY = Object.freeze({
  title:'夜明けを綴る六つの灯',
  subtitle:'THE PALACE OF SIX LANTERNS',
  protagonistRole:'宮殿の主',
  fictionLabel:'冒険の物語・住人の台詞はフィクションです。',
  premise:'展示会の最後の夜。宮殿の「夜明けの鐘」から、六つの音が消えてしまった。宮殿の主であるあなたはランタンを手に、書庫に朝を取り戻す旅へ出る。',
  opening:Object.freeze([
    Object.freeze({speaker:'語り',text:'最後の来客を見送るはずだった夜、宮殿の時計が十二時の手前で止まった。窓の向こうには、まだ来ない夜明け。'}),
    Object.freeze({speaker:'語り',text:'書庫からこぼれた物語の影が、六人の住人の大切な記憶を包んでいる。影をほどき、六つの「キャンディのしるし」を集めよう。'}),
    Object.freeze({speaker:'冒険の手引き',text:'あなたはこの宮殿の主。住人に話しかけ、予告を読み、杖・ランタン・守りを使い分ける。まずは入口のカボチャの番人へ。東の鍵が、北の書庫への道をひらく。'}),
  ]),
  ending:'六つのしるしが、夜明けの鐘に六つの音を返した。遠くで一度だけ鐘が鳴り、書庫の窓が金色にほどける。宮殿の主が守ったのは、誰かの物語を迎え入れる場所だった。',
  endingDialogue:'「次のページは、明るいところで読もう。」住人たちが笑う。ここから先の物語は、展示された作品の中へ。',
});
const residents = {
  pumpkin:{
    title:'入口に残された灯',role:'帰り道を守る番人',location:'ランタンの玄関',temperament:'頑固だけれど、最後のひとりまで見送る。',
    intro:'消えかけのランタンを抱えて、番人はまだ誰かを待っている。足元で、ほどけない影がくるりと回った。',
    dialogue:'この灯を消したら、帰り道が見えなくなる。主よ、わしの手が動かなくても、灯をつないでくれるか。',
    advice:'火種が見えるときは「光」。大きく枝を振り上げたら「守る」。空の腕を下ろしたら「杖」が届く。',
    keepsake:'帰り道のしるし',memory:'見送る人にも、帰る場所がある。',
    victory:'そうか。ひとりで朝まで守らなくてもよかったんだな。この灯は、あなたに預けよう。',
    reactions:{guard:'いい構えだ。灯が消えなければ、次の一歩が見える。',shine:'その明るさ……窓辺で待つ家の灯に似ている。',attack:'絡まった枝だけを払ったのか。なかなか器用だ。',weakness:'影がほどけた。忘れていた帰り道が見える。',rest:'急がなくていい。灯のそばで休んでいくといい。'},
  },
  ghost:{
    title:'閉じられなかった一冊',role:'忘れものを預かる司書',location:'東の鍵の間',temperament:'静かな声で、最後の一行を大切にする。',
    intro:'司書の透けた指が、同じページを何度もめくる。本から抜け落ちた文字が、黒い蝶のように漂っていた。',
    dialogue:'この本の終わりだけ、思い出せないのです。あなたの灯で、余白に隠れた文字を見つけていただけますか。',
    advice:'閉じた本には光が通る。紙吹雪は守って待ち、しおりを落とした隙に杖で影を払おう。',
    keepsake:'余白のしるし',memory:'書かれていない場所にも、続きは生まれる。',
    victory:'最後の行は、まだ書かれていなかったのですね。続きを待てることが、こんなにうれしいなんて。',
    reactions:{guard:'ページを傷つけないでくださったのですね。',shine:'透かせば見える文字が、まだこんなに。',attack:'しおりが戻りました。そこが読みかけの場所です。',weakness:'影のインクが薄れていきます。もう少しです。',rest:'休憩のしおりを挟みましょう。本は逃げません。'},
  },
  zombie:{
    title:'ほどけた縫い目の約束',role:'宮殿の仕立て屋',location:'南のランタン柱',temperament:'動作はゆっくり。手仕事には、とても細やか。',
    intro:'大きな指で、小さな針を持つ仕立て屋。繕いかけのマントから、影の糸が床へ伸びている。',
    dialogue:'明日の……晴れ着。まだ……直せて、いない。糸が、からまって……手を、貸して。',
    advice:'足元の糸には杖。つぎはぎステップは守る。針仕事に戻ったら光で縫い目を照らそう。',
    keepsake:'結び目のしるし',memory:'継ぎ目は、直してもらった証になる。',
    victory:'できた。きれい、より……あたたかい。あなたの分も……いつか、縫おう。',
    reactions:{guard:'そう……ゆっくり。あわてると、糸……切れる。',shine:'見える。小さな……針の穴。',attack:'そこ……からまった、ところ。ありがとう。',weakness:'ひと目、ずつ……なおって、いく。',rest:'座ろう。お茶……まだ、あたたかい。'},
  },
  vampire:{
    title:'拍手のない舞踏会',role:'肖像の回廊の主人',location:'西の肖像の回廊',temperament:'芝居がかった礼儀の奥に、ひとりを怖がる心。',
    intro:'誰もいない床へ、伯爵は一礼する。マントの裏に隠れた影だけが、遅れて踊り続けている。',
    dialogue:'今宵の最後のお客さまは、宮殿の主ご本人か。どうか一曲だけ。終わりの挨拶を、忘れてしまってね。',
    advice:'マントを閉じたら守って準備。一礼のときは光が届く。影の分身には杖、ただし反撃に注意。',
    keepsake:'挨拶のしるし',memory:'別れの挨拶は、次の約束にもなる。',
    victory:'それでは、今夜はここまで。またお会いしましょう。……なるほど。これが言いたかったのか。',
    reactions:{guard:'結構。相手の番を待つのも、よい踊りだ。',shine:'おや。夜に慣れた目にも、優しい灯だね。',attack:'影の裾だけを払うとは。見事な身のこなしだ。',weakness:'その一歩で、古い影が追いつけなくなった。',rest:'幕間にしよう。いい舞台ほど、休憩が必要だ。'},
  },
  franken:{
    title:'止まった時計の心臓',role:'夜明けの鐘の修理工',location:'中央の月紋',temperament:'力は大きく、声は小さい。壊さない方法を探す。',
    intro:'胸の歯車を押さえたゴーレムが、時計の部品を並べていた。ぜんまいに噛みついた影が、同じ一秒を巻き戻す。',
    dialogue:'ぼくが触ると、また壊してしまうかな。鐘を直したい。大きな手でも、小さな音を戻せるかな。',
    advice:'石の装甲には光。ぜんまいを巻く間は杖が届く。大きな手拍子を予告したら守ろう。',
    keepsake:'秒針のしるし',memory:'大きな手も、小さなものを守れる。',
    victory:'聞こえた。ひとつ、次の音。ありがとう。ぼくの手で、ちゃんと直せたんだ。',
    reactions:{guard:'よかった。手が当たらなくて、よかった。',shine:'胸の奥まで……明るくなる。',attack:'そこだよ。歯車のすき間に、影がいる。',weakness:'動いた。一秒だけじゃない。先へ、進んでる。',rest:'休んで。ぼくは、ここで待っていられるよ。'},
  },
  bat:{
    title:'朝を怖がった配達人',role:'書庫の夜間配達人',location:'北の物語の書庫',temperament:'早口で世話好き。誰よりも終わりに弱い。',
    intro:'届かなかった手紙を抱えて、コウモリは書架の間を飛ぶ。影の封筒には、差出人の名前だけが残っていた。',
    dialogue:'朝になったら、お祭りは終わっちゃうでしょ？ だから最後の手紙だけ配れなかった。ねえ、終わっても、また会える？',
    advice:'翼を広げたら光で道を示す。急降下は守る。止まり木で息をつくときに杖で影を払おう。',
    keepsake:'再会のしるし',memory:'終わったページから、また会う約束を送れる。',
    victory:'配ってくる！「また来年」って、ぜんぶの窓に。主さん、鐘を鳴らして。ぼく、もう朝が怖くない。',
    reactions:{guard:'わっ、ちゃんと見てたんだ！ 速さだけじゃだめか。',shine:'あっちが出口？ 明るいほうなら、飛んでいける！',attack:'影の封が切れた！ 手紙は無事だよ。',weakness:'軽くなった。こんなに高く飛べたんだ！',rest:'ひと休みしよう。配達、少し遅れてもいいよね。'},
  },
};
for(const value of Object.values(residents)){Object.freeze(value.reactions);Object.freeze(value);}
export const RESIDENT_STORIES = Object.freeze(residents);
export function encounterStory(id){return RESIDENT_STORIES[id]||null;}
export function chapterFor({cleared=[],unlocked=false,hasKey=false,reachedVault=false}={}){
  const recovered=STORY_MONSTER_IDS.filter(id=>cleared.includes(id));const count=recovered.length;
  const common={recovered,total:6,count,progress:`六つの灯 ${count}/6`,fictionLabel:STORY.fictionLabel};
  if(unlocked&&count===6&&reachedVault)return {...common,id:'dawn',index:4,kicker:'EPILOGUE',title:'終章 · 夜明けを綴る',summary:STORY.ending,objective:'書庫で夜明けの物語を読み、展示された作品へ。'};
  if(count===6)return {...common,id:'return',index:3,kicker:'THE SIXTH LIGHT',title:'終章 · 鐘を鳴らすとき',summary:'六つのしるしが、ランタンの中で静かに響いている。',objective:unlocked?'北の物語の書庫に戻り、夜明けの鐘を鳴らそう。':'東の鍵を見つけ、北の格子扉から物語の書庫へ。'};
  if(unlocked||count>=4)return {...common,id:'archive',index:3,kicker:'CHAPTER III',title:'第三章 · 朝を待つ書庫',summary:'物語の終わりを怖がっていた住人たちが、少しずつ明日を思い出していく。',objective:unlocked?`残る${6-count}人と仲直りしよう。北の書庫には、夜の配達人が待っている。`:'東の鍵を北の格子扉に使い、書庫への道をひらこう。'};
  if(hasKey||count>=2)return {...common,id:'memories',index:2,kicker:'CHAPTER II',title:'第二章 · ほどける記憶',summary:'しるしは、住人が大切にしてきた記憶のかけら。力を合わせれば、夜明けの鐘はもう一度鳴る。',objective:hasKey?'東の鍵を北の格子扉に使おう。西の回廊にも、ひとりの住人が待っている。':'東の鍵の間を調べよう。仕立て屋と修理工にも、話を聞いてみよう。'};
  return {...common,id:'lantern',index:1,kicker:'CHAPTER I',title:'第一章 · 消えないランタン',summary:STORY.premise,objective:count?'東の鍵の間へ。司書の話を聞き、北の書庫の鍵を探そう。':'入口のカボチャの番人に話しかけよう。予告を読み、光・守り・杖を使い分けよう。'};
}
