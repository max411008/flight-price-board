chrome.runtime.onMessage.addListener((message,sender,respond)=>{
 if(message.type==='ping'){respond({ready:true});return}
 if(message.type!=='collect')return;
 (async()=>{
  const deadline=Date.now()+40000;let expanded=false,lastError='來源尚未完成載入。';
  while(Date.now()<deadline){
   const text=document.body.innerText;
   if(/unusual traffic|not a robot|異常流量|不是機器人|驗證您是人類/i.test(text))throw Error('Google 要求人工驗證，未更新價格。');
   const details=document.querySelector('button[aria-label^="航班詳細資料"]');
   if(details&&details.getAttribute('aria-expanded')!=='true'&&!expanded){details.click();expanded=true}
   const snapshot={text:document.body.innerText,labels:Array.from(document.querySelectorAll('[aria-label]'),e=>e.getAttribute('aria-label')),historyLabels:Array.from(document.querySelectorAll('[aria-label="價格記錄圖表"] [role="button"][aria-label]'),e=>e.getAttribute('aria-label')),url:location.href};
   try{const result=parseFareSnapshot(snapshot,message.job);if(result.history.length||Date.now()>deadline-2000)return result}catch(e){lastError=e.message}
   await new Promise(resolve=>setTimeout(resolve,750));
  }
  throw Error(lastError);
 })().then(respond).catch(e=>respond({error:e.message}));
 return true;
});
