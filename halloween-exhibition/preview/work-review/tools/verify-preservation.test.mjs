import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {auditCnaManifestAddition,verifyPreservation} from './verify-preservation.mjs';

const repo=path.resolve(fileURLToPath(new URL('../../../../',import.meta.url)));
const inventoryBytes=await readFile(new URL('../baseline-inventory.json',import.meta.url));
const inventory=JSON.parse(inventoryBytes);
const baseline=JSON.parse(execFileSync('git',['show',inventory.baselineCommit+':halloween-exhibition/preview/maze/data/creator-characters.json'],{cwd:repo}));
const current=JSON.parse(await readFile(new URL('../../maze/data/creator-characters.json',import.meta.url)));
const archive=JSON.parse(await readFile(new URL('../../data/archive.json',import.meta.url)));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const ids=['cna-black-bob','cna-star-twintails','cna-orange-glasses'],assetInfo={};
for(const id of ids){const bytes=await readFile(new URL('../../maze/assets/creator-npcs/'+id+'-walk.webp',import.meta.url));assetInfo[id]={bytes:bytes.length,sha256:sha(bytes)};}
const audit=(manifest=current,data=archive,assets=assetInfo)=>auditCnaManifestAddition(baseline,manifest,data,assets);

test('current approved CNA extension preserves every baseline definition and the original inventory bytes',async()=>{
 assert.deepEqual(audit(),[]);const result=await verifyPreservation();assert.equal(result.passed,true);assert.deepEqual(result.failures,[]);
 assert.equal(result.checked,50);assert.equal(result.bytePreservedJSON,4);assert.equal(result.bytePreservedAssets,40);assert.equal(result.approvedProfileGuestAdditions,3);
 assert.deepEqual(await readFile(new URL('../baseline-inventory.json',import.meta.url)),inventoryBytes);
});

test('old characters, assets, sources, cat, reviews, groups, slots and policies cannot change inside the CNA exception',()=>{
 const mutations=[
  m=>m.characters[0].label+='changed',m=>m.characters[0].source.referenceSHA256='0'.repeat(64),
  m=>m.characters[0].asset.sha256='0'.repeat(64),m=>m.characters[0].asset.layout.frames[0][0].anchorY=.1,
  m=>m.characters.splice(0,1),m=>m.characters.reverse(),m=>m.companions[0].entityIds.push('invented-cat'),
  m=>m.referenceReviews.ss_yr.reviewed=false,m=>m.referenceReviews.ss_yr.avatarReference.imageURL='https://example.com/avatar.png',
  m=>m.groups[0].requiredEntityIds.push('invented-companion'),m=>delete m.slotAssignments['koakumako-2026'],
  m=>m.slotAssignments['koakumako-2026']='archive-mid-west',m=>m.referencePolicy.requireReviewed=false,
  m=>m.unknownPublicData={apiKey:'never-allowed'},m=>m.revision='unreviewed-revision',
 ];
 for(const mutate of mutations){const m=structuredClone(current);mutate(m);assert.ok(audit(m).length>0,mutate.toString());}
});

test('only the approved three identities, source hashes, profile URL and pending-only dialogue are admitted',()=>{
 const guest=m=>m.characters.find(c=>c.id==='cna-black-bob');
 const mutations=[
  m=>m.characters.push({...guest(m),id:'fourth-cna-person'}),m=>m.characters.pop(),m=>guest(m).id='unknown-guest',
  m=>guest(m).creatorId='ss_yr',m=>guest(m).articleURL='https://note.com/grand_daisy8632/n/n123',
  m=>guest(m).profileURL='https://note.com/other',m=>guest(m).links=[{url:'https://note.com/grand_daisy8632/n/n123'}],
  m=>guest(m).entityIds.push('invented-pet'),m=>guest(m).source.referenceSHA256='0'.repeat(64),
  m=>guest(m).source.croppedReferenceSHA256='0'.repeat(64),m=>guest(m).source.referenceId='owner-lantern-reference-20261016',
  m=>guest(m).source.verified=false,m=>guest(m).source.kind='profile-avatar',m=>guest(m).asset.src='assets/creator-npcs/owner-lantern-walk.webp',
  m=>guest(m).asset.sha256='0'.repeat(64),m=>guest(m).asset.layout.frames[0][0].frame=[-1,0,256,256],
  m=>guest(m).greetingKind='author-quote',m=>guest(m).continuousAnimationReviewed=true,
  m=>m.profileGuests[0].approved=false,m=>m.profileGuests[0].referenceSHA256='0'.repeat(64),
  m=>m.profileGuests[0].submissionStatus='submitted',m=>m.profileGuests.push({...m.profileGuests[0]}),
  m=>m.groups.at(-1).requiredEntityIds.pop(),m=>m.slotAssignments['cna-profile-guests']='hall-west',
  m=>m.referenceReviews.grand_daisy8632.avatarReference.profileURL='https://note.com/other',
  m=>m.referenceReviews.grand_daisy8632.avatarReference.referenceSHA256='0'.repeat(64),
  m=>delete m.referenceReviews.grand_daisy8632.avatarReference.verifiedAtUTC,
  m=>m.referenceReviews.grand_daisy8632.userApproval.referenceSHA256='0'.repeat(64),
 ];
 for(const mutate of mutations){const m=structuredClone(current);mutate(m);assert.ok(audit(m).length>0,mutate.toString());}
 const submitted=structuredClone(archive);submitted.years[0].entries.find(e=>e.creatorId==='grand_daisy8632').submissionStatus='submitted';assert.ok(audit(current,submitted).some(f=>f.includes('pending')));
});

test('summary and asset integrity must come from real local bytes rather than manifest claims',()=>{
 for(const key of Object.keys(current.runtimeSummary)){
  const m=structuredClone(current),value=m.runtimeSummary[key];m.runtimeSummary[key]=typeof value==='number'?value+1:'changed';assert.ok(audit(m).some(f=>f.includes('summary')),key);
 }
 const corrupted=structuredClone(assetInfo);corrupted[ids[0]].sha256='0'.repeat(64);assert.ok(audit(current,archive,corrupted).some(f=>f.includes('byte integrity')));
 const changedBytes=structuredClone(assetInfo);changedBytes[ids[0]].bytes++;assert.ok(audit(current,archive,changedBytes).some(f=>f.includes('summary')));
 const missing=structuredClone(assetInfo);delete missing[ids[0]];assert.ok(audit(current,archive,missing).length>0);
});
