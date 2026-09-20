import { createHash, randomUUID } from 'node:crypto';
import { mkdir, realpath, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve } from 'node:path';

/** Kernel ownership survives neither a crash nor forced termination; the file is diagnostic only. */
export async function acquireScanLock(root:string):Promise<() => Promise<void>> {
  const canonical=await realpath(root);
  const key=process.platform==='win32' ? canonical.toLowerCase() : canonical;
  const port=49152 + createHash('sha256').update(key).digest().readUInt16BE(0) % 16384;
  const server=createServer(socket=>socket.destroy());
  const close=()=>new Promise<void>((done,reject)=>server.close(error=>error ? reject(error) : done()));
  await new Promise<void>((done,reject)=>{
    const failed=(cause:NodeJS.ErrnoException)=>{
      const error=new Error('A scan already owns this workspace lock, or its local lock port '+port+' is unavailable.',{cause});
      Object.assign(error,{code:cause.code==='EADDRINUSE' ? 'EEXIST' : cause.code});
      reject(error);
    };
    server.once('error',failed);
    server.listen({host:'127.0.0.1',port,exclusive:true},()=>{server.off('error',failed);server.unref();done();});
  });
  const lockPath=resolve(canonical,'.data/scan.lock');
  try {
    await mkdir(resolve(canonical,'.data'),{recursive:true});
    // Exclusive kernel ownership makes replacement of an interrupted owner's file race-free.
    await writeFile(lockPath,JSON.stringify({pid:process.pid,token:randomUUID(),port,startedAt:new Date().toISOString()})+'\n');
  } catch(error) {await close();throw error;}
  return async()=>{
    try {await rm(lockPath,{force:true});}
    finally {await close();}
  };
}
