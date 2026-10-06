(() => {
 const port=chrome.runtime.connect({name:'fare-board'});
 const send=data=>window.postMessage({source:'fare-bridge',...data},location.origin);
 port.onMessage.addListener(send);
 const timer=setInterval(()=>port.postMessage({type:'ping'}),20000);
 port.onDisconnect.addListener(()=>{clearInterval(timer);send({type:'disconnected'})});
 window.addEventListener('message',event=>{
  if(event.source!==window||event.origin!==location.origin||event.data?.source!=='fare-board')return;
  if(event.data.type==='ping')send({type:'ready'});
  if(event.data.type==='refresh'&&Array.isArray(event.data.jobs))port.postMessage({type:'refresh',jobs:event.data.jobs});
 });
 send({type:'ready'});
})();
