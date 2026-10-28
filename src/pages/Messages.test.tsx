import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {MemoryRouter,useLocation} from 'react-router-dom';
import {beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({complete:true,create:vi.fn(),rows:[] as any[]}));
vi.mock('@/hooks/useInboxData',()=>({useInboxData:()=>({conversations:state.rows,loading:false,error:null,createConversation:state.create,refetch:vi.fn()})}));
vi.mock('@/hooks/useProfileCompletion',()=>({useProfileCompletion:()=>({isComplete:state.complete})}));
vi.mock('@/components/PageLayout',()=>({PageLayout:({children}:any)=><>{children}</>}));
vi.mock('@/components/InboxItem',()=>({InboxItem:({userName,onClick}:any)=><button onClick={onClick}>{userName}</button>}));
vi.mock('@/components/ProfileGateModal',()=>({ProfileGateModal:({open}:any)=>open?<p>Profil gerekli</p>:null}));
vi.mock('@/components/ConversationActionSheet',()=>({ConversationActionSheet:()=>null}));
vi.mock('@/components/InitialsAvatar',()=>({InitialsAvatar:({name}:any)=><span aria-hidden="true">{name[0]}</span>}));
import Messages from './Messages';
const base={conversationId:'chat-a',otherUserId:'u',otherUserPhotoUrl:'',cafeName:'İncir Kahve',cafeId:'c',unreadCount:0,matchedAt:new Date()};
function Path(){return <output data-testid="path">{useLocation().pathname}</output>}
function open(){render(<MemoryRouter initialEntries={['/messages']}><Messages/><Path/></MemoryRouter>)}
beforeEach(()=>{state.complete=true;state.create.mockReset();state.rows=[{...base,matchId:'a',otherUserName:'İpek',lastMessage:{content:'Merhaba',createdAt:new Date(),senderId:'u'},unreadCount:2},{...base,matchId:'b',otherUserName:'Deniz',conversationId:null}];});
it('searches real names in Turkish and clears no-results state',()=>{open();fireEvent.change(screen.getByRole('textbox',{name:'Kişi, sohbet veya mekan ara'}),{target:{value:'İPEK'}});expect(screen.queryByRole('button',{name:'Deniz ile sohbet başlat'})).not.toBeInTheDocument();expect(screen.getByText('Merhaba')).toBeVisible();fireEvent.change(screen.getByRole('textbox'),{target:{value:'yok'}});expect(screen.getByText('Bu seçimle eşleşen sohbet yok')).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'Aramayı ve filtreleri temizle'}));expect(screen.getByRole('button',{name:'Deniz ile sohbet başlat'})).toBeVisible();});
it('synchronizes unread category and select without creating conversations',()=>{open();fireEvent.click(screen.getByRole('button',{name:'Okunmamış (1)'}));expect(screen.getByLabelText('Sohbet filtresi')).toHaveValue('unread');expect(screen.queryByRole('button',{name:'Deniz ile sohbet başlat'})).not.toBeInTheDocument();expect(state.create).not.toHaveBeenCalled();});
it('keeps profile gate before starting a new chat',()=>{state.complete=false;open();fireEvent.click(screen.getByRole('button',{name:'Deniz ile sohbet başlat'}));expect(screen.getByText('Profil gerekli')).toBeVisible();expect(state.create).not.toHaveBeenCalled();});
it('opens actual conversation and recovers from failed new chat',async()=>{state.create.mockRejectedValue(new Error('network'));open();fireEvent.click(screen.getByRole('button',{name:'Deniz ile sohbet başlat'}));await waitFor(()=>expect(state.create).toHaveBeenCalledTimes(1));await waitFor(()=>expect(screen.getByRole('button',{name:'Deniz ile sohbet başlat'})).not.toBeDisabled());fireEvent.click(screen.getByRole('button',{name:'Cevap yaz'}));expect(screen.getByTestId('path')).toHaveTextContent('/chat/chat-a');});
