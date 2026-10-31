import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { compile as markdown } from 'mdsvex';
import { compile as svelte } from 'svelte/compiler';
import ts from 'typescript';
import { render } from 'svelte/server';

const root = path.dirname(new URL(import.meta.url).pathname);
const output = path.join(root, '.render');
await fs.mkdir(output, { recursive: true });
const built = new Map();

async function build(file) {
  if (built.has(file)) return built.get(file);
  const target = path.join(output, `${built.size}.mjs`);
  built.set(file, target);
  let source = await fs.readFile(file, 'utf8');
  if (file.endsWith('locales.ts')) {
    const dir = path.join(root, 'src/lib/data/tenants');
    const tenants = await Promise.all((await fs.readdir(dir)).sort().map(async (name) =>
      JSON.parse(await fs.readFile(path.join(dir, name), 'utf8'))));
    // Resolve the export's build-time tenant glob without changing its source.
    source = source.replace(/Object\.values\(import\.meta\.glob<Tenant>\([^\n]+\)\)/, JSON.stringify(tenants));
  }
  if (file.endsWith('.json')) {
    source = `export default ${source};`;
  } else if (file.endsWith('.svx')) {
    source = (await markdown(source)).code;
    source = svelte(source, { filename: file, generate: 'server', css: 'injected' }).js.code;
  } else if (file.endsWith('.svelte')) {
    source = svelte(source, { filename: file, generate: 'server', css: 'injected' }).js.code;
  } else {
    source = ts.transpileModule(source, { compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
    } }).outputText;
  }
  for (const match of [...source.matchAll(/(['"])(#lib\/[^'"\n]+)\1/g)]) {
    let dependency = path.join(root, 'src/lib', match[2].slice(5));
    if (!path.extname(dependency)) dependency += '.ts';
    const resolved = pathToFileURL(await build(dependency)).href;
    source = source.replaceAll(`${match[1]}${match[2]}${match[1]}`, JSON.stringify(resolved));
  }
  await fs.writeFile(target, source);
  return target;
}

const pagePath = path.join(root, 'src/routes/kb/incidents/4471-review/+page.svx');
const page = await import(pathToFileURL(await build(pagePath)));
await build(path.join(root, 'src/lib/layouts/runbook.svelte'));
const wrapperPath = path.join(output, 'wrapper.mjs');
const wrapper = svelte(`<script>
  import Page from ${JSON.stringify(pathToFileURL(built.get(pagePath)).href)};
  import Layout from ${JSON.stringify(pathToFileURL(built.get(path.join(root, 'src/lib/layouts/runbook.svelte'))).href)};
  let { metadata } = $props();
</script>
<Layout {...metadata}><Page /></Layout>`, { generate: 'server', css: 'injected' });
await fs.writeFile(wrapperPath, wrapper.js.code);
const { default: Review } = await import(pathToFileURL(wrapperPath));
const result = render(Review, { props: { metadata: page.metadata } });
const refModule = await import(pathToFileURL(await build(path.join(root, 'src/lib/kb/desk-ref.ts'))));
const ref = refModule.deskRef(page.metadata.signature);
assert.ok(result.body.includes(ref), 'Rendered course signature stamp is missing');
for (const count of ['412', '379', '33']) assert.ok(result.body.includes(count), `Missing computed count ${count}`);
assert.ok(result.body.includes('Closed as completed'));
assert.ok(result.body.includes('Closed as not planned'));
assert.ok(result.body.includes('same cause'));
assert.ok(result.body.includes('03-30'));
const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${result.head}<style>.kb{overflow-wrap:anywhere}table{display:block;overflow-x:auto}input{max-width:100%;box-sizing:border-box}</style></head><body>${result.body}</body></html>\n`;
await fs.writeFile(path.join(root, '4471-review.html'), html);
console.log(`Rendered 4471-review.html from the actual KB components; counts and desk stamp verified (${ref}).`);
console.log('This is a static server-rendered snapshot; explorer inputs do not hydrate.');
