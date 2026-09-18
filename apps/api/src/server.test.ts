import { it, expect } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { reviewServer } from './server';
it('requires local session and same-origin JSON before any review mutation',async()=>{
  const root=await mkdtemp(join(tmpdir(),'concierge-http-test-'));
  await mkdir(join(root,'apps/review-desk/dist'),{recursive:true});await writeFile(join(root,'apps/review-desk/dist/index.html'),'<h1>Review desk</h1>');
  const server=reviewServer(root,0);
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const addr=server.address();if(!addr || typeof addr==='string')throw new Error('Expected TCP address');
  const base='http://127.0.0.1:'+addr.port;
  try {
    expect((await fetch(base+'/api/reviews')).status).toBe(401);
    const page=await fetch(base);expect(page.status).toBe(200);
    const cookie=page.headers.get('set-cookie')!.split(';')[0];
    expect(page.headers.get('set-cookie')).toContain('HttpOnly; SameSite=Strict');
    expect((await fetch(base+'/api/reviews',{method:'POST',headers:{cookie,origin:'https://example.invalid','content-type':'application/json'},body:'{}'})).status).toBe(403);
    expect((await fetch(base+'/api/reviews',{method:'POST',headers:{cookie,'content-type':'application/json'},body:'{}'})).status).toBe(403);
  } finally {await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));await rm(root,{recursive:true,force:true});}
});
