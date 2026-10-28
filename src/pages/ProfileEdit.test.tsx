import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {MemoryRouter,useLocation} from 'react-router-dom';
import {beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({user:{id:'owner'},update:vi.fn(),refresh:vi.fn(),fail:false}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:state.user,refreshProfile:state.refresh})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{
 from:(table:string)=>({
  select:()=>({eq:()=>table==='profiles'?{maybeSingle:async()=>({data:{id:'p',display_name:'Deniz',bio:'Kahve ve sohbet severim.',photo_urls:[],hobbies:[],purpose:'chat',is_visible:false},error:null})}:Promise.resolve({data:[],error:null})}),
  update:(payload:any)=>{state.update(payload);return {eq:()=>({select:()=>({single:async()=>({data:state.fail?null:{id:'p'},error:state.fail?new Error('network'):null})})})};}
 }),rpc:vi.fn()
}}));
vi.mock('@/components/PageLayout',()=>({PageLayout:({children}:any)=><>{children}</>}));
vi.mock('@/components/Header',()=>({Header:()=>null}));
vi.mock('@/components/ProfilePhotoManager',()=>({ProfilePhotoManager:({onBusyChange}:any)=><button onClick={()=>onBusyChange(true)}>Yükleme başlat</button>}));
vi.mock('@/components/HobbySelector',()=>({HobbySelector:()=>null}));
vi.mock('@/components/profile/FavoriteVenuesSelector',()=>({FavoriteVenuesSelector:()=>null}));
vi.mock('@/components/profile/CoffeePreferenceSelector',()=>({CoffeePreferenceSelector:()=>null}));
vi.mock('@/components/profile/SocialEnergySelector',()=>({SocialEnergySelector:()=>null}));
vi.mock('@/lib/profanityFilter',()=>({containsProfanity:()=>false,getProfanityError:()=>''}));
import ProfileEdit from './ProfileEdit';
function Path(){return <output data-testid="path">{useLocation().pathname}</output>}
function open(){render(<MemoryRouter initialEntries={['/profile/edit']}><ProfileEdit/><Path/></MemoryRouter>)}
beforeEach(()=>{state.fail=false;state.update.mockReset();state.refresh.mockReset().mockResolvedValue(undefined);});
it('saves edits without writing unrelated stale visibility and returns to profile',async()=>{open();const name=await screen.findByLabelText('Görünen İsim');fireEvent.change(name,{target:{value:'Deniz Kaya'}});fireEvent.click(screen.getByRole('button',{name:'Değişiklikleri kaydet'}));await waitFor(()=>expect(state.update).toHaveBeenCalledTimes(1));expect(state.update.mock.calls[0][0]).toMatchObject({display_name:'Deniz Kaya'});expect(state.update.mock.calls[0][0]).not.toHaveProperty('is_visible');await waitFor(()=>expect(screen.getByTestId('path')).toHaveTextContent('/profile'));});
it('keeps failed edits for retry',async()=>{state.fail=true;open();fireEvent.change(await screen.findByLabelText('Görünen İsim'),{target:{value:'Deniz Kaya'}});fireEvent.click(screen.getByRole('button',{name:'Değişiklikleri kaydet'}));await waitFor(()=>expect(state.update).toHaveBeenCalled());await waitFor(()=>expect(screen.getByRole('button',{name:'Değişiklikleri kaydet'})).not.toBeDisabled());expect(screen.getByLabelText('Görünen İsim')).toHaveValue('Deniz Kaya');expect(screen.getByTestId('path')).toHaveTextContent('/profile/edit');});
it('prevents saving during photo screening/upload',async()=>{open();await screen.findByLabelText('Görünen İsim');fireEvent.click(screen.getByRole('button',{name:'Yükleme başlat'}));expect(screen.getByRole('button',{name:'Değişiklikleri kaydet'})).toBeDisabled();expect(state.update).not.toHaveBeenCalled();});
