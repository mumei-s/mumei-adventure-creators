import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const css=await read('gallery-controls.css'),html=await read('index.html'),modes=await read('display-mode.css'),motion=await read('magical-entrance.css');

test('crossing floor plane and thin orbital rings are suppressed at every viewport',()=>{
 assert.match(css,/\.theater \.stage-floor,\.theater \.glass-orbit\{display:none!important\}\s*$/);
 assert.doesNotMatch(modes,/stage-floor|glass-orbit/);
 for(const name of ['stage-floor','glass-orbit'])assert.match(html,new RegExp('class="[^"]*'+name+'[^"]*" aria-hidden="true"'));
});
test('portrait button, captions, navigation and entrance animation remain intact',()=>{
 for(const id of ['artwork-open','artwork-image','room-title','creator-name','previous','next','slideshow-toggle'])assert.ok(html.includes('id="'+id+'"'));
 assert.match(html,/class="portal-doors" aria-hidden="true"/);
 assert.match(motion,/\.turning-in \.artwork-frame \{animation:portal-arrive/);
 assert.match(css,/\.theater \.stage-caption \{position:relative;inset:auto/);
 assert.match(css,/\.theater \.stage-footer \{[\s\S]*?position:relative;inset:auto;height:auto/);
});
