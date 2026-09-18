import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname, resolve, relative, isAbsolute } from 'node:path';
import { ReviewService } from './review';

export function reviewServer(root:string, port=4174) {
  const service=new ReviewService(root), session=randomBytes(32).toString('hex');
  const hostname='127.0.0.1';
  function json(response:ServerResponse,status:number,value:unknown) {
    response.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});response.end(JSON.stringify(value));
  }
  async function body(request:IncomingMessage) {
    const chunks:Buffer[]=[];let size=0;
    for await(const chunk of request){size+=chunk.length;if(size>32_768)throw new Error('Review request is too large.');chunks.push(chunk);}
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }
  const server=createServer(async(request,response)=>{
    const address=server.address();
    const boundPort=address && typeof address==='object' ? address.port : port;
    const origin='http://'+hostname+':'+boundPort;
    if(request.headers.host!==hostname+':'+boundPort){json(response,403,{error:'Use the local review address.'});return;}
    if(request.headers.origin && request.headers.origin!==origin){json(response,403,{error:'Cross-site requests are not allowed.'});return;}
    const pathname=new URL(request.url || '/',origin).pathname;
    const rawCookie=request.headers.cookie?.split('; ').find(v=>v.startsWith('concierge_session='))?.split('=')[1]??'';
    const valid=/^[a-f0-9]{64}$/.test(rawCookie) && timingSafeEqual(Buffer.from(rawCookie),Buffer.from(session));
    try {
      if(pathname.startsWith('/api/')) {
        if(!valid){json(response,401,{error:'Open the review desk to begin a local session.'});return;}
        if(request.method==='GET' && pathname==='/api/reviews') {json(response,200,await service.state());return;}
        if(request.method==='POST' && pathname==='/api/reviews') {
          if(request.headers.origin!==origin || request.headers['content-type']!=='application/json'){json(response,403,{error:'A same-origin JSON review request is required.'});return;}
          json(response,200,await service.decide(await body(request)));return;
        }
        json(response,404,{error:'This API route is not available.'});return;
      }
      if(request.method!=='GET'){json(response,405,{error:'Method not allowed.'});return;}
      const dist=resolve(root,'apps/review-desk/dist');
      const file=resolve(dist,'.'+decodeURIComponent(pathname==='/'?'/index.html':pathname));
      const rel=relative(dist,file);
      if(rel.startsWith('..') || isAbsolute(rel)){json(response,403,{error:'Invalid file path.'});return;}
      const content=await readFile(file);
      const types:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
      response.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",'Set-Cookie':'concierge_session='+session+'; HttpOnly; SameSite=Strict; Path=/'});
      response.end(content);
    } catch(error) {json(response,400,{error:error instanceof Error ? error.message:'The request could not be completed.'});}
  });
  return server;
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/apps/api/src/server.ts')) {
  const server=reviewServer(process.cwd());
  server.listen(4174,'127.0.0.1',()=>console.log('Review desk: http://127.0.0.1:4174 (local access only)'));
}
