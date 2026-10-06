chrome.runtime.onMessage.addListener((message,sender,respond)=>{
 if(message.type==='ping'){respond({ready:true});return}
 if(message.type!=='collect')return;
 (async()=>{
  const deadline=Date.now()+40000;let expanded=false,passengerCounts=null,lastError='來源尚未完成載入。',lastSignature='',stableSince=0;
  while(Date.now()<deadline){
   const text=document.body.innerText;
   if(/unusual traffic|not a robot|異常流量|不是機器人|驗證您是人類/i.test(text))throw Error('Google 要求人工驗證，未更新價格。');
   if(!passengerCounts){
    const button=[...document.querySelectorAll('button[aria-label]')].find(e=>/^\d+ 位乘客/.test(e.getAttribute('aria-label'))&&e.getClientRects().length);
    if(button){button.click();await new Promise(r=>setTimeout(r,300));
     const fields=['成人旅客數','2 至 11 歲的兒童人數','不占位的嬰兒數','占位嬰兒數'].map(label=>[...document.querySelectorAll('[aria-label]')].find(e=>e.getAttribute('aria-label')===label&&e.getClientRects().length));
     if(fields.every(e=>e&&e.hasAttribute('aria-valuenow')))passengerCounts=fields.map(e=>Number(e.getAttribute('aria-valuenow')));
     const cancel=[...document.querySelectorAll('button')].find(e=>e.innerText.trim()==='取消'&&e.getClientRects().length);if(cancel)cancel.click();
    }
   }
   const details=document.querySelector('button[aria-label^="航班詳細資料"]');
   if(details&&details.getAttribute('aria-expanded')!=='true'&&!expanded){details.click();expanded=true}
   const snapshot={text:document.body.innerText,labels:Array.from(document.querySelectorAll('[aria-label]'),e=>e.getAttribute('aria-label')),historyLabels:Array.from(document.querySelectorAll('[aria-label="價格記錄圖表"] [role="button"][aria-label]'),e=>e.getAttribute('aria-label')),url:location.href,passengerCounts};
   try{const result=parseFareSnapshot(snapshot,message.job);const signature=JSON.stringify([result.current,result.history]);if(signature!==lastSignature){lastSignature=signature;stableSince=Date.now();}if(Date.now()-stableSince>2500&&(result.history.length||Date.now()>deadline-2000))return result}catch(e){lastError=e.message;lastSignature='';stableSince=0;}
   await new Promise(resolve=>setTimeout(resolve,750));
  }
  throw Error(lastError);
 })().then(respond).catch(e=>respond({error:e.message}));
 return true;
});
