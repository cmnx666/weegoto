import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const commit = execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const dirty = execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim().length > 0;
fs.writeFileSync('dist/release.json', JSON.stringify({commit,dirty,builtAt:new Date().toISOString()},null,2)+'\n');
