import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Methods':'POST, OPTIONS',
 'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
 'Cache-Control':'no-store, private',
};
const reply=(body:object,status:number)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return reply({error:'POST required'},405);
 let started=false;
 try{
  const token=req.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if(!token)return reply({error:'Sign in required',code:'sign_in_required'},401);
  const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!key)return reply({error:'Unavailable'},503);
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error}=await client.auth.getUser(token);
  if(error||!user)return reply({error:'Sign in required',code:'sign_in_required'},401);
  if(Deno.env.get('ACCOUNT_DELETION_ENABLED')!=='true')return reply({error:'Unavailable',code:'unavailable'},503);
  let body;try{body=await req.json();}catch{return reply({error:'Invalid request'},400);}
  if(body?.confirmation!=='SİL'||body?.deleteOwnMessages!==true)return reply({error:'Explicit deletion confirmation required'},400);
  // Use server-authenticated sign-in time, never refresh-token issuance or a client claim.
  const signedIn=Date.parse(user.last_sign_in_at||'');
  if(!Number.isFinite(signedIn)||Date.now()-signedIn>10*60*1000||signedIn>Date.now()+60000)return reply({error:'Sign in again before deleting',code:'reauth_required'},401);
  for(let batch=0;batch<10;batch++){
   const {data:files,error:prepareError}=await client.rpc('prepare_account_deletion',{target_user_id:user.id});
   if(prepareError||!Array.isArray(files))return reply({error:'Deletion incomplete',code:started?'incomplete':'unavailable'},503);
   started=true;
   if(files.length===0){
    const {error:deleteError}=await client.auth.admin.deleteUser(user.id,false);
    if(deleteError)return reply({error:'Deletion incomplete',code:'incomplete'},503);
    return reply({deleted:true},200);
   }
   for(const bucket of ['avatars','verification-selfies']){
    const paths=files.filter(f=>f.bucket===bucket).map(f=>f.path);
    if(paths.some(path=>typeof path!=='string'||!path.startsWith(user.id+'/'))||files.some(f=>!['avatars','verification-selfies'].includes(f.bucket)))return reply({error:'Deletion incomplete',code:'incomplete'},503);
    if(paths.length){const {error:removeError}=await client.storage.from(bucket).remove(paths);if(removeError)return reply({error:'Deletion incomplete',code:'incomplete'},503);}
   }
  }
  return reply({error:'Deletion incomplete',code:'incomplete'},503);
 }catch{return reply({error:'Deletion unavailable',code:started?'incomplete':'unavailable'},503);}
});
