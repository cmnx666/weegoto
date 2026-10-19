import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { EEG_ELECTRODES } from '../src/lib/eeg-electrodes.mjs';
const root=path.resolve('dist');
const files=[];
function walk(dir) { for(const item of fs.readdirSync(dir,{withFileTypes:true})) { const file=path.join(dir,item.name); if(item.isDirectory())walk(file);else if(file.endsWith('.html'))files.push(file); } }
walk(root);
const errors=[];
for(const file of files) {
  const html=fs.readFileSync(file,'utf8');
  for(const match of html.matchAll(/\b(?:href|src)="(\/[^"#?]*)/g)) {
    if(match[1].startsWith('//'))continue;
    const target=path.join(root,decodeURIComponent(match[1]));
    if(!fs.existsSync(target)&&!fs.existsSync(path.join(target,'index.html'))) errors.push(`${path.relative(root,file)}: ${match[1]}`);
  }
  for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if(!/\bsrc=/.test(match[1])&&!/type="application\/(?:json|ld\+json)"/.test(match[1])&&match[2].trim()) {
      const hash = createHash('sha256').update(match[2]).digest('base64');
      if(!html.includes(`sha256-${hash}`)) errors.push(`${file}: inline script missing CSP hash`);
    }
  }
}
const homepage=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sites=[...homepage.matchAll(/\bdata-eeg="([^"]+)"/g)].map(match=>match[1]);
if(sites.length!==19||new Set(sites).size!==19||EEG_ELECTRODES.some(e=>!sites.includes(e.name)))errors.push('Homepage must contain exactly 19 named EEG targets');
if(errors.length)throw new Error(errors.join('\n'));
console.log(`Built site checked: ${files.length} HTML files, no missing local targets or CSP-blocked inline scripts.`);
