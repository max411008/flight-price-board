// Parse visible DOM text only. No private account data, network interception or hidden page state.
function parseFareSnapshot(snapshot,job,now=new Date()){
 const {text,labels,historyLabels,url}=snapshot;
 if(/unusual traffic|not a robot|異常流量|不是機器人|驗證您是人類/i.test(text))throw Error('Google 要求人工驗證，未更新價格。');
 const normalized=text.replace(/\s/g,'');
 if(!new RegExp('(?:^|[^A-Z0-9])'+job.flight+'(?:[^A-Z0-9]|$)').test(normalized)||!normalized.includes('('+job.origin+')')||!normalized.includes('('+job.destination+')'))throw Error('頁面顯示的航班或機場不符，未儲存資料。');
 const track=labels.find(s=>s.includes(job.departure)&&/所選航班|selected flights/i.test(s));
 if(!track)throw Error('無法確認起飛日期，未儲存資料。');
 if(!/經濟艙/.test(text)||!/1 位乘客|1位乘客/.test(text))throw Error('無法確認一位成人經濟艙條件，未儲存資料。');
 const currentLabel=labels.find(s=>/^\d[\d,]* 新台幣$/.test(s));
 const current=currentLabel?Number(currentLabel.replace(/[^\d]/g,'')):null;
 if(!current||current>10000000)throw Error('來源未提供可確認的新臺幣售價。');
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const base=new Date(day+'T12:00:00Z');const history=[];
 for(const label of historyLabels){const m=label.match(/^(?:(\d+)\s*天前|今天)\s*[-–]\s*(?:NT\$|\$)\s*([\d,]+)/);if(!m)continue;const d=new Date(base);d.setUTCDate(d.getUTCDate()-Number(m[1]||0));history.push({date:d.toISOString().slice(0,10),price:Number(m[2].replaceAll(',',''))})}
 history.sort((a,b)=>a.date.localeCompare(b.date));
 return {flight:job.flight,departure:job.departure,origin:job.origin,destination:job.destination,current,history,observedAt:now.toISOString(),sourceUrl:url,...(!history.length?{error:'已取得售價，但來源未提供這筆航班的歷史記錄。'}:{})};
}
