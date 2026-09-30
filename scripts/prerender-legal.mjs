import { readFile, writeFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });

try {
  const { legalRoutes } = await server.ssrLoadModule('/src/legalRoutes.ts');
  const template = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');

  for (const [pathname, route] of Object.entries(legalRoutes)) {
    const content = renderToString(createElement(route.component));
    const html = template
      .replace('<div id="root"></div>', `<div id="root">${content}</div>`)
      .replace(/<title>[^<]*<\/title>/, `<title>${route.title}</title>`)
      .replace(/(<meta name="description" content=")[^"]*("\s*\/>)/, `$1${route.description}$2`);

    if (!html.includes(`<div id="root">${content}</div>`) || !html.includes(`<title>${route.title}</title>`) || !html.includes(route.description)) {
      throw new Error(`Could not prerender ${pathname}`);
    }
    await writeFile(new URL(`../dist${pathname}.html`, import.meta.url), html, 'utf8');
    process.stdout.write(`Prerendered ${pathname}\n`);
  }
} finally {
  await server.close();
}
