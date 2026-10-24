import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileCharacterRoster} from '../creator-runtime.js';

const archive=JSON.parse(fs.readFileSync(new URL('../../data/archive.json',import.meta.url)));
const original=JSON.parse(fs.readFileSync(new URL('../data/creator-characters.json',import.meta.url)));
const creatorId='dandy_snake880',id='doyle-halloween-boy',groupId='dandy_snake880-2026',approvalId='doyle-article-boy-owner-selection-20261024';
const articleURL='https://note.com/dandy_snake880/n/n084c0d58f567';
const imageURL='https://assets.st-note.com/img/1792671223-PoY0EeLCd5lIjyWQcr7JMNZm.png?width=1200';
const referenceSHA256='b5010ec0c4613ace1797ec8b38adc38370acc022200d3c02908b705b2aa0cca2';
function fixture(){
 const manifest=structuredClone(original),source={kind:'article-art',articleURL,imageURL,referenceSHA256,verified:true};
 manifest.characters=manifest.characters.filter(character=>character.creatorId!==creatorId);
 // Geometry-only unit fixture, never published or used as Doyle's artwork.
 const asset=structuredClone(manifest.characters[0].asset);asset.src='assets/creator-npcs/unit-test-doyle.webp';
 manifest.characters.push({id,creatorId,groupId,role:'npc',label:'ドイル',entityIds:[id],articleURL,referenceSelectionId:approvalId,ready:true,identityReviewed:true,animationReviewed:true,source,asset,greeting:'かぼちゃの灯りのそばで、物語を読んでいこう。',greetingKind:'fictional-game-dialogue'});
 manifest.groups=manifest.groups.filter(group=>group.id!==groupId);manifest.groups.push({id:groupId,requiredEntityIds:[id]});
 manifest.ownerArticleSelections=[{creatorId,approved:true,approvalId,approvalKind:'owner-selection',selectedBy:'site-owner',articleURL,imageURL,referenceSHA256,entityIds:[id]}];
 manifest.referenceReviews[creatorId]={decision:'owner-selected-article',reviewed:true,articleVisuallyInspected:true,profileIdentityMixed:false,selectionApprovalId:approvalId,entityIds:[id],articleReference:structuredClone(source)};
 return manifest;
}
const doyle=manifest=>manifest.characters.find(character=>character.creatorId===creatorId);
const review=manifest=>manifest.referenceReviews[creatorId];
const compiled=manifest=>compileCharacterRoster(archive,manifest,2026);

