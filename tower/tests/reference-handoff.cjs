const assert = require('node:assert/strict');
const {readFile} = require('node:fs/promises');

// Exercise the device-share boundary with actual File objects. Clipboard and download use Chromium itself.
async function checkReferenceHandoff(page, registeredBike, person, item) {
  await page.evaluate(() => {
    window.shareSupport = 'mixed';
    window.sharedFiles = [];
    Object.defineProperties(navigator, {
      canShare: {configurable:true, value: data => data.files?.length > 0 &&
        (window.shareSupport === 'mixed' || (window.shareSupport === 'files' && !data.text))},
      share: {configurable:true, value: async data => {
        if (window.cancelShare) throw new DOMException('cancelled', 'AbortError');
        const files = [];
        for (const file of data.files) {
          const bitmap = await createImageBitmap(file);
          files.push({name:file.name, type:file.type, width:bitmap.width, height:bitmap.height});
          bitmap.close();
        }
        window.sharedFiles.push({files, text:data.text});
      }},
    });
  });
  const button = page.locator('#spot-copy');
  const status = page.locator('#spot-message');
  await page.selectOption('#spot-output','scene1');
  await page.locator('#spot-image').setInputFiles(person);
  await button.filter({hasText:'人物画像とプロンプトを共有'}).waitFor();
  await button.click();
  await page.waitForFunction(() => window.sharedFiles.length === 1);
  const one = await page.evaluate(() => window.sharedFiles[0]);
  assert.ok(one.text.includes(registeredBike) && one.text.includes('今回添えた１枚が人物') &&
    one.text.includes('本文イラスト１だけ') && !/blob:|data:image/.test(one.text));
  assert.equal(one.files[0].name,'atelier-person.png');
  assert.equal(one.files[0].type,'image/png');
  assert.equal(one.files.length,1);
  const preview = await page.locator('#spot-image-preview').evaluate(async img => {await img.decode(); return [img.naturalWidth,img.naturalHeight];});
  assert.deepEqual([one.files[0].width,one.files[0].height],preview);
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), one.text);

  await page.locator('#spot-item-image').setInputFiles(item);
  await button.filter({hasText:'人物と乗り物・小物の画像とプロンプトを共有'}).waitFor();
  await page.evaluate(() => {window.shareSupport='files';});
  await button.click();
  await page.waitForFunction(() => window.sharedFiles.length === 2);
  const two = await page.evaluate(() => window.sharedFiles[1]);
  assert.deepEqual(two.files.map(file => file.name),['atelier-person.png','atelier-item.png']);
  assert.equal(two.text,undefined);
  assert.match(await page.evaluate(() => navigator.clipboard.readText()),/１枚目が人物、２枚目が乗り物・小物/);
  await page.evaluate(() => {window.cancelShare=true;});
  await button.click();
  await status.filter({hasText:'共有を閉じました'}).waitFor();
  assert.equal(await page.locator('.spot-ref-preview:visible').count(),2);

  await page.evaluate(() => {window.shareSupport='none';});
  await page.selectOption('#spot-output','scene2');
  await button.filter({hasText:'人物と乗り物・小物の画像をコピー'}).click();
  await status.filter({hasText:'参照画像をコピーしました'}).waitFor();
  const sheet = await page.evaluate(async () => {
    const [item] = await navigator.clipboard.read();
    const bitmap = await createImageBitmap(await item.getType('image/png'));
    const result = [bitmap.width, bitmap.height];
    bitmap.close();
    return result;
  });
  assert.ok(sheet[0] > two.files[0].width + two.files[1].width && sheet[1] > Math.max(...two.files.map(file=>file.height)));
  const downloadEvent = page.waitForEvent('download');
  await page.click('#spot-save-images');
  const download = await downloadEvent;
  assert.equal(download.suggestedFilename(),'atelier-person-and-item.png');
  const bytes = await readFile(await download.path());
  assert.equal(bytes.toString('ascii',1,4),'PNG');
  assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],sheet);
  await page.click('#spot-copy-text');
  assert.match(await page.evaluate(() => navigator.clipboard.readText()),/本文イラスト２だけ/);

  await page.selectOption('#spot-person','none');
  assert.match(await button.textContent(),/乗り物・小物の画像をコピー/);
  assert.match(await page.inputValue('#spot-text'),/今回添えた１枚が乗り物・小物/);
  await page.click('#spot-article');
  assert.ok(await page.locator('#spot-file-actions').isHidden());
  assert.match(await page.evaluate(() => navigator.clipboard.readText()),/画像は再生成しない/);
  await page.click('#spot-main-prompt');
  await page.locator('#spot-image').setInputFiles(person);
  await button.filter({hasText:'人物と乗り物・小物の画像をコピー'}).waitFor();
  console.log('PASS bicycle prompt with the actual person file, two named image files, share cancellation, real PNG clipboard and download, object-only, article text.');
}

module.exports = {checkReferenceHandoff};
