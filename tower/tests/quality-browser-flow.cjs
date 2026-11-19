const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true, executablePath: process.env.BROWSER_EXECUTABLE || '/usr/bin/chromium', args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 700 } });
    await page.setContent('<main></main>');
    const source = await fs.readFile(path.join(__dirname, '../quality-assist.js'), 'utf8');
    const evidence = await page.evaluate(async source => {
      const moduleUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
      const { bindQualityAssist, inspectImage } = await import(moduleUrl);
      URL.revokeObjectURL(moduleUrl);
      function drawing(width, height, background, rectangle) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (background) { context.fillStyle = background; context.fillRect(0, 0, width, height); }
        if (rectangle) { context.fillStyle = rectangle[0]; context.fillRect(...rectangle.slice(1)); }
        return canvas.toDataURL();
      }
      const empty = await inspectImage(drawing(1280, 650), 'cover');
      const white = await inspectImage(drawing(1280, 650, 'white'), 'cover');
      const silhouette = await inspectImage(drawing(200, 1200, '', ['black', 60, 200, 80, 820]), 'avatar');
      const preview = new Image();
      preview.src = silhouette.preview;
      await preview.decode();

      const state = { urls: [], referenceKey: 'first' };
      let repair;
      const panel = document.querySelector('main');
      const quality = bindQualityAssist(panel, {
        mode: 'spot', getContext: () => state, repair: (...args) => { repair = args; },
      });
      quality.refresh();
      const scene = drawing(1280, 650, 'white', ['black', 150, 200, 30, 40]);
      await quality.accept('scene1', scene);
      await quality.accept('scene2', scene);
      const second = panel.querySelectorAll('.quality-file')[1];
      const note = panel.querySelector('input[placeholder]');
      note.value = '衣装を保ち、右手を直す';
      second.querySelector('button').click();
      const duplicateRepair = repair;
      await quality.accept('scene2', drawing(1280, 650, 'white', ['black', 690, 270, 30, 40]));
      const sparseErrors = quality.problems(['scene1', 'scene2']);
      const similar = second.querySelector('p').textContent;
      await quality.accept('cover', drawing(1280, 650, 'navy', ['yellow', 40, 85, 890, 250]));
      const article = panel.querySelector('textarea');
      const title = panel.querySelector('input[maxlength="100"]');
      title.value = '  街の一枚  ';
      article.value = ['# 街の一枚', 'カフェの窓から運河を見ました。', '企画主・無名S note', '［ここに街のイラスト１］',
        '［ここに街のイラスト２］', '#無名Sプロンプト'].join('\n');
      article.dispatchEvent(new Event('input'));
      const checks = [...panel.querySelectorAll('input[type="checkbox"]')];
      for (const check of checks) check.click();
      const copy = [...panel.querySelectorAll('button')].at(-1);
      const approved = !copy.disabled;
      state.referenceKey = 'second';
      quality.refresh();
      const invalidated = copy.disabled && checks.every(check => !check.checked);
      await quality.accept('scene2', 'data:image/png;base64,AAAA');
      second.querySelector('button').click();
      return {
        blank: empty.errors, white: white.errors, silhouette: silhouette.errors,
        preview: [preview.naturalWidth, preview.naturalHeight], duplicateRepair,
        sparseErrors, similar, approved, invalidated, title: quality.articleTitle, failedRepair: repair,
      };
    }, source);
    assert.match(evidence.blank.join(), /透明/);
    assert.match(evidence.white.join(), /一色/);
    assert.deepEqual(evidence.silhouette, []);
    assert.deepEqual(evidence.preview, [40, 240]);
    assert.equal(evidence.duplicateRepair[0], 'scene2');
    assert.match(evidence.duplicateRepair[2], /本文イラスト１と同じ画像/);
    assert.match(evidence.duplicateRepair[2], /衣装を保ち、右手を直す/);
    assert.deepEqual(evidence.sparseErrors, []);
    assert.match(evidence.similar, /似ています/);
    assert.equal(evidence.approved, true);
    assert.equal(evidence.invalidated, true);
    assert.equal(evidence.title, '街の一枚');
    assert.match(evidence.failedRepair[2], /画像を読み取れません/);
    console.log('PASS Chromium artwork inspection, reference replacement, original style review, sparse drawings, article approval and targeted repair');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
