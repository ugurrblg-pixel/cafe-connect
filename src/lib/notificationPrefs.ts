export interface InAppNotificationPrefs {new_messages:boolean;new_matches:boolean}
export const NOTIFICATION_PREFS_CHANGED='riyo:notification-preferences';
export function readNotificationPrefs(userId:string):InAppNotificationPrefs {
 try{const value=JSON.parse(localStorage.getItem(`notif_prefs_${userId}`)||'{}');return {new_messages:typeof value.new_messages==='boolean'?value.new_messages:true,new_matches:typeof value.new_matches==='boolean'?value.new_matches:true};}catch{return {new_messages:true,new_matches:true};}
}
