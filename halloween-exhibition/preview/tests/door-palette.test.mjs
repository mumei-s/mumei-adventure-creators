import test from 'node:test';import assert from 'node:assert/strict';
import {createDoorPalettePicker,DOOR_PALETTES} from '../door-palette.js';
test('first fourteen creator doors have distinct shuffled palettes',()=>{const pick=createDoorPalettePicker(()=>.37);assert.equal(new Set(Array.from({length:14},(_,i)=>pick('door'+i))).size,14);});
test('revisits never repeat the previous display or that door’s previous color',()=>{const pick=createDoorPalettePicker(()=>.5),seen=new Map();let previous;for(let i=0;i<200;i++){const key='door'+(i%14),palette=pick(key);assert.notEqual(palette,previous);assert.notEqual(palette,seen.get(key));assert.ok(DOOR_PALETTES.includes(palette));previous=palette;seen.set(key,palette);}});
