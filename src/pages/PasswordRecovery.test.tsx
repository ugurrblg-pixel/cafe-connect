import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {it,expect,vi,afterEach} from 'vitest';
import PasswordRecovery from './PasswordRecovery';
const mock=vi.hoisted(()=>({reset:vi.fn(),update:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{resetPasswordForEmail:mock.reset,updateUser:mock.update,getSession:()=>Promise.resolve({data:{session:{user:{email:'test@example.invalid'}}},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe:()=>{}}}})}}}));
vi.mock('sonner',()=>({toast:{error:vi.fn()}}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('requests a reset with the current site callback',async()=>{
 mock.reset.mockResolvedValue({error:null});
 render(<MemoryRouter initialEntries={['/forgot-password']}><PasswordRecovery/></MemoryRouter>);
 fireEvent.change(screen.getByLabelText('Hesap e-postası'),{target:{value:'test@example.invalid'}});
 fireEvent.click(screen.getByRole('button',{name:'Sıfırlama bağlantısı gönder'}));
 await waitFor(()=>expect(mock.reset).toHaveBeenCalledWith('test@example.invalid',{redirectTo:`${window.location.origin}/reset-password`}));
 expect(mock.update).not.toHaveBeenCalled();
});
it('rejects mismatched passwords without changing credentials',async()=>{
 render(<MemoryRouter initialEntries={['/reset-password']}><PasswordRecovery/></MemoryRouter>);
 fireEvent.change(await screen.findByLabelText('Yeni şifre'),{target:{value:'synthetic-one'}});
 fireEvent.change(screen.getByLabelText('Yeni şifre tekrar'),{target:{value:'synthetic-two'}});
 fireEvent.click(screen.getByRole('button',{name:'Şifreyi kaydet'}));
 expect(mock.update).not.toHaveBeenCalled();
});
