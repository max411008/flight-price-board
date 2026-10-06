import {normalizeQuery,flightUrl} from './model.js';
let running=false;
function allowed(value){try{const u=new URL(value);return (u.origin==='https://max411008.github.io'&&u.pathname.startsWith('/flight-price-board/'))||u.origin==='http://127.0.0.1:5174';}catch{return false;}}
function valid(job){try{return normalizeQuery(job).id===job.id}catch{return false}}
function loaded(id){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{chrome.tabs.onUpdated.removeListener(listener);reject(Error('Google 航班頁面載入逾時。'))},30000);function listener(tabId,info){if(tabId===id&&info.status==='complete'){clearTimeout(timer);chrome.tabs.onUpdated.removeListener(listener);resolve()}}chrome.tabs.onUpdated.addListener(listener);chrome.tabs.get(id).then(t=>{if(t.status==='complete')listener(id,{status:'complete'})}).catch(reject)})}
chrome.runtime.onConnect.addListener(port=>{
 if(port.name!=='fare-board'||!allowed(port.sender?.url)){port.disconnect();return}
 let alive=true;port.onDisconnect.addListener(()=>{alive=false});const send=x=>{if(alive)try{port.postMessage(x)}catch{alive=false}};
 port.onMessage.addListener(async message=>{
  if(message.type==='ping'){send({type:'ready',version:2});return}
  if(message.type!=='refresh'||!Array.isArray(message.jobs))return;
  if(running){send({type:'complete',message:'另一個更新正在執行，請等候完成。'});return}
  if(message.jobs.length>500||!message.jobs.every(valid)){send({type:'complete',message:'查詢格式或乘客條件不正確，未開始更新。'});return}
  const jobs=message.jobs;running=true;let success=0,failed=0,stopped=false;
  try{for(let i=0;i<jobs.length&&alive;i++){
   const job=jobs[i];let tab;
   send({type:'progress',message:`正在查詢 ${job.flight} · ${job.departure}（${i+1}/${jobs.length}）`});
   try{
    const url=new URL(flightUrl(job));
    tab=await chrome.tabs.create({url:url.href,active:false});await loaded(tab.id);
    let ready=false;for(let attempt=0;attempt<20&&!ready;attempt++){try{ready=(await chrome.tabs.sendMessage(tab.id,{type:'ping'}))?.ready===true}catch{}if(!ready)await new Promise(r=>setTimeout(r,250))}
    if(!ready)throw Error('來源頁面尚未準備完成');
    let deadline;const result=await Promise.race([chrome.tabs.sendMessage(tab.id,{type:'collect',job}),new Promise((_,reject)=>{deadline=setTimeout(()=>reject(Error('來源查詢逾時')),45000)})]).finally(()=>clearTimeout(deadline));
    if(!result||result.current==null){failed++;send({type:'result',id:job.id,result:{error:result?.error||'未收到航班資料。'}});if(result?.error?.includes('驗證')){stopped=true;break}}else{success++;send({type:'result',id:job.id,result})}
   }catch(e){failed++;send({type:'result',id:job.id,result:{error:'無法讀取來源頁面。請開啟 Google Flights 確認是否要求驗證，稍後再更新。'}})}
   finally{if(tab?.id)await chrome.tabs.remove(tab.id).catch(()=>{})}
  }}finally{running=false;send({type:'complete',message:stopped?`Google 要求驗證，已停止後續查詢。${success} 筆已讀取；請自行在 Google Flights 完成驗證後重試。`:`更新結束：${success} 筆已讀取，${failed} 筆未取得資料。`})}
 });
});
