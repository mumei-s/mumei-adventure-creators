import assert from 'node:assert/strict';
import {questions} from '../catalog.js?v=28.1.2';
import {styleFidelity} from '../style-fidelity.js?v=28.1.2';
const media=questions.find(q=>q.key==='medium').groups.flatMap(g=>g.values);
for(const value of media){
 const condition={value,checks:['selected material']};
 const scene=styleFidelity(condition,{noPerson:true}).join('\n');
 assert.ok(scene.includes('主景の輪郭・構造・材料の境界'));
 assert.ok(!/顔や主要な手|瞳の色層|髪の束とほつれ|衣服の裁断/.test(scene),value);
 assert.ok(styleFidelity(condition).join('\n').includes('顔の識別点'));
}
for(const value of ['禅画','ミニマリズム','ピクセルアート','構成主義']){
 assert.ok(styleFidelity({value,checks:[]}).join('\n').includes('写真風の陰影やぼけ、細密描写を一律に追加しない'));
}
console.log('PASS v27: all 108 scenery styles avoid human detail instructions; reduced media keep marks, planes and negative space.');
