let running=false;
const allowed=['https://flight-fare-notebook.max411008.chatgpt.site','http://127.0.0.1:5173'];
function valid(job){try{const u=new URL(job.sourceUrl);return typeof job.id==='string'&&/^[A-Z0-9]{2}\d{1,4}[A-Z]?$/.test(job.flight)&&/^\d{4}-\d{2}-\d{2}$/.test(job.departure)&&/^[A-Z]{3}$/.test(job.origin)&&/^[A-Z]{3}$/.test(job.destination)&&u.origin==='https://www.google.com'&&u.pathname==='/travel/flights/booking'&&u.searchParams.has('tfs')}catch{return false}}
function loaded(id){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{chrome.tabs.onUpdated.removeListener(listener);reject(Error('Google 航班頁面載入逾時。'))},30000);function listener(tabId,info){if(tabId===id&&info.status==='complete'){clearTimeout(timer);chrome.tabs.onUpdated.removeListener(listener);resolve()}}chrome.tabs.onUpdated.addListener(listener);chrome.tabs.get(id).then(t=>{if(t.status==='complete')listener(id,{status:'complete'})}).catch(reject)})}
chrome.runtime.onConnect.addListener(port=>{
 if(port.name!=='fare-board'||!allowed.includes(new URL(port.sender.url).origin)){port.disconnect();return}
 let alive=true;port.onDisconnect.addListener(()=>{alive=false});const send=x=>{if(alive)try{port.postMessage(x)}catch{alive=false}};
 port.onMessage.addListener(async message=>{
  if(message.type==='ping'){send({type:'ready'});return}
  if(message.type!=='refresh'||!Array.isArray(message.jobs))return;
  if(running){send({type:'complete',message:'另一個更新正在執行，請等候完成。'});return}
  const jobs=message.jobs.filter(valid);running=true;let success=0,failed=0,stopped=false;
  try{for(let i=0;i<jobs.length&&alive;i++){
   const job=jobs[i];let tab;
   send({type:'progress',message:`正在查詢 ${job.flight} · ${job.departure}（${i+1}/${jobs.length}）`});
   try{
    const url=new URL(job.sourceUrl);url.searchParams.delete('tfu');url.searchParams.set('hl','zh-TW');url.searchParams.set('curr','TWD');
    tab=await chrome.tabs.create({url:url.href,active:false});await loaded(tab.id);
    let ready=false;for(let attempt=0;attempt<20&&!ready;attempt++){try{ready=(await chrome.tabs.sendMessage(tab.id,{type:'ping'}))?.ready===true}catch{}if(!ready)await new Promise(r=>setTimeout(r,250))}
    if(!ready)throw Error('來源頁面尚未準備完成');
    let deadline;const result=await Promise.race([chrome.tabs.sendMessage(tab.id,{type:'collect',job}),new Promise((_,reject)=>{deadline=setTimeout(()=>reject(Error('來源查詢逾時')),45000)})]).finally(()=>clearTimeout(deadline));
    if(!result||result.error){failed++;send({type:'result',id:job.id,result:{error:result?.error||'未收到航班資料。'}});if(result?.error?.includes('驗證')){stopped=true;break}}else{success++;send({type:'result',id:job.id,result})}
   }catch(e){failed++;send({type:'result',id:job.id,result:{error:'無法讀取來源頁面。請開啟 Google Flights 確認是否要求驗證，稍後再更新。'}})}
   finally{if(tab?.id)await chrome.tabs.remove(tab.id).catch(()=>{})}
  }}finally{running=false;send({type:'complete',message:stopped?`Google 要求驗證，已停止後續查詢。${success} 筆已讀取；請自行在 Google Flights 完成驗證後重試。`:`更新結束：${success} 筆已讀取，${failed} 筆未取得資料。`})}
 });
});
