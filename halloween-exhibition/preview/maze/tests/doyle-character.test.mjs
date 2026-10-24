import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {compileCharacterRoster,placeCreatorNPCs,layoutProblem} from '../creator-runtime.js';
import {comparisonEntries} from '../../characters/model.js';
const read=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url)));
const archive=read('../../data/archive.json'),manifest=read('../data/creator-characters.json'),registry=read('../data/character-rigs.json');
const id='doyle-halloween-boy',creatorId='dandy_snake880';

test('reviewed Doyle character is a single canonical article-linked NPC in the roster and comparison',()=>{
 const entries=manifest.characters.filter(character=>character.creatorId===creatorId);assert.equal(entries.length,1);const character=entries[0];assert.equal(character.id,id);assert.equal(character.label,'ドイル');assert.equal(character.role,'npc');assert.equal(character.ready,true);assert.equal(character.identityReviewed,true);assert.equal(character.animationReviewed,true);assert.equal(character.source.kind,'article-art');assert.equal(character.source.userSelected,undefined);assert.deepEqual(character.entityIds,[id]);assert.equal(character.articleURL,'https://note.com/dandy_snake880/n/n084c0d58f567');assert.equal(character.greetingKind,'fictional-game-dialogue');assert(character.greeting.length<=180);
 const roster=compileCharacterRoster(archive,manifest),placement=placeCreatorNPCs(roster.npcs,manifest.slotAssignments);assert.deepEqual(roster.missingCreators,[]);assert.deepEqual(roster.omitted,[]);assert.deepEqual(placement.omitted,[]);assert.equal(placement.placed.filter(actor=>actor.id===id).length,1);
 const comparison=comparisonEntries(archive,manifest).filter(actor=>actor.creatorId===creatorId);assert.equal(comparison.length,1);assert.equal(comparison[0].id,id);assert.equal(comparison[0].ready,true);assert.equal(comparison[0].avatar,archive.creators.find(creator=>creator.id===creatorId).avatar);
});
test('Doyle has a dedicated integrity-checked 16-frame atlas with safe cell gutters and exact rig metadata',()=>{
 const character=manifest.characters.find(character=>character.id===id);assert(character);const {asset}=character;assert.equal(asset.src,'assets/creator-npcs/doyle-halloween-boy-walk.webp');assert.equal(layoutProblem(asset),null);
 const bytes=fs.readFileSync(new URL('../'+asset.src,import.meta.url));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),asset.sha256);assert.equal(asset.layout.frames.flat().length,16);assert.equal(new Set(asset.layout.frames.flat().map(cell=>cell.frame.join(','))).size,16);
 for(const cell of asset.layout.frames.flat()){const [x,y,w,h]=cell.frame,[left,top,right,bottom]=cell.runtimeAlphaBounds;assert(left>x&&top>y&&right<x+w&&bottom<y+h,'The whole fallback figure needs clear gutters on every cell edge');}
 const rigs=registry.rigs.filter(rig=>rig.id===id);assert.equal(rigs.length,1);assert.equal(rigs[0].approved,true);const url=new URL(rigs[0].manifestURL,new URL('../',import.meta.url)),rigBytes=fs.readFileSync(url);assert.equal(url.searchParams.get('v'),crypto.createHash('sha256').update(rigBytes).digest('hex').slice(0,12));const rig=JSON.parse(rigBytes);assert.equal(rig.id,id);assert(rig.views);
});
