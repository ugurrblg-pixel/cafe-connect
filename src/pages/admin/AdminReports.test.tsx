import {fireEvent,render,screen,waitFor,cleanup} from '@testing-library/react';
import {it,expect,vi,afterEach} from 'vitest';
import AdminReports from './AdminReports';
const mock=vi.hoisted(()=>({rpc:vi.fn(),success:vi.fn(),error:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:mock.rpc}}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'admin'}})}));
vi.mock('@/components/admin/AdminLayout',()=>({AdminLayout:({children}:any)=>children}));
vi.mock('sonner',()=>({toast:{success:mock.success,error:mock.error}}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('shows access failures instead of claiming there are no reports',async()=>{
 mock.rpc.mockResolvedValue({data:null,error:{message:'denied'}});
 render(<AdminReports/>);
 await waitFor(()=>expect(screen.getByRole('alert')).toBeInTheDocument());
 expect(screen.queryByText('Bu listede şikâyet bulunmuyor.')).toBeNull();
});
it('does not claim a saved review after server rejection',async()=>{
 mock.rpc.mockResolvedValueOnce({data:[{id:'report',reporter_name:'A',reported_name:'B',reason:'spam',description:'detail',status:'pending',created_at:'2026-10-10T10:00:00Z'}],error:null});
 mock.rpc.mockResolvedValueOnce({error:{message:'denied'}});
 render(<AdminReports/>);
 fireEvent.click(await screen.findByRole('button',{name:'İncelendi olarak işaretle'}));
 await waitFor(()=>expect(mock.error).toHaveBeenCalledOnce());
 expect(mock.success).not.toHaveBeenCalled();
 expect(mock.rpc).toHaveBeenCalledWith('review_admin_report',{target_report_id:'report',new_status:'reviewed'});
});
