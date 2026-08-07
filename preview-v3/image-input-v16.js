(() => {
  'use strict';
  const MAX = 8 * 1024 * 1024;
  const isWeb = f => ['image/jpeg','image/png','image/webp'].includes((f.type||'').toLowerCase());
  const isHeic = f => ['image/heic','image/heif'].includes((f.type||'').toLowerCase()) || /\.(heic|heif)$/i.test(f.name||'');

  async function bitmapFrom(file){
    if ('createImageBitmap' in window) {
      try { return await createImageBitmap(file); } catch {}
    }
    return await new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(file),img=new Image();
      img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};
      img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('この画像をiPhone/Safariで読み込めませんでした。JPEGまたはPNGで保存して再選択してください。'))};
      img.src=url;
    });
  }

  async function convertKeepPixels(file){
    if (isWeb(file) && file.size <= MAX) return file;
    if (!isWeb(file) && !isHeic(file)) throw new Error('JPEG・PNG・WebP・HEIC・HEIF画像を選択してください。');
    const source=await bitmapFrom(file);
    const w=source.width || source.naturalWidth, h=source.height || source.naturalHeight;
    if (!w || !h) throw new Error('画像サイズを取得できませんでした。');
    const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h;
    canvas.getContext('2d').drawImage(source,0,0,w,h); source.close?.();
    for (const q of [.94,.88,.80,.72]) {
      const blob=await new Promise(r=>canvas.toBlob(r,'image/webp',q));
      if (blob && blob.size <= MAX) return new File([blob],(file.name||'image').replace(/\.[^.]+$/,'')+'.webp',{type:'image/webp'});
    }
    throw new Error('原寸ピクセルを維持したまま8MB以下にできませんでした。画像ファイル容量を小さくして再選択してください。');
  }

  document.addEventListener('change', async e => {
    const input=e.target.closest?.('[data-upload]');
    if (!input || input.dataset.v16Ready==='1') { if(input) delete input.dataset.v16Ready; return; }
    const files=[...(input.files||[])];
    if (!files.some(f=>!isWeb(f) || f.size>MAX)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    try {
      const converted=[];
      for (const f of files) converted.push(await convertKeepPixels(f));
      const dt=new DataTransfer(); converted.forEach(f=>dt.items.add(f)); input.files=dt.files;
      input.dataset.v16Ready='1'; input.dispatchEvent(new Event('change',{bubbles:true}));
    } catch (error) {
      alert(error.message || String(error)); input.value='';
    }
  }, true);
})();