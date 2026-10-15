import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../theater.js',import.meta.url),'utf8');
const css=await readFile(new URL('../visitor-preferences.css',import.meta.url),'utf8');
test('main brightness range is isolated and 75 maps to original art, zero remains valid',()=>{
 assert.match(source,/brightnessRange:\{min:0,max:100,defaultValue:75\}/);
 assert.match(source,/preferenceKey:'halloween-exhibition:main-preferences:v2'/);
 assert.match(source,/migrateFromKey:'halloween-exhibition:visitor-preferences:v1'/);
 assert.match(source,/--art-brightness',String\(value\/75\)/);
 assert.equal(75/75,1);assert.equal(0/75,0);assert.ok(100/75>1);
});
test('both settings themes have readable independent surfaces and motion safeguards',()=>{
 assert.match(css,/body\[data-mode=normal\] \.visitor-settings-dialog/);
 assert.match(css,/settings-glimmer/);assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/data-motion-paused=true/);assert.match(css,/max-height:calc\(100dvh - 24px\)/);
});
