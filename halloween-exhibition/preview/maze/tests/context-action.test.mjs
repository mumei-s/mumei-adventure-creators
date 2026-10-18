import test from 'node:test';import assert from 'node:assert/strict';
import {resolveContextAction,actionButtonFor} from '../context-action.js';
test('nearby creator replaces generic investigate and further monster actions',()=>{const target=resolveContextAction({creator:{id:'author',distance:.4},feature:{id:'book',distance:.8},monster:{id:'pumpkin',distance:1.2}});assert.equal(target.kind,'creator');assert.equal(actionButtonFor(target),'creator-open');});
test('friendly residents are an independent nonbattle target',()=>{const target=resolveContextAction({resident:{id:'resident',distance:.5},monster:{id:'bat',distance:.8}});assert.equal(target.kind,'resident');assert.equal(actionButtonFor(target),'creator-open');});
test('nearer real item can be inspected and explicit exit wins an exact tie',()=>{assert.equal(actionButtonFor(resolveContextAction({creator:{distance:1},feature:{distance:.2}})),'interact');assert.equal(resolveContextAction({creator:{distance:.5},feature:{distance:.5},exit:{distance:.5}}).kind,'exit');});
test('unavailable or invalid candidates cannot create a phantom action',()=>{for(const distance of [NaN,Infinity,-1,undefined])assert.equal(resolveContextAction({creator:{distance}}),null);assert.equal(resolveContextAction({monster:{distance:.5,available:false}}),null);assert.equal(actionButtonFor(null),null);});


test('nearer furniture cannot hide an available progression feature or exit',()=>{
 for(const id of ['key','gate','horror'])assert.equal(resolveContextAction({scenery:{distance:.3},feature:{id,distance:1}}).id,id);
 assert.equal(resolveContextAction({scenery:{distance:.3},exit:{id:'exit',distance:.7}}).kind,'exit');
 assert.equal(resolveContextAction({scenery:{distance:.3},feature:{id:'horror',distance:1},creator:{id:'visitor',distance:.2}}).kind,'creator');
 assert.equal(resolveContextAction({scenery:{distance:.3},feature:{id:'article',distance:1}}).kind,'scenery');
});
