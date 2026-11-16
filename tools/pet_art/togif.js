// Render animated SVGs to frame PNGs at fixed times (deterministic), then ffmpeg -> GIF.
// usage: node togif.js <svgdir> <framedir> [id ...]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const [, , svgdir, framedir, ...only] = process.argv;
const FPS = 20, LOOP = 2.4, N = Math.round(FPS * LOOP);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 400, height: 400 }, deviceScaleFactor: 1 });
  const files = fs.readdirSync(svgdir).filter(f => f.endsWith('_shining_anim.svg'))
    .filter(f => !only.length || only.some(o => f === `pet_${o}_shining_anim.svg`));
  for (const f of files) {
    const id = f.replace('pet_', '').replace('_shining_anim.svg', '');
    const dir = path.join(framedir, id); fs.mkdirSync(dir, { recursive: true });
    await p.setContent(`<html><body style="margin:0;background:#14122B">${fs.readFileSync(path.join(svgdir, f), 'utf8')}</body></html>`);
    for (let i = 0; i < N; i++) {
      await p.evaluate(t => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = t; } }, (i / FPS) * 1000);
      await p.screenshot({ path: path.join(dir, String(i).padStart(3, '0') + '.png'), clip: { x: 0, y: 0, width: 400, height: 400 } });
    }
  }
  await b.close();
})();
