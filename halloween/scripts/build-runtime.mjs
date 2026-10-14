import {build,version} from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const result=await build({absWorkingDir:root,entryPoints:['app.js'],outfile:'app.bundle.js',bundle:true,format:'esm',target:'es2022',minify:true,charset:'utf8',metafile:true,legalComments:'none',logLevel:'warning'});
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
const inputs=Object.fromEntries(Object.keys(result.metafile.inputs).sort().map(file=>[file,{sha256:hash(file.split('?')[0]),bytes:result.metafile.inputs[file].bytes}]));
const bundleBytes=fs.statSync(path.join(root,'app.bundle.js')).size;
const manifest={builder:'esbuild',builderVersion:version,entry:'app.js',inputs,output:{file:'app.bundle.js',sha256:hash('app.bundle.js'),bytes:bundleBytes}};
fs.writeFileSync(path.join(root,'runtime-build.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({modules:Object.keys(inputs).length,sourceBytes:Object.values(inputs).reduce((sum,row)=>sum+row.bytes,0),bundleBytes}));
