import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../pwa-navigation.js',import.meta.url),'utf8');
const base='https://mumei-s.github.io/mumei-adventure-creators/halloween-exhibition/preview/';
function harness({standalone=true,pathname=base}={}){
 const replaced=[];let handler;
 const location=new URL(pathname);location.replace=href=>replaced.push(href);
 vm.runInNewContext(source,{URL,location,window:{navigator:{},matchMedia:()=>({matches:standalone})},document:{currentScript:{src:base+'pwa-navigation.js?v=test'},addEventListener(type,fn){assert.equal(type,'click');handler=fn;}}});
 function click(href,extra={}){
  let prevented=false;
  const link={href:new URL(href,location).href,target:extra.target||'',hasAttribute:()=>Boolean(extra.download)};
  handler({button:0,defaultPrevented:false,target:{closest:()=>link},preventDefault(){prevented=true;},...extra});
  return prevented;
 }
 return {click,replaced};
}
test('standalone castle, street and dungeon round trips replace one entry while browser tabs retain Back',()=>{
 const app=harness();assert.equal(app.click('./town/?return=theatre'),true);assert.deepEqual(app.replaced,[base+'town/?return=theatre']);
 const town=harness({pathname:base+'town/'});assert.equal(town.click('../?return=palace'),true);assert.equal(town.replaced[0],base+'?return=palace');
 const dungeon=harness({pathname:base+'maze/'});assert.equal(dungeon.click('./clear-gallery/'),true);assert.equal(dungeon.replaced[0],base+'maze/clear-gallery/');
 const browser=harness({standalone:false});assert.equal(browser.click('./town/'),false);assert.deepEqual(browser.replaced,[]);
});
test('external articles, downloads, anchors, canceled clicks, modifier clicks and admin retain native navigation',()=>{
 for(const [href,extra]of [['https://note.com/ss_yr',{}],['./admin/',{}],['#settings',{}],['./town/',{target:'_blank'}],['./town/',{download:true}],['./town/',{ctrlKey:true}],['./town/',{button:1}],['./town/',{defaultPrevented:true}]]){
  const h=harness();assert.equal(h.click(href,extra),false,href);assert.deepEqual(h.replaced,[]);
 }
});
