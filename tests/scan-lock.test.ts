import { afterEach, beforeEach, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:net';
import { acquireScanLock } from '../scripts/scan-lock';
let root:string;
beforeEach(async()=>{root=await mkdtemp(join(tmpdir(),'concierge-lock-test-'));await mkdir(join(root,'.data'));});
afterEach(async()=>{await rm(root,{recursive:true,force:true});});
it('recovers legacy empty and stale metadata files without treating them as live owners',async()=>{
  for(const stale of ['',JSON.stringify({pid:2147483647,token:'stale'})]) {
    await writeFile(join(root,'.data/scan.lock'),stale);
    const release=await acquireScanLock(root);
    try {expect(JSON.parse(await readFile(join(root,'.data/scan.lock'),'utf8')).pid).toBe(process.pid);}
    finally {await release();}
  }
});
it('allows only one concurrent recovery and cannot unlink the active owner metadata',async()=>{
  await writeFile(join(root,'.data/scan.lock'),'');
  const contenders=await Promise.allSettled([acquireScanLock(root),acquireScanLock(root)]);
  expect(contenders.filter(v=>v.status==='fulfilled')).toHaveLength(1);
  const winner=contenders.find(v=>v.status==='fulfilled') as PromiseFulfilledResult<()=>Promise<void>>;
  try {
    const owner=await readFile(join(root,'.data/scan.lock'),'utf8');
    await expect(acquireScanLock(root)).rejects.toMatchObject({code:'EEXIST'});
    expect(await readFile(join(root,'.data/scan.lock'),'utf8')).toBe(owner);
  } finally {await winner.value();}
  const release=await acquireScanLock(root);await release();
});
it('fails closed on an unrelated port collision without touching evidence or stale metadata',async()=>{
  const release=await acquireScanLock(root);
  const {port}=JSON.parse(await readFile(join(root,'.data/scan.lock'),'utf8'));
  await release();
  const occupied=createServer(socket=>socket.destroy());
  await new Promise<void>((done,reject)=>{occupied.once('error',reject);occupied.listen({host:'127.0.0.1',port,exclusive:true},done);});
  await writeFile(join(root,'.data/scan.lock'),'legacy metadata');
  await writeFile(join(root,'.data/assessments.json'),'existing evidence');
  try {
    await expect(acquireScanLock(root)).rejects.toMatchObject({code:'EEXIST'});
    expect(await readFile(join(root,'.data/scan.lock'),'utf8')).toBe('legacy metadata');
    expect(await readFile(join(root,'.data/assessments.json'),'utf8')).toBe('existing evidence');
  } finally {await new Promise<void>((done,reject)=>occupied.close(error=>error ? reject(error) : done()));}
});
it('automatically recovers after the owning process is forcibly terminated',async()=>{
  const module=pathToFileURL(resolve('scripts/scan-lock.ts')).href;
  const source='import { acquireScanLock } from '+JSON.stringify(module)+'; await acquireScanLock(process.argv[1]); setInterval(()=>{},1000); process.stdout.write("ready\\n");';
  const child=spawn(process.execPath,['--import','tsx','--input-type=module','-e',source,root],{stdio:['ignore','pipe','pipe'],windowsHide:true});
  const exited=once(child,'exit');
  try {
    await Promise.race([
      once(child.stdout!,'data').then(([chunk])=>{expect(String(chunk)).toContain('ready');}),
      exited.then(()=>{throw new Error('Lock owner exited before acquiring its lock.');}),
    ]);
    await expect(acquireScanLock(root)).rejects.toMatchObject({code:'EEXIST'});
    child.kill('SIGKILL');await exited;
    expect(JSON.parse(await readFile(join(root,'.data/scan.lock'),'utf8')).pid).toBe(child.pid);
    const release=await acquireScanLock(root);
    try {expect(JSON.parse(await readFile(join(root,'.data/scan.lock'),'utf8')).pid).toBe(process.pid);}
    finally {await release();}
  } finally {if(child.exitCode===null && child.signalCode===null){child.kill('SIGKILL');await exited;}}
},15000);
