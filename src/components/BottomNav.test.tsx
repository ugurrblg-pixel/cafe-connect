import {render,screen,fireEvent} from '@testing-library/react';
import {MemoryRouter,useLocation} from 'react-router-dom';
import {expect,it,vi} from 'vitest';
const availability=vi.hoisted(()=>({enabled:false}));
vi.mock('@/hooks/useActivitiesAvailability',()=>({useActivitiesAvailability:()=>({data:availability.enabled})}));
vi.mock('@/contexts/NotificationContext',()=>({useNotifications:()=>({unreadCounts:{waves:2,messages:3},resetUnreadCount:vi.fn()})}));
vi.mock('@/contexts/I18nContext',()=>({useI18n:()=>({t:{nav:{notifications:'Bildirimler',messages:'Mesajlar',profile:'Profil'}}})}));
import {BottomNav} from './BottomNav';
function Path(){return <output data-testid="path">{useLocation().pathname}</output>}
it('keeps real routes and updates selected capsule on navigation',()=>{render(<MemoryRouter><BottomNav/><Path/></MemoryRouter>);expect(screen.getByRole('button',{name:'Radar'})).toHaveAttribute('aria-current','page');fireEvent.click(screen.getByRole('button',{name:/Mesajlar/}));expect(screen.getByTestId('path')).toHaveTextContent('/messages');expect(screen.getByRole('button',{name:/Mesajlar/})).toHaveAttribute('aria-current','page');expect(screen.queryByText('Oyunlar')).not.toBeInTheDocument();});
it('stays hidden inside a venue room',()=>{render(<MemoryRouter initialEntries={['/cafe/test']}><BottomNav/></MemoryRouter>);expect(screen.queryByRole('navigation')).not.toBeInTheDocument();});

it("keeps incoming greetings reachable when activities are enabled",()=>{availability.enabled=true;render(<MemoryRouter><BottomNav/></MemoryRouter>);expect(screen.getByRole("button",{name:/Selamlar/})).toBeVisible();expect(screen.getByRole("button",{name:"Aktiviteler"})).toBeVisible();expect(screen.getAllByRole("button")).toHaveLength(5);});
