const express = (await import('express')).default;
const { CONFIG } = await import('./src/config.mjs');
const { createGenerateRouter } = await import('./src/generate-route.mjs');
const app = express();
app.use('/Generate', createGenerateRouter(CONFIG));
const srv = app.listen(0, async () => {
  const html = await (await fetch('http://127.0.0.1:' + srv.address().port + '/Generate/scene')).text();
  const { writeFileSync } = await import('fs');
  const js = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n;\n');
  writeFileSync('/tmp/scene2.js', js);
  const checks = {
    'no select() redraw in drag': !/function startDrag[\s\S]{0,400}?draw\(\);/.test(js),
    'markSelected exists': js.includes('function markSelected'),
    'dataset.idx set': js.includes("node.dataset.idx = index"),
    'pointercancel handled': js.includes('pointercancel'),
    'inner flip wrapper': js.includes("inner.style.transform = 'scaleX(-1)'"),
    'bubble element': js.includes("bubble.className = 'bub'"),
    'text no longer sent to imager': !/p\.text = layer\.text/.test(js),
    'drawBubble in export': js.includes('drawBubble(ctx, layer, image.width)')
  };
  Object.entries(checks).forEach(([k, v]) => console.log((v ? 'ok  ' : 'FAIL') + '  ' + k));
  srv.close();
});
