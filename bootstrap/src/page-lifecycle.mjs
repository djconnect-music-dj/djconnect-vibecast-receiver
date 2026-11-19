// Foreground/context loss retires the current interaction. Returning online or
// restoring BFCache never replenishes pre-QR attempt authority.
export function bindPageLifecycle(controller,doc=document,win=window){
 const hidden=()=>{if(doc.visibilityState==='hidden')controller.stop();};
 const retire=()=>controller.stop();
 const restore=event=>{if(event.persisted)controller.stop();};
 doc.addEventListener('visibilitychange',hidden);win.addEventListener('pagehide',retire);win.addEventListener('pageshow',restore);
 return ()=>{doc.removeEventListener('visibilitychange',hidden);win.removeEventListener('pagehide',retire);win.removeEventListener('pageshow',restore);};
}
