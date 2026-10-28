import {render,screen,fireEvent} from '@testing-library/react';
import {MemoryRouter,useLocation} from 'react-router-dom';
import {beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({user:{id:"owner",email:"own@example.test"},premium:false,visible:true as boolean|null,saving:false,save:vi.fn(),reload:vi.fn(),error:false}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:state.user,signOut:vi.fn(),refreshProfile:vi.fn()})}));
vi.mock('@/hooks/usePremium',()=>({usePremium:()=>({isPremium:state.premium})}));
vi.mock('@/hooks/useProfileVisibility',()=>({useProfileVisibility:()=>({visible:state.visible,saving:state.saving,error:state.error,loading:false,save:state.save,reload:state.reload})}));
vi.mock('@/hooks/useActiveCheckIn',()=>({useActiveCheckIn:()=>({activeCheckIn:null})}));
vi.mock('@/hooks/useProfileCompletion',()=>({useProfileCompletion:()=>({percentage:100,missingFields:[]})}));
vi.mock('@/contexts/I18nContext',()=>({useI18n:()=>({t:{intents:{chat:'Sohbet',friendship:'Arkadaşlık',dating:'Flört'},profile:{about:'Hakkımda',hobbies:'İlgi alanları',imHereFor:'Tanışma amacı',accountVerification:'Hesap doğrulama',safetyPrivacy:'Güvenlik ve gizlilik',helpSupport:'Yardım',signOutLink:'Çıkış yap'}},formatString:(v:string)=>v})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{id:'profile',name:'Deniz',display_name:'Deniz',photo_urls:[],hobbies:['Kahve'],purpose:'chat',verification_status:'pending'},error:null})})})})}}));
vi.mock('@/components/PageLayout',()=>({PageLayout:({children}:any)=><>{children}</>}));
vi.mock('@/components/ProfilePhotoCarousel',()=>({ProfilePhotoCarousel:()=> <span>Özel fotoğraf alanı</span>}));
vi.mock('@/components/PremiumBadge',()=>({PremiumBadge:()=>null}));
vi.mock('@/components/PurposeBadge',()=>({PurposeBadge:()=>null}));
vi.mock('@/components/HobbyDisplay',()=>({HobbyDisplay:()=>null}));
vi.mock('@/components/ProfileFavorites',()=>({ProfileFavorites:({userId}:any)=><p>Favoriler: {userId}</p>}));
vi.mock('@/components/VerificationRequest',()=>({VerificationRequest:({verificationStatus}:any)=><p>Doğrulama: {verificationStatus}</p>}));
vi.mock('@/components/AccountDeletionSection',()=>({AccountDeletionSection:()=> <button>Hesabımı sil</button>}));
import Profile from './Profile';
function Path(){return <output data-testid="path">{useLocation().pathname}</output>}
function open(){render(<MemoryRouter initialEntries={['/profile']}><Profile/><Path/></MemoryRouter>)}
beforeEach(()=>{state.premium=false;state.visible=true;state.saving=false;state.error=false;state.save.mockReset();});
it('retains verification, private photos, favorites, privacy and deletion without enabling purchases',async()=>{open();await screen.findByText('Doğrulama: pending');expect(screen.getByText('Özel fotoğraf alanı')).toBeVisible();expect(screen.getByText('Favoriler: owner')).toBeVisible();expect(screen.getByRole('button',{name:'Hesabımı sil'})).toBeVisible();expect(screen.getByText('Yakında · Satın alma kapalı')).toBeVisible();fireEvent.click(screen.getByRole('switch',{name:'Mekan görünürlüğü'}));expect(state.save).toHaveBeenCalledWith(false);});
it('disables unknown visibility and keeps privacy settings reachable',async()=>{state.visible=null;state.error=true;open();await screen.findByText('Doğrulama: pending');expect(screen.getByRole('switch',{name:'Mekan görünürlüğü'})).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:'Güvenlik ve gizlilik ayarları'}));expect(screen.getByTestId('path')).toHaveTextContent('/settings/safety');});
it('allows existing premium members to reach their real membership details',async()=>{state.premium=true;open();fireEvent.click(await screen.findByRole('button',{name:'Üyelik bilgilerim'}));expect(screen.getByTestId('path')).toHaveTextContent('/subscription');});
