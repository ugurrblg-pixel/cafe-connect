import { expect,it } from 'vitest';
import { inactiveEndpoint } from '../../supabase/functions/_shared/inactiveEndpoint';
import { initializeBilling,purchaseSubscription,purchaseBoost } from '../lib/billing/nativeBilling';
it('does not initialize a store or begin an unverified purchase',async()=>{
 expect(await initializeBilling()).toBe(false);
 expect(await purchaseSubscription('test-product','test-user')).toMatchObject({success:false,error:'Ödeme özelliği henüz kullanıma açılmadı.'});
 expect(await purchaseBoost('test-product','test-user')).toMatchObject({success:false,error:'Ödeme özelliği henüz kullanıma açılmadı.'});
});
it('rejects payment and push work without reading attacker-supplied input',async()=>{
 const request={method:'POST',json:()=>{throw new Error('Must not read payment or recipient payload');}} as unknown as Request;
 const response=inactiveEndpoint(request);
 expect(response.status).toBe(503);
 expect(await response.json()).toMatchObject({code:'FEATURE_UNAVAILABLE'});
 expect(response.headers.get('cache-control')).toBe('no-store');
});
it('handles preflight without enabling the service',()=>{
 expect(inactiveEndpoint({method:'OPTIONS'} as Request).status).toBe(204);
});
