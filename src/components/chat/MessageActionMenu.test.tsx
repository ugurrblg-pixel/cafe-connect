import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
vi.mock('@/contexts/I18nContext',()=>({useI18n:()=>({locale:'tr'})}));
import {MessageActionMenu} from './MessageActionMenu';
async function openConfirm(remove:()=>Promise<boolean>){
 render(<MessageActionMenu content="Örnek mesaj" isOwn messageTimestamp={new Date(0)} onDeleteForEveryone={remove}><p>Örnek mesaj</p></MessageActionMenu>);
 fireEvent.click(screen.getByRole('button',{name:'Mesaj Seçenekleri'}));
 fireEvent.click(await screen.findByRole('button',{name:'Sil'}));
 return await screen.findByRole('button',{name:'Herkes için sil'});
}
it('does not present a misleading local-only delete action and removes only after explicit everyone confirmation',async()=>{
 const remove=vi.fn().mockResolvedValue(true);const button=await openConfirm(remove);
 expect(screen.queryByRole('button',{name:'Benim için sil'})).not.toBeInTheDocument();expect(button).toBeEnabled();expect(remove).not.toHaveBeenCalled();
 fireEvent.click(button);await waitFor(()=>expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());expect(remove).toHaveBeenCalledOnce();
});
it('retains the confirmation and error when the server refuses removal',async()=>{
 const remove=vi.fn().mockResolvedValue(false);fireEvent.click(await openConfirm(remove));
 expect(await screen.findByRole('alert')).toHaveTextContent('Mesaj kaldırılamadı');expect(screen.getByRole('alertdialog')).toBeInTheDocument();
});
it('prevents duplicate mutation and cancellation while waiting for the server',async()=>{
 let finish!:(value:boolean)=>void;const remove=vi.fn().mockReturnValue(new Promise<boolean>(resolve=>finish=resolve));const button=await openConfirm(remove);fireEvent.click(button);fireEvent.click(button);
 expect(remove).toHaveBeenCalledOnce();expect(screen.getByRole('button',{name:'İptal'})).toBeDisabled();await act(async()=>finish(true));
});
it('never offers removal for a peer message even with a supplied callback',async()=>{
 const remove=vi.fn();render(<MessageActionMenu content="Diğer mesaj" isOwn={false} onDeleteForEveryone={remove}><p>Diğer mesaj</p></MessageActionMenu>);
 fireEvent.click(screen.getByRole('button',{name:'Mesaj Seçenekleri'}));expect(await screen.findByRole('button',{name:'Kopyala'})).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Sil'})).not.toBeInTheDocument();expect(remove).not.toHaveBeenCalled();
});