test('exact owner-selected article boy is admitted without any profile blend or creator-consent claim',()=>{
 const manifest=fixture(),entry=compiled(manifest).npcs.find(character=>character.id===id);assert(entry);assert.equal(entry.label,'ドイル');assert.equal(entry.articleURL,articleURL);
 assert.equal(entry.source.userSelected,undefined);assert.equal(review(manifest).avatarReference,undefined);assert.equal(review(manifest).avatarVisuallyInspected,undefined);assert.equal(manifest.ownerArticleSelections[0].selectedBy,'site-owner');
 assert.equal(manifest.referencePolicy.preference,'creator-avatar');assert.equal(manifest.referencePolicy.requireReviewed,true);
});
test('owner selection remains exact and required even when global avatar review is disabled',()=>{
 const mutations=[
  m=>delete m.ownerArticleSelections,m=>m.ownerArticleSelections.push({...m.ownerArticleSelections[0]}),m=>m.ownerArticleSelections[0].approved=false,
  m=>m.ownerArticleSelections[0].approvalKind='creator-consent',m=>m.ownerArticleSelections[0].selectedBy='article-author',m=>m.ownerArticleSelections[0].approvalId='unrelated-approval',
  m=>m.ownerArticleSelections[0].articleURL='https://note.com/dandy_snake880/n/n123',m=>m.ownerArticleSelections[0].imageURL='https://assets.st-note.com/unrelated.png',
  m=>m.ownerArticleSelections[0].referenceSHA256='0'.repeat(64),m=>m.ownerArticleSelections[0].entityIds.push('invented-companion'),
  m=>delete m.referenceReviews[creatorId],m=>review(m).reviewed=false,m=>review(m).articleVisuallyInspected=false,m=>review(m).profileIdentityMixed=true,
  m=>review(m).decision='profile-avatar-match',m=>review(m).selectionApprovalId='unrelated-approval',m=>review(m).avatarReference={},m=>review(m).avatarVisuallyInspected=true,
  m=>review(m).articleReference.imageURL=archive.creators.find(person=>person.id===creatorId).avatar,m=>review(m).articleReference.referenceSHA256='0'.repeat(64),
  m=>doyle(m).referenceSelectionId='unrelated-approval',m=>delete doyle(m).referenceSelectionId,m=>doyle(m).source.userSelected=true,m=>doyle(m).source.verified=false,
  m=>doyle(m).source.kind='profile-avatar',m=>doyle(m).source.referenceSHA256='0'.repeat(64),m=>doyle(m).source.articleURL='https://note.com/dandy_snake880/n/n123',
  m=>doyle(m).source.imageURL='https://assets.st-note.com/production/uploads/images/326281220/rectangle_large_type_2_3b7826618950173e9aebf7f119c4fdb8.jpg?width=1200',
  m=>doyle(m).entityIds.push('invented-companion'),m=>doyle(m).groupId='other-group',m=>doyle(m).id='another-boy',m=>doyle(m).role='hero',
  m=>m.groups.find(group=>group.id===groupId).requiredEntityIds.push('missing'),m=>m.groups.push({id:groupId,requiredEntityIds:[id]}),
  m=>{const hash='1'.repeat(64);m.ownerArticleSelections[0].referenceSHA256=hash;review(m).articleReference.referenceSHA256=hash;doyle(m).source.referenceSHA256=hash;},
 ];
 for(const mutate of mutations)for(const requireReviewed of [true,false]){const manifest=fixture();manifest.referencePolicy.requireReviewed=requireReviewed;mutate(manifest);assert(!compiled(manifest).npcs.some(character=>character.id===id),mutate.toString());}
});
test('Doyle owner selection cannot authorize another creator or bypass submitted and hidden article checks',()=>{
 const manifest=fixture(),entry=doyle(manifest);entry.creatorId='aihan_days';manifest.referenceReviews.aihan_days=review(manifest);assert(!compiled(manifest).npcs.some(character=>character.id===id));
 for(const change of [entry=>entry.visible=false,entry=>entry.submissionStatus='pending',entry=>entry.links=[]]){const copy=structuredClone(archive);change(copy.years[0].entries.find(entry=>entry.creatorId===creatorId));assert(!compileCharacterRoster(copy,fixture(),2026).npcs.some(character=>character.id===id));}
});
test('owner-selected art still requires independent identity, animation and ready reviews',()=>{
 for(const key of ['ready','identityReviewed','animationReviewed']){const manifest=fixture();doyle(manifest)[key]=false;assert(!compiled(manifest).npcs.some(character=>character.id===id));}
});
test('published source review has public provenance without private conversation records or profile consent flags',()=>{
 const selection=original.ownerArticleSelections?.find(item=>item.creatorId===creatorId),record=original.referenceReviews[creatorId];assert(selection);assert.equal(selection.approvalKind,'owner-selection');assert.equal(selection.selectedBy,'site-owner');assert.equal(record.profileIdentityMixed,false);
 const provenance=JSON.stringify({selection,record});assert.doesNotMatch(provenance,/Sentinel_|transcript_evidence|libraryFileId|libfile_|\/workspace\//);assert.equal(record.avatarReference,undefined);assert.equal(record.articleReference.userSelected,undefined);assert.equal(selection.creatorConsent,undefined);
});
