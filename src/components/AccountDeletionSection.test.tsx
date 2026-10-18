import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {beforeEach,expect,it,vi} from 'vitest';
import {MemoryRouter} from 'react-router-dom';
const mocks=vi.hoisted(()=>({invoke:vi.fn(),rpc:vi.fn(),signOut:vi.fn(),success:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'own-account'}})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:mocks.rpc,functions:{invoke:mocks.invoke},auth:{signOut:mocks.signOut}}}));
vi.mock('sonner',()=>({toast:{success:mocks.success}}));
import {AccountDeletionSection} from './AccountDeletionSection';
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('VITE_ACCOUNT_DELETION_ENABLED','true');mocks.rpc.mockResolvedValue({data:false});mocks.signOut.mockResolvedValue({error:null});});
async function open(){render(<MemoryRouter><AccountDeletionSection/></MemoryRouter>);fireEvent.click(screen.getByRole('button',{name:'Hesabımı sil'}));await screen.findByRole('alertdialog');}
it('does not call deletion on open, requires exact text and keeps failure dialog open',async()=>{
 mocks.invoke.mockResolvedValue({data:null,error:new Error('offline')});await open();
 const button=screen.getByRole('button',{name:'Hesabımı kalıcı olarak sil'});expect(button).toBeDisabled();expect(mocks.invoke).not.toHaveBeenCalled();
 fireEvent.change(screen.getByLabelText('Silme onayı'),{target:{value:'sil'}});expect(button).toBeDisabled();
 fireEvent.change(screen.getByLabelText('Silme onayı'),{target:{value:'SİL'}});fireEvent.click(button);
 await screen.findByRole('alert');expect(screen.getByRole('alertdialog')).toBeInTheDocument();expect(mocks.success).not.toHaveBeenCalled();expect(mocks.signOut).not.toHaveBeenCalled();
});
it('prevents duplicate submits and dismissing a deletion in flight',async()=>{
 let finish!:(value:unknown)=>void;mocks.invoke.mockReturnValue(new Promise(resolve=>finish=resolve));await open();
 fireEvent.change(screen.getByLabelText('Silme onayı'),{target:{value:'SİL'}});const button=screen.getByRole('button',{name:'Hesabımı kalıcı olarak sil'});fireEvent.click(button);fireEvent.click(button);
 expect(mocks.invoke).toHaveBeenCalledTimes(1);expect(screen.getByRole('button',{name:'Vazgeç'})).toBeDisabled();
 await act(async()=>finish({data:null,error:new Error('offline')}));
});
it('asks for sign-in again without claiming that deletion completed',async()=>{
 mocks.invoke.mockResolvedValue({data:{code:'reauth_required'},error:{}});await open();fireEvent.change(screen.getByLabelText('Silme onayı'),{target:{value:'SİL'}});fireEvent.click(screen.getByRole('button',{name:'Hesabımı kalıcı olarak sil'}));
 expect(await screen.findByRole('button',{name:'Yeniden giriş yap'})).toBeInTheDocument();expect(mocks.success).not.toHaveBeenCalled();
});
it('labels partial cleanup honestly and only signs out on confirmed success',async()=>{
 mocks.invoke.mockResolvedValueOnce({data:{code:'incomplete'},error:{}}).mockResolvedValue({data:{deleted:true},error:null});await open();fireEvent.change(screen.getByLabelText('Silme onayı'),{target:{value:'SİL'}});fireEvent.click(screen.getByRole('button',{name:'Hesabımı kalıcı olarak sil'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Silme henüz tamamlanmadı');expect(mocks.signOut).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Hesabımı kalıcı olarak sil'}));await waitFor(()=>expect(mocks.signOut).toHaveBeenCalledWith({scope:'local'}));expect(mocks.success).toHaveBeenCalledTimes(1);
});
it('keeps the feature unavailable while its release flag is off',()=>{vi.stubEnv('VITE_ACCOUNT_DELETION_ENABLED','false');render(<MemoryRouter><AccountDeletionSection/></MemoryRouter>);expect(screen.queryByRole('button',{name:'Hesabımı sil'})).not.toBeInTheDocument();expect(mocks.rpc).not.toHaveBeenCalled();});
