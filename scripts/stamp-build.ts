import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, relative, sep } from 'node:path';
const root=resolve('apps/concierge/dist');
const version=JSON.parse(await readFile(resolve(root,'version.json'),'utf8'));
const files:Record<string,string>={};
async function visit(dir:string) {
  for(const entry of await readdir(dir,{withFileTypes:true})) {
    const path=resolve(dir,entry.name);
    if(entry.isSymbolicLink())throw new Error('Public output cannot contain symlinks.');
    if(entry.isDirectory())await visit(path);
    else if(entry.name!=='build-manifest.json')files[relative(root,path).split(sep).join('/')]=createHash('sha256').update(await readFile(path)).digest('hex');
  }
}
await visit(root);
await writeFile(resolve(root,'build-manifest.json'),JSON.stringify({commit:version.commit,files},null,2)+'\n');
console.log('Stamped '+Object.keys(files).length+' public files.');
