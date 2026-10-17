import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = {
 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Methods':'POST, OPTIONS',
 'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
 'Cache-Control':'no-store, private', 'X-Content-Type-Options':'nosniff',
};
const reply=(body:object,status:number)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return reply({error:'POST required'},405);
 try{
  const token=req.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if(!token)return reply({error:'Sign in required'},401);
  const url=Deno.env.get('SUPABASE_URL'), key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!key)return reply({error:'Unavailable'},503);
  const client=createClient(url,key);
  const {data:{user},error}=await client.auth.getUser(token);
  if(error||!user)return reply({error:'Sign in required'},401);
  if(Deno.env.get('CAFE_PHOTOS_ENABLED')!=='true')return reply({error:'Unavailable'},503);
  let body;try{body=await req.json();}catch{return reply({error:'Invalid request'},400);}
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const path=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/i;
  if(typeof body?.cafeId!=='string'||!uuid.test(body.cafeId)||typeof body?.photoPath!=='string'||!path.test(body.photoPath)||!['authorize','image'].includes(body.mode))return reply({error:'Invalid request'},400);
  const args={viewer_id:user.id,target_cafe_id:body.cafeId,photo_path:body.photoPath};
  const {data:objectId,error:denied}=await client.rpc('authorize_current_cafe_photo',args);
  if(denied)return reply({error:'Unavailable'},503);
  if(!objectId)return reply({error:'Photo unavailable'},403);
  if(body.mode==='authorize')return reply({objectId},200);
  const {data:photo,error:downloadError}=await client.storage.from('avatars').download(body.photoPath);
  if(downloadError||!photo||photo.type!=='image/webp'||photo.size>5*1024*1024)return reply({error:'Photo unavailable'},404);
  // Recheck after download: checkout/block/delete/recreated objects cannot race the first check.
  const {data:currentId,error:recheckError}=await client.rpc('authorize_current_cafe_photo',args);
  if(recheckError||currentId!==objectId)return reply({error:'Photo unavailable'},403);
  return new Response(photo,{headers:{...cors,'Content-Type':'image/webp'}});
 }catch{return reply({error:'Unavailable'},503);}
});
