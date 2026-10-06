import {normalizeQuery,partyLabel,flightUrl,compatible,combineTripPrices,mergeResult,parseBackup} from './model.js';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>n==null?'—':`NT$ ${Math.round(n).toLocaleString('zh-TW')}`;
const timestamp=s=>s?new Date(s).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}):'尚未更新';
const KEY='flight-price-board:v2';
let flights=[],connected=false,busy=false,saveAllowed=true,outId='',inId='',pending=new Set(),watchdog;
function status(text){$('#status').textContent=text;}
function save(){if(!saveAllowed)return;try{localStorage.setItem(KEY,JSON.stringify({version:2,flights}));}catch{status('瀏覽器無法儲存資料，請先匯出備份，避免關閉後遺失。');}}
function download(name,text){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'application/json'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function refreshControls(){ $('#refresh').disabled=!connected||busy||!flights.length;$('#refresh').textContent=busy?'更新中…':'↻ 更新全部';$('#connection-status').innerHTML=`<i class="dot ${connected?'online':''}"></i>${connected?'免費更新助手已連線':'更新助手尚未連線'}`;}
function options(list,chosen){return list.map(f=>`<option value="${esc(f.id)}" ${f.id===chosen?'selected':''}>${esc(f.flight)} · ${esc(f.departure)} · ${esc(f.origin)} → ${esc(f.destination)} · ${esc(partyLabel(f.party))}</option>`).join('');}
function render(){renderFlights();renderTrip();refreshControls();}
function renderFlights(){
  const search=$('#search').value.trim().toUpperCase(),visible=flights.filter(f=>`${f.flight} ${f.origin} ${f.destination}`.includes(search));
  $('#query-count').textContent=flights.length;
  $('#flights').innerHTML=visible.length?visible.map(f=>{
    const low=f.history.length?Math.min(...f.history.map(p=>p.price)):null;
    return `<tr><td><strong class="flight-number">${esc(f.flight)}</strong><span class="sub">${esc(f.departure)}</span></td><td><strong>${esc(f.origin)} <span class="muted">→</span> ${esc(f.destination)}</strong><span class="sub">${esc(partyLabel(f.party))}</span></td><td><strong class="price">${money(f.current)}</strong><span class="sub">${f.current===null?'等待查詢':`全體乘客 · ${timestamp(f.observedAt)}`}</span>${f.error?`<span class="row-error">${esc(f.error)}</span>`:''}</td><td><strong>${money(low)}</strong><span class="sub">${f.history.length?`${f.history.length} 天紀錄`:'來源歷史尚未取得'}</span></td><td><div class="row-actions"><button data-history="${esc(f.id)}">歷史</button><a class="button" href="${esc(flightUrl(f))}" target="_blank" rel="noopener">Google ↗</a><button data-remove="${esc(f.id)}" class="text-button" aria-label="移除 ${esc(f.flight)} ${esc(partyLabel(f.party))}">移除</button></div></td></tr>`;
  }).join(''):`<tr><td colspan="5" class="empty">${search?'沒有符合的航班。':'還沒有航班。按「新增航班」，開始建立自己的清單。'}</td></tr>`;
}
function renderTrip(){
  const out=flights.find(f=>f.id===outId)||flights[0];outId=out?.id||'';
  const returns=out?flights.filter(f=>compatible(out,f)):[],back=returns.find(f=>f.id===inId)||returns[0];inId=back?.id||'';
  $('#outbound').innerHTML=flights.length?options(flights,outId):'<option>尚未新增航班</option>';
  $('#inbound').innerHTML=returns.length?options(returns,inId):'<option>尚無符合乘客條件的回程</option>';
  $('#outbound').disabled=!out;$('#inbound').disabled=!back;
  $('#trip-party').textContent=out?`${partyLabel(out.party)} · 全體 ${out.party.adults+out.party.children.length} 人${back?'':' ｜請新增反向路線、相同旅伴的回程航班。'}`:'新增去程與回程後，即可比較整趟價格。';
  const rows=out&&back?combineTripPrices(out.history,back.history):[],complete=rows.filter(p=>p.total!==null),low=complete.reduce((best,p)=>!best||p.total<best.total?p:best,null);
  const current=out?.current!=null&&back?.current!=null?out.current+back.current:null;
  $('#trip-current').textContent=money(current);$('#trip-low').textContent=money(low?.total);$('#trip-low-date').textContent=low?`${low.date} · 同一天的去回報價`:'尚無完整歷史紀錄';
  $('#trip-diff').textContent=current!==null&&low?`${current-low.total>=0?'+':'−'}${money(Math.abs(current-low.total))}`:'—';
  $('#trip-updated').textContent=out&&back?`去程 ${timestamp(out.observedAt)} ／ 回程 ${timestamp(back.observedAt)}`:'等待完整報價';
  $('#trip-days').textContent=`${rows.length} 天`;$('#chart-range').textContent=rows.length?`${rows[0].date} — ${rows.at(-1).date}`:'';
  $('#trip-table').innerHTML=rows.length?[...rows].reverse().map(p=>`<tr class="${p.date===low?.date?'best-row':''}"><td>${p.date}${p.date===low?.date?' <span class="tag">最低</span>':''}</td><td>${money(p.outbound)}</td><td>${money(p.inbound)}</td><td><strong>${money(p.total)}</strong></td></tr>`).join(''):'<tr><td colspan="4" class="empty">沒有可用的歷史紀錄。連線助手後更新，讀取來源已存在的資料。</td></tr>';
  renderChart(rows);
}
function renderChart(rows){
  const complete=rows.filter(p=>p.total!==null);if(complete.length<2){$('#chart').innerHTML='<div class="empty-chart">有兩天以上的完整去回價格後，這裡就會顯示走勢。<small>缺少的歷史資料不會補成估算價。</small></div>';return;}
  const min=Math.min(...complete.map(p=>p.total)),max=Math.max(...complete.map(p=>p.total)),pad=Math.max((max-min)*.2,100),lo=min-pad,hi=max+pad;
  const x=i=>74+i/Math.max(rows.length-1,1)*946,y=p=>220-(p-lo)/(hi-lo)*190;
  let path='',prev=false;rows.forEach((p,i)=>{if(p.total===null){prev=false;return;}path+=`${prev?'L':'M'}${x(i).toFixed(2)},${y(p.total).toFixed(2)} `;prev=true;});
  const ticks=[lo,(lo+hi)/2,hi].map(p=>`<line x1="74" x2="1020" y1="${y(p)}" y2="${y(p)}" stroke="#e6ecf1"/><text x="62" y="${y(p)+5}" text-anchor="end">${Math.round(p).toLocaleString()}</text>`).join('');
  $('#chart').innerHTML=`<svg viewBox="0 0 1040 264" role="img" aria-label="去回合計歷史走勢，最低 ${money(min)}，最高 ${money(max)}。完整數據可在下方每日表查看。">${ticks}<path d="${path}" fill="none" stroke="#178c83" stroke-width="3" stroke-linejoin="round"/>${rows.map((p,i)=>p.total===null?'':`<circle cx="${x(i)}" cy="${y(p.total)}" r="3" fill="#178c83"><title>${p.date}：${money(p.total)}</title></circle>`).join('')}<text x="74" y="254">${rows[0].date}</text><text x="1020" y="254" text-anchor="end">${rows.at(-1).date}</text></svg>`;
}
function showAdd(){ $('#form-error').textContent='';$('#add-dialog').showModal(); }
$('#open-add').addEventListener('click',showAdd);
$('#close-add').onclick=$('#cancel-add').onclick=()=>$('#add-dialog').close();
$('#close-history').onclick=()=>$('#history-dialog').close();
$('#adults').innerHTML=Array.from({length:9},(_,i)=>`<option value="${i+1}">${i+1} 位</option>`).join('');
$('#children-count').innerHTML=Array.from({length:9},(_,i)=>`<option value="${i}">${i} 位</option>`).join('');
$('#children-count').onchange=()=>{
  const existing=$$('.child').map(row=>({age:row.querySelector('.age').value,seat:row.querySelector('.seat').value}));
  $('#children-ages').innerHTML=Array.from({length:Number($('#children-count').value)},(_,i)=>{
    const old=existing[i]||{age:'',seat:''};return `<div class="form-grid child"><label>第 ${i+1} 位孩童歲數<select class="age" required><option value="">選擇歲數</option>${Array.from({length:18},(_,age)=>`<option value="${age}" ${old.age===String(age)?'selected':''}>${age} 歲</option>`).join('')}</select></label><label class="seat-label" ${old.age!==''&&Number(old.age)<2?'':'hidden'}>嬰兒座位<select class="seat" ${old.age!==''&&Number(old.age)<2?'required':'disabled'}><option value="">請選擇</option><option value="lap" ${old.seat==='lap'?'selected':''}>不占位（由成人抱著）</option><option value="seat" ${old.seat==='seat'?'selected':''}>占位（獨立座位）</option></select></label></div>`;
  }).join('');
};
$('#children-ages').onchange=e=>{if(e.target.matches('.age')){const row=e.target.closest('.child'),infant=e.target.value!==''&&Number(e.target.value)<2;row.querySelector('.seat-label').hidden=!infant;row.querySelector('.seat').disabled=!infant;row.querySelector('.seat').required=infant;}};
$('#include-return').onchange=()=>{const on=$('#include-return').checked;$('#return-fields').hidden=!on;$$('#return-fields input').forEach(el=>{el.disabled=!on;el.required=on;});};
$('#add-form').onsubmit=e=>{
  e.preventDefault();try{
    const data=new FormData(e.target),party={adults:Number(data.get('adults')),children:$$('.child').map(row=>{const value=row.querySelector('.age').value;if(value==='')throw Error('請選擇每位孩童的歲數。');return {age:Number(value),seat:row.querySelector('.seat').value};})};
    const out=normalizeQuery({flight:data.get('flight'),departure:data.get('departure'),origin:data.get('origin'),destination:data.get('destination'),party}),queries=[out];
    if($('#include-return').checked){const back=normalizeQuery({flight:data.get('returnFlight'),departure:data.get('returnDate'),origin:out.destination,destination:out.origin,party});if(back.departure<out.departure)throw Error('回程日期不能早於去程日期。');queries.push(back);}
    let added=0;queries.forEach(q=>{if(!flights.some(f=>f.id===q.id)){flights.push({...q,current:null,history:[],observedAt:null,error:null});added++;}});
    outId=out.id;inId=queries[1]?.id||'';save();render();$('#add-dialog').close();status(added?`已加入 ${added} 筆查詢。按「更新全部」取得這組乘客的實際報價。`:'這組航班與旅伴已在清單中，已切換到對應行程。');
  }catch(error){$('#form-error').textContent=error.message;}
};
$('#outbound').onchange=()=>{outId=$('#outbound').value;inId='';renderTrip();};$('#inbound').onchange=()=>{inId=$('#inbound').value;renderTrip();};$('#search').oninput=renderFlights;
$('#flights').onclick=e=>{
  const history=e.target.closest('[data-history]'),remove=e.target.closest('[data-remove]');
  if(history){const f=flights.find(f=>f.id===history.dataset.history);$('#history-title').textContent=`${f.flight} · ${f.departure}`;$('#history-party').textContent=`${f.origin} → ${f.destination} ｜ ${partyLabel(f.party)} ｜ 最近 ${money(f.current)}`;$('#single-history').innerHTML=f.history.length?[...f.history].reverse().map(p=>`<tr><td>${p.date}</td><td>${money(p.price)}</td></tr>`).join(''):'<tr><td colspan="2" class="empty">來源歷史尚未取得。</td></tr>';$('#history-dialog').showModal();}
  if(remove){const f=flights.find(f=>f.id===remove.dataset.remove);if(!confirm(`從此瀏覽器移除 ${f.flight}（${partyLabel(f.party)}）與其價格紀錄？可先匯出備份。`))return;flights=flights.filter(x=>x.id!==f.id);save();render();status('已移除查詢。');}
};
function refresh(){if(!connected||busy||!flights.length)return;busy=true;pending=new Set(flights.map(f=>f.id));refreshControls();status('正在依序查詢，請保持本頁開啟。');window.postMessage({source:'fare-board',type:'refresh',jobs:flights.map(f=>({...normalizeQuery(f),sourceUrl:flightUrl(f)}))},location.origin);clearTimeout(watchdog);watchdog=setTimeout(()=>{busy=false;pending.clear();refreshControls();status('更新連線逾時。請重新整理並確認助手狀態。');},Math.min(flights.length*80000+30000,43200000));}
$('#refresh').onclick=refresh;
window.addEventListener('message',e=>{
  if(e.source!==window||e.origin!==location.origin||e.data?.source!=='fare-bridge')return;const m=e.data;
  if(m.type==='ready'){connected=Number(m.version)>=2;refreshControls();if(!connected)status('請更新為 v2 助手，才支援成人與孩童條件。');}
  if(m.type==='disconnected'){connected=false;busy=false;pending.clear();clearTimeout(watchdog);refreshControls();status('助手已中斷，請重新整理本頁。');}
  if(m.type==='progress'&&busy)status(String(m.message));
  if(m.type==='result'&&busy&&pending.has(m.id)){pending.delete(m.id);try{flights=flights.map(f=>f.id===m.id?mergeResult(f,m.result):f);save();render();}catch(error){status(error.message);}}
  if(m.type==='complete'&&busy){busy=false;pending.clear();clearTimeout(watchdog);refreshControls();status(String(m.message||'更新完成。'));}
});
$('#export').onclick=()=>download(`flight-notebook-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify({version:2,flights},null,2));
$('#import').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>10000000)throw Error('備份檔案過大。');const imported=parseBackup(JSON.parse(await file.text())),map=new Map(flights.map(f=>[f.id,f]));for(const f of imported){const current=map.get(f.id);if(!current||Date.parse(f.observedAt||'1970')>Date.parse(current.observedAt||'1970'))map.set(f.id,f);}flights=[...map.values()];saveAllowed=true;save();render();status(`已匯入 ${imported.length} 筆查詢，保留較新的報價。`);}catch(error){status(`匯入失敗：${error.message}`);}finally{e.target.value='';}};
setInterval(()=>{if($('#auto-refresh').checked&&document.visibilityState==='visible')refresh();},3600000);
try{
  const stored=localStorage.getItem(KEY);
  if(stored!==null){flights=parseBackup(JSON.parse(stored));status(`已載入此瀏覽器儲存的 ${flights.length} 筆航班查詢。`);}else {const response=await fetch('./seed.json');if(!response.ok)throw Error('初始資料載入失敗');flights=parseBackup({version:2,flights:await response.json()});save();}
}catch(error){saveAllowed=false;status(`無法讀取已存資料：${error.message}。原資料未覆寫；可匯入備份復原。`);}
render();window.postMessage({source:'fare-board',type:'ping'},location.origin);
