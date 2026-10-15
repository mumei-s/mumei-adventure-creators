// Actual Web Audio offline render; validates generated signal, not a physical phone speaker.
const {chromium}=require('playwright');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../visitor-preferences.js'));
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/music.js'?'text/javascript':'text/html');res.end(req.url==='/music.js'?source:'<!doctype html><title>Music render</title>')});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}`);
  const result=await page.evaluate(async()=>{
   const {createAmbientPlayer,musicScore,MUSIC_BEAT_SECONDS}=await import('/music.js');
   const seconds=musicScore().beats*MUSIC_BEAT_SECONDS,rate=44100;
   async function render(volume){
    const offline=new OfflineAudioContext(1,Math.ceil(seconds*rate),rate);let now=0,tick;
    class Adapter{
     constructor(){this.state='running';this.destination=offline.destination}
     get currentTime(){return now}
     async resume(){} async close(){this.state='closed'}
     createGain(){return offline.createGain()}createOscillator(){return offline.createOscillator()}
    }
    const p=createAmbientPlayer({AudioContextCtor:Adapter,schedule:cb=>{tick=cb;return 1},cancel:()=>{}});
    p.setVolume(volume);await p.start();for(now=.05;now<seconds;now+=.05)tick();
    const data=(await offline.startRendering()).getChannelData(0);p.stop();return data;
   }
   const silent=await render(0),data=await render(100);let peak=0,squares=0,nonzero=0;
   for(const x of data){peak=Math.max(peak,Math.abs(x));squares+=x*x;if(Math.abs(x)>.001)nonzero++}
   // Compare energy in each 1-second window; quiet envelopes must not mean a long silent track.
   const rmsWindows=[];for(let i=0;i<data.length-rate;i+=rate){let energy=0;for(let j=i;j<i+rate;j++)energy+=data[j]**2;rmsWindows.push(Math.sqrt(energy/rate))}
   return {rate,seconds,peak,rms:Math.sqrt(squares/data.length),nonzeroFraction:nonzero/data.length,silentPeak:silent.reduce((a,x)=>Math.max(a,Math.abs(x)),0),rmsWindows,samples:Array.from(data)};
  });
  assert.equal(result.silentPeak,0);assert(result.peak<.65&&result.peak>.1);assert(result.rms>.025);assert(result.rmsWindows.every(v=>v>.02));
  const out=process.env.MUSIC_RENDER_PATH;
  if(out){const samples=result.samples,b=Buffer.alloc(44+samples.length*2);b.write('RIFF',0);b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(result.rate,24);b.writeUInt32LE(result.rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(samples.length*2,40);samples.forEach((x,i)=>b.writeInt16LE(Math.round(x*32767),44+i*2));fs.writeFileSync(out,b)}
  delete result.samples;console.log(JSON.stringify(result,null,2));
 }finally{await browser?.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
