// Optional original stage fiction; these encounters never change the six-mark ending.
export const OPTIONAL_MONSTERS=Object.freeze([
 Object.freeze({id:'witch',name:'月影の魔女',icon:'🧙',color:'#a787d2',x:8.8,z:2.1,hint:'北の書庫・月明かりの通り',needsKey:true,optional:true}),
 Object.freeze({id:'masked_wanderer',name:'仮面の散歩者',icon:'🎭',color:'#a4ad9a',x:2.1,z:12.1,hint:'西の肖像の回廊・北端',needsCorridor:true,optional:true}),
]);
export const OPTIONAL_STORIES=Object.freeze({
 witch:Object.freeze({title:'月影を集める魔女',role:'任意の腕試し',location:'北の書庫',temperament:'落ち着いた魔法の使い手。',intro:'月明かりに、紫の帽子が浮かぶ。魔女は魔法陣を閉じ、あなたのランタンを見つめた。',dialogue:'その灯り、私の月影をほどけるかしら。腕試しをするなら、ここで待っているわ。',advice:'魔法陣を集めたら守る。杖を休めたときは光、結び目が見えたら杖を使おう。',keepsake:'月影のリボン',memory:'夜の魔法にも、ほどく手順がある。',victory:'見事ね。月影のリボンをどうぞ。鐘への道は、あなたの六つの灯りが導くわ。',reactions:Object.freeze({guard:'魔法陣を、よく見ていたわね。',shine:'その光は温かいのね。',attack:'結び目を見つけたのね。',weakness:'きれいにほどけたわ。',rest:'急ぐことはないわ。灯りを休ませましょう。'})}),
 masked_wanderer:Object.freeze({title:'静かな仮面の散歩者',role:'任意の腕試し',location:'西の肖像の回廊',temperament:'無口で、大きな足取り。',intro:'古い仮面をつけた大きな影が、足を止める。追いかけてはこない。散歩者は距離を取り、あなたの返事を待っている。',dialogue:'……腕試し、するか。いやなら、道をあける。',advice:'大きく構えたら守る。足を止めたら杖、仮面の影が開いたら光を選ぼう。',keepsake:'静かな足音のしるし',memory:'立ち止まる強さもある。',victory:'……いい灯りだ。道は、あちらだ。',reactions:Object.freeze({guard:'……見切ったか。',shine:'まぶしいな。……悪くない。',attack:'……そこだ。',weakness:'見事だ。',rest:'……休め。ここで待つ。'})}),
});
