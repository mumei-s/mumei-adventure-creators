import assert from 'node:assert/strict';
import fs from 'node:fs';
import {questions,resolveSelections} from '../catalog.js?v=28.3.1';
import {applyCollection} from '../collection.js?v=28.3.1';
import {productionPlan} from '../production-plan.js?v=28.3.1';
import {composePrompt} from '../prompt.js?v=28.3.1';
import {creatorHandoff,CREATOR_NAME_TOKEN,creatorDisplayLabel,creatorEditableName} from '../creator-handoff.js?v=28.3.1';
import {mediumExecution} from '../medium-execution.js?v=28.3.1';

const profile={...creatorHandoff('test_author'),articles:[{text:'OLD_CORPUS_SENTINEL'}],topics:['OLD_TAG_SENTINEL'],bodyRead:{count:1000},sourceEvidence:[{excerpts:['OLD_CORPUS_SENTINEL']}]};
const base=resolveSelections({design:'週刊誌の表紙',medium:'発光幻想アニメ',theme:'宇宙のHalloween',costume:'参照画像の衣装を生かす',place:'雨の路地',pose:'四つん這い',mood:'正面・首をまっすぐ',palette:'星灯りの青紫',type:'デザインに合わせて自動編集',line:'セリフなし',size:'縦ポスター2:3｜2400×3600｜2:3'},()=>.2);
const variant={face:'正面・首をまっすぐ',expression:'微笑み',distance:'全身',pose:'両手と両膝で支える',camera:'俯瞰'};
let count=0,max=0;
for(const mode of ['halloween','everyday']){
 applyCollection(mode);
 for(const medium of questions.find(q=>q.key==='medium').groups.flatMap(g=>g.values)){
  for(const costume of ['参照画像の衣装を生かす','風景を主役にする']){
   const values={...base,medium,costume};
   const plan=productionPlan(profile,values,variant,mode,()=>.2);
   const prompt=composePrompt({creator:'test_author',profile,values,variant,preparedPlan:plan,references:[{name:'reference.png',role:'identity'}],edition:'V26'});
   const condition=plan.conditions.find(c=>c.key==='medium');
   assert.ok(condition.known&&condition.execution.method&&condition.checks.length,medium);
   assert.ok(prompt.includes(condition.execution.method),medium+' must reach the structured audit material');
   for(const section of condition.sections)assert.ok(prompt.includes(section.text),medium+' loses '+section.label);
   assert.ok(prompt.includes('【作風を作品全域へ】'),medium);
   assert.ok(prompt.includes('宇宙の世界観を主画像から削除しない'),medium);
   assert.ok(prompt.includes('https://note.com/test_author/'));
   assert.ok(prompt.indexOf('【ChatGPTで作者を確認')<prompt.indexOf('【統合するための制作仕様：開始】'));
   assert.ok(!prompt.includes('OLD_CORPUS_SENTINEL')&&!prompt.includes('OLD_TAG_SENTINEL'));
   assert.ok(!prompt.includes('undefined'));
   count++;max=Math.max(max,prompt.length);
  }
 }
}
applyCollection('halloween');
assert.equal(count,456);
assert.equal(new Set(mediumExecution.values()).size,114);
assert.ok(!mediumExecution.get('クリスタル透光アニメ').includes('opaque cel-painted skin'));
assert.equal(creatorHandoff('test_author').displayName,CREATOR_NAME_TOKEN);
assert.equal(creatorEditableName(creatorHandoff('test_author')),'');
assert.equal(creatorDisplayLabel(creatorHandoff('test_author')),'作者名はChatGPTで確認');
assert.equal(creatorHandoff('test_author',CREATOR_NAME_TOKEN).name,'');
assert.equal(creatorHandoff('test_author','指定作者名').displayName,'指定作者名');
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8'),html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.ok(!app.includes('fetch(profileEndpoint')&&!app.includes('await profileController'));
assert.ok(!html.includes('id="activity-on"')&&!html.includes('data-text-part="line"'));
assert.ok(app.includes("input.line='セリフなし'"));
assert.ok(!questions.find(q=>q.key==='type').groups.flatMap(g=>g.values).includes('セリフのみ'));
console.log('PASS v26: 114 distinct media × two modes × person/scenery = '+count+' complete drawing contracts; cosmic scene kept; ID lookup delegated before image call; no article/tag corpus; no tool-side fetch or dialogue selector. Maximum '+max+' prompt characters. This validates code and instructions, not 456 generated images.');
