import {readFileSync} from 'node:fs';
import {transpileModule,ModuleKind,ScriptTarget} from 'typescript';
import {expect,it,vi} from 'vitest';
const code=transpileModule(readFileSync('supabase/functions/delete-account/index.ts','utf8').replace(/^import[^\n]*\n/gm,''),{compilerOptions:{target:ScriptTarget.ES2022,module:ModuleKind.None}}).outputText;
const id='11111111-1111-4111-8111-111111111111';
function harness(options:{invalid?:boolean;old?:boolean;disabled?:boolean;storageError?:boolean;authError?:boolean;prepareError?:boolean;badPath?:boolean;endless?:boolean}={}){
 let handler!:(req:Request)=>Promise<Response>;
 const files=[{bucket:'avatars',path:(options.badPath?'another':id)+'/one.webp'}];
 const rpc=vi.fn().mockResolvedValueOnce({data:files,error:options.prepareError?{}:null}).mockResolvedValue({data:options.endless?files:[],error:null});
 const remove=vi.fn().mockResolvedValue({error:options.storageError?{}:null});
 const deleteUser=vi.fn().mockResolvedValue({error:options.authError?{}:null});
 new Function('Deno','createClient',code)({serve:(fn:typeof handler)=>handler=fn,env:{get:(key:string)=>key==='ACCOUNT_DELETION_ENABLED'?(options.disabled?'false':'true'):'mock'}},()=>({auth:{getUser:async()=>({data:{user:options.invalid?null:{id,last_sign_in_at:new Date(Date.now()-(options.old?3600000:0)).toISOString()}},error:null}),admin:{deleteUser}},rpc,storage:{from:()=>({remove})}}));
 const request=(body:object={confirmation:'SİL',deleteOwnMessages:true},auth=true)=>handler(new Request('https://test.invalid',{method:'POST',headers:auth?{Authorization:'Bearer session'}:{},body:JSON.stringify(body)}));
 return {handler,request,rpc,remove,deleteUser};
}
it('requires authenticated recent sign-in and an enabled server flag before mutation',async()=>{
 for(const options of [{invalid:true},{old:true},{disabled:true}]){const h=harness(options);expect((await h.request()).ok).toBe(false);expect(h.rpc).not.toHaveBeenCalled();expect(h.deleteUser).not.toHaveBeenCalled();}
 const h=harness();expect((await h.request({},false)).status).toBe(401);expect(h.rpc).not.toHaveBeenCalled();
});
it('requires the exact destructive confirmation and own-message decision',async()=>{const h=harness();for(const body of [{confirmation:'SİL'},{confirmation:'sil',deleteOwnMessages:true}])expect((await h.request(body)).status).toBe(400);expect(h.rpc).not.toHaveBeenCalled();});
it('ignores forged user ids, removes own storage first, then hard deletes the validated user',async()=>{const h=harness();const response=await h.request({confirmation:'SİL',deleteOwnMessages:true,user_id:'another'});expect(response.status).toBe(200);expect(await response.json()).toEqual({deleted:true});expect(h.rpc).toHaveBeenCalledWith('prepare_account_deletion',{target_user_id:id});expect(h.remove).toHaveBeenCalledWith([id+'/one.webp']);expect(h.deleteUser).toHaveBeenCalledWith(id,false);expect(h.remove.mock.invocationCallOrder[0]).toBeLessThan(h.deleteUser.mock.invocationCallOrder[0]);expect(response.headers.get('Cache-Control')).toContain('no-store');});
it('does not delete auth or claim success when storage removal fails',async()=>{const h=harness({storageError:true});const response=await h.request();expect(response.status).toBe(503);expect((await response.json()).code).toBe('incomplete');expect(h.deleteUser).not.toHaveBeenCalled();});
it('does not claim success on preparation or auth cleanup errors',async()=>{for(const options of [{prepareError:true},{authError:true}]){const h=harness(options);expect((await h.request()).status).toBe(503);}});
it('rejects paths outside the validated account and bounds cleanup attempts',async()=>{const h=harness({badPath:true});expect((await h.request()).status).toBe(503);expect(h.remove).not.toHaveBeenCalled();expect(h.deleteUser).not.toHaveBeenCalled();const busy=harness({endless:true});expect((await busy.request()).status).toBe(503);expect(busy.rpc).toHaveBeenCalledTimes(10);expect(busy.deleteUser).not.toHaveBeenCalled();});
it('accepts preflight without mutation and rejects GET',async()=>{const h=harness();expect((await h.handler(new Request('https://test.invalid',{method:'OPTIONS'}))).status).toBe(200);expect((await h.handler(new Request('https://test.invalid'))).status).toBe(405);expect(h.rpc).not.toHaveBeenCalled();});
