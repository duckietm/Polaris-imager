import express from 'express';
import { writeFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { CONFIG } from '../src/config.mjs';
import { createGenerateRouter } from '../src/generate-route.mjs';

const app = express();
app.use('/Generate', createGenerateRouter(CONFIG));

const srv = app.listen(0, async () => {
  const B = 'http://127.0.0.1:' + srv.address().port + '/Generate';
  let bad = 0;

  for (const [name, path] of [['panel', ''], ['scene', '/scene']]) {
    const html = await (await fetch(B + path)).text();
    const js = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n;\n');
    const file = '/tmp/emitted-' + name + '.js';
    writeFileSync(file, js);

    try {
      execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
      console.log('ok    ' + name + ' page JS parses (' + js.length + ' chars)');
    } catch (e) {
      bad++;
      console.log('FAIL  ' + name + ' page JS:', String(e.stderr).split('\n').slice(0, 4).join(' | '));
    }
  }

  srv.close();
  process.exit(bad ? 1 : 0);
});
