import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import Auth from './Auth';
const mock=vi.hoisted(()=>({signUp:vi.fn(),oauth:vi.fn(),from:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{signUp:mock.signUp,signInWithOAuth:mock.oauth},from:mock.from}}));
vi.mock('sonner',()=>({toast:{success:vi.fn(),error:vi.fn()}}));
vi.mock('@/contexts/I18nContext',()=>({useI18n:()=>({t:{auth:{welcomeBack:'Hoş geldin',createAccount:'Yeni hesap',signUp:'Kayıt ol',signIn:'Giriş',name:'İsim',yourName:'İsim',email:'Email',password:'Parola',noAccount:'Hesap yok',hasAccount:'Hesap var',loading:'Bekle',checkEmail:'E-postanı kontrol et',continueWithGoogle:'Google',or:'veya'}}})}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.unstubAllEnvs();vi.clearAllMocks();});
it('hides Google login until the provider is configured',()=>{
 vi.stubEnv('VITE_GOOGLE_SIGN_IN_ENABLED','false');
 render(<MemoryRouter><Auth /></MemoryRouter>);
 expect(screen.queryByRole('button',{name:'Google'})).toBeNull();
 expect(mock.oauth).not.toHaveBeenCalled();
});
it('uses Google OAuth with the current site redirect when enabled',async()=>{
 vi.stubEnv('VITE_GOOGLE_SIGN_IN_ENABLED','true');
 mock.oauth.mockResolvedValue({error:null});
 render(<MemoryRouter><Auth /></MemoryRouter>);
 fireEvent.click(screen.getByRole('button',{name:'Google'}));
 await waitFor(()=>expect(mock.oauth).toHaveBeenCalledWith({provider:'google',options:{redirectTo:`${window.location.origin}/`}}));
});
it('passes the birth date during signup and does not write a profile without a session',async()=>{
 vi.stubGlobal('ResizeObserver',class {observe(){} unobserve(){} disconnect(){}});
 mock.signUp.mockResolvedValue({data:{session:null,user:{id:'new-user'}},error:null});
 render(<MemoryRouter><Auth /></MemoryRouter>);
 fireEvent.click(screen.getByRole('button',{name:'Kayıt ol'}));
 fireEvent.change(screen.getByLabelText('İsim'),{target:{value:'Synthetic tester'}});
 fireEvent.change(screen.getByLabelText('Doğum Tarihi'),{target:{value:'2000-01-01'}});
 fireEvent.change(screen.getByLabelText('Email'),{target:{value:'synthetic@example.invalid'}});
 fireEvent.change(screen.getByLabelText('Parola'),{target:{value:'synthetic-password'}});
 fireEvent.click(screen.getByRole('checkbox'));
 fireEvent.click(screen.getByRole('button',{name:'Kayıt ol'}));
 await waitFor(()=>expect(mock.signUp).toHaveBeenCalledOnce());
 expect(mock.signUp.mock.calls[0][0].options.data).toEqual({name:'Synthetic tester',date_of_birth:'2000-01-01'});
 expect(mock.from).not.toHaveBeenCalled();
});
