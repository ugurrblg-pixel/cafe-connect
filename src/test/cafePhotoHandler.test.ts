import {Blob as ServerBlob} from 'node:buffer';
import {readFileSync} from 'node:fs';
import {transpileModule,ModuleKind,ScriptTarget} from 'typescript';
import {expect,it,vi} from 'vitest';
const code=transpileModule(readFileSync('supabase/functions/cafe-photo/index.ts','utf8').replace(/^import[^\n]*\n/gm,''),{compilerOptions:{target:ScriptTarget.ES2022,module:ModuleKind.None}}).outputText;
const viewer='11111111-1111-4111-8111-111111111111',owner='22222222-2222-4222-8222-222222222222',cafe='33333333-3333-4333-8333-333333333333',path=owner+'/44444444-4444-4444-8444-444444444444.webp';
function harness(options:{allowed?:boolean;enabled?:boolean;changed?:boolean;invalidSession?:boolean}={}){
 let handler!:(req:Request)=>Promise<Response>;
 const rpc=vi.fn().mockResolvedValueOnce({data:options.allowed===false?null:'object',error:null}).mockResolvedValue({data:options.changed?'different':'object',error:null});
 const download=vi.fn().mockResolvedValue({data:new ServerBlob(['synthetic'],{type:'image/webp'}),error:null});
 new Function('Deno','createClient',code)({serve:(fn:typeof handler)=>handler=fn,env:{get:(key:string)=>key==='CAFE_PHOTOS_ENABLED'?(options.enabled===false?'false':'true'):'mock'}},()=>({auth:{getUser:async()=>({data:{user:options.invalidSession?null:{id:viewer}},error:null})},rpc,storage:{from:()=>({download})}}));
 const request=(mode='image',auth=true,extra={})=>handler(new Request('https://test.invalid',{method:'POST',headers:auth?{Authorization:'Bearer session'}:{},body:JSON.stringify({mode,cafeId:cafe,photoPath:path,...extra})}));return {request,rpc,download,handler};
}
it('requires a real user session and never downloads for anonymous/invalid sessions',async()=>{for(const h of [harness(),harness({invalidSession:true})]){expect((await h.request('image',false)).status).toBe(401);expect(h.download).not.toHaveBeenCalled();}const h=harness({invalidSession:true});expect((await h.request()).status).toBe(401);expect(h.rpc).not.toHaveBeenCalled();});
it('uses authenticated caller id, not a forged viewer id',async()=>{const h=harness();await h.request('authorize',true,{viewer_id:owner});expect(h.rpc).toHaveBeenCalledWith('authorize_current_cafe_photo',{viewer_id:viewer,target_cafe_id:cafe,photo_path:path});expect(h.download).not.toHaveBeenCalled();});
it('rejects disabled, denied and malformed requests before reading storage',async()=>{for(const opts of [{enabled:false},{allowed:false}]){const h=harness(opts);expect((await h.request()).ok).toBe(false);expect(h.download).not.toHaveBeenCalled();}const h=harness();expect((await h.request('image',true,{photoPath:'verification-selfies/other.jpg'})).status).toBe(400);expect(h.download).not.toHaveBeenCalled();});
it('returns image bytes without a reusable public URL and prevents caching',async()=>{const h=harness();const response=await h.request();expect(response.status).toBe(200);expect(response.headers.get('Content-Type')).toBe('image/webp');expect(response.headers.get('Cache-Control')).toBe('no-store, private');expect(h.rpc).toHaveBeenCalledTimes(2);});
it('rechecks access/object identity after download to close checkout/block/object replacement races',async()=>{const h=harness({changed:true});expect((await h.request()).status).toBe(403);});
it('accepts SDK CORS headers but not other HTTP methods',async()=>{const h=harness();const response=await h.handler(new Request('https://test.invalid',{method:'OPTIONS'}));expect(response.headers.get('Access-Control-Allow-Headers')).toContain('x-supabase-client-platform');expect((await h.handler(new Request('https://test.invalid'))).status).toBe(405);expect(h.rpc).not.toHaveBeenCalled();});
