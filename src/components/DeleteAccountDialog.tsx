import { useRef, useState } from 'react';
import {
 AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
 AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

interface Props {
 open:boolean; onOpenChange:(open:boolean)=>void;
 onConfirm:()=>Promise<boolean>; error?:string; reauthRequired?:boolean;
 onReauthenticate:()=>Promise<void>;
 onClosed:()=>void;
}
export function DeleteAccountDialog({open,onOpenChange,onConfirm,error,reauthRequired,onReauthenticate,onClosed}:Props){
 const [text,setText]=useState(''); const [busy,setBusy]=useState(false); const pending=useRef(false);
 const close=(value:boolean)=>{if(!pending.current){onOpenChange(value);setText('');}};
 const confirm=async()=>{
  if(text!=='SİL'||pending.current)return;
  pending.current=true;setBusy(true);
  try{if(await onConfirm()){setText('');onOpenChange(false);}}finally{pending.current=false;setBusy(false);}
 };
 return <AlertDialog open={open} onOpenChange={close}>
  <AlertDialogContent className="max-h-[90dvh] overflow-y-auto" onCloseAutoFocus={event=>{event.preventDefault();onClosed();}}>
   <AlertDialogHeader>
    <AlertDialogTitle>Hesabını kalıcı olarak sil</AlertDialogTitle>
    <AlertDialogDescription className="space-y-3">
     <span className="block">Profilin, profil fotoğrafların, doğrulama selfielerin ve gönderdiğin mesajlar silinir. Eşleşmelerin ve check-in kayıtların kaldırılır. Karşı tarafın kendi mesajları silinmez.</span>
     <span className="block">Şikâyet, engel cezası ve yönetim denetim kayıtları bu işlemle silinmez. Silme başladıktan sonra profilin kapanır; işlem yarıda kalırsa buradan yeniden deneyebilirsin.</span>
     <span className="block font-medium text-foreground">Bu işlem geri alınamaz. Onaylamak için SİL yaz.</span>
    </AlertDialogDescription>
   </AlertDialogHeader>
   <label htmlFor="delete-account-confirmation" className="text-sm font-medium">Silme onayı</label>
   <Input id="delete-account-confirmation" value={text} onChange={e=>setText(e.target.value)} autoComplete="off" disabled={busy} aria-describedby={error?'delete-account-error':undefined}/>
   {error&&<p id="delete-account-error" role="alert" className="text-sm text-destructive">{error}</p>}
   <AlertDialogFooter>
    <AlertDialogCancel disabled={busy}>Vazgeç</AlertDialogCancel>
    {reauthRequired?<Button onClick={()=>void onReauthenticate()} disabled={busy}>Yeniden giriş yap</Button>:
     <Button variant="destructive" onClick={()=>void confirm()} disabled={text!=='SİL'||busy} aria-busy={busy}>
      {busy?<><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Siliniyor…</>:'Hesabımı kalıcı olarak sil'}
     </Button>}
   </AlertDialogFooter>
  </AlertDialogContent>
 </AlertDialog>;
}
