import fs from 'node:fs/promises';
import path from 'node:path';

const version = process.argv[2];
if (!version || !/^[a-zA-Z0-9._-]+$/.test(version)) {
  throw new Error('Usage: node hack/cache-bust.mjs <release-version> [output-directory]');
}
const root = process.argv[3] || '_site';
let pages = 0;
async function visit(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await visit(file);
    else if (entry.isFile() && entry.name.endsWith('.html')) {
      const html = await fs.readFile(file, 'utf8');
      const updated = html.replace(/\b(href|src)="([^"\s]+\.(?:css|js)(?:\?[^"\s]*)?)"/g, (match, attribute, value) => {
        if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value)) return match;
        const [asset, query = ''] = value.split('?');
        const params = new URLSearchParams(query.replaceAll('&amp;', '&'));
        params.set('v', version);
        return `${attribute}="${asset}?${params.toString().replaceAll('&', '&amp;')}"`;
      });
      await fs.writeFile(file, updated);
      pages++;
    }
  }
}
await visit(root);
console.log(`Versioned local CSS and JavaScript on ${pages} pages: ${version}`);
