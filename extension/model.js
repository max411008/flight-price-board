export function normalizeParty(p) {
  if (!p || !Number.isInteger(p.adults) || p.adults < 1 || p.adults > 9 || !Array.isArray(p.children) || p.adults + p.children.length > 9) throw Error('請選擇至少 1 位成人，每筆合計最多 9 人。');
  const children = p.children.map(c => {
    if (!c || !Number.isInteger(c.age) || c.age < 0 || c.age > 17) throw Error('請填寫每位孩童的歲數（0–17 歲）。');
    if (c.age < 2 && !['seat','lap'].includes(c.seat)) throw Error('請選擇嬰兒是否占位。');
    return {age:c.age, seat:c.age < 2 ? c.seat : 'seat'};
  }).sort((a,b)=>a.age-b.age || a.seat.localeCompare(b.seat));
  if(children.filter(c=>c.seat==='lap').length > p.adults) throw Error('不占位嬰兒人數不可超過成年旅客人數。');
  return {adults:p.adults,children};
}
export const partyKey = p => JSON.stringify(normalizeParty(p));
export const partyLabel = p => `${p.adults} 成人` + (p.children.length ? ` · ${p.children.length} 孩童（${p.children.map(c=>`${c.age} 歲${c.age<2?(c.seat==='lap'?'不占位':'占位'):''}`).join('、')}）` : '');
// Google Flights field 8: adult=1, child=2, lap infant=3, seated infant=4.
export function passengerTypes(p) {p=normalizeParty(p);return [...Array(p.adults).fill(1),...p.children.map(c=>c.age>=12?1:c.age>=2?2:c.seat==='lap'?3:4)].sort();}
export function normalizeQuery(q) {
  const flight=String(q.flight||'').trim().toUpperCase(), origin=String(q.origin||'').trim().toUpperCase(), destination=String(q.destination||'').trim().toUpperCase(), departure=q.departure;
  if(!/^[A-Z0-9]{2}\d{1,4}[A-Z]?$/.test(flight)) throw Error('航班編號格式不正確，例如 JX201。');
  if(!/^[A-Z]{3}$/.test(origin)||!/^[A-Z]{3}$/.test(destination)||origin===destination) throw Error('請輸入不同的出發與抵達機場三碼代號。');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(departure)||!Number.isFinite(Date.parse(departure))||new Date(departure).toISOString().slice(0,10)!==departure) throw Error('起飛日期不正確。');
  const party=normalizeParty(q.party), id=`${flight}_${departure}_${origin}_${destination}_${party.adults}_${party.children.map(c=>c.age+(c.seat==='lap'?'L':'S')).join('-')||'none'}`;
  return {id,flight,departure,origin,destination,party};
}
export function flightUrl(input) {
  const f=normalizeQuery(input), match=f.flight.match(/^([A-Z0-9]{2})(\d{1,4}[A-Z]?)$/);
  const enc=new TextEncoder(),v=n=>n<128?[n]:[(n&127)|128,...v(Math.floor(n/128))];
  const n=(i,x)=>[...v(i*8),...v(x)],b=(i,x)=>[...v(i*8+2),...v(x.length),...x],s=(i,x)=>b(i,[...enc.encode(x)]);
  const airport=x=>[...n(1,1),...s(2,x)];
  const selected=[...s(1,f.origin),...s(2,f.departure),...s(3,f.destination),...s(5,match[1]),...s(6,match[2])];
  const leg=[...s(2,f.departure),...b(4,selected),...s(6,match[1]),...b(13,airport(f.origin)),...b(14,airport(f.destination))];
  const body=[...n(1,28),...n(2,2),...b(3,leg),...passengerTypes(f.party).flatMap(t=>n(8,t)),...n(9,1),...n(14,1),...b(16,[8,255,255,255,255,255,255,255,255,255,1]),...n(19,2)];
  return `https://www.google.com/travel/flights/booking?tfs=${btoa(String.fromCharCode(...body)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')}&hl=zh-TW&curr=TWD`;
}
export function compatible(a,b) {return a.id!==b.id && a.origin===b.destination && a.destination===b.origin && b.departure>=a.departure && partyKey(a.party)===partyKey(b.party);}
export function combineTripPrices(outbound,inbound) {
  const out=new Map(outbound.map(p=>[p.date,p.price])), back=new Map(inbound.map(p=>[p.date,p.price]));
  return [...new Set([...out.keys(),...back.keys()])].sort().map(date=>({date,outbound:out.get(date)??null,inbound:back.get(date)??null,total:out.has(date)&&back.has(date)?out.get(date)+back.get(date):null}));
}
export function validatePoints(points) {
  if(!Array.isArray(points)||points.length>10000)throw Error('歷史紀錄格式不正確。');
  return points.map(p=>{if(!p||!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||!Number.isFinite(Date.parse(p.date))||new Date(p.date).toISOString().slice(0,10)!==p.date||!Number.isFinite(p.price)||p.price<=0||p.price>10000000)throw Error('歷史價格或日期不正確。');return {date:p.date,price:p.price}});
}
export function mergeResult(q,result) {
  if(result.current==null) return {...q,error:String(result.error||'未取得報價。').slice(0,300)};
  const actual=normalizeQuery(result);
  if(actual.id!==q.id) throw Error('更新結果的航班或乘客條件不符，已拒絕儲存。');
  if(!Number.isFinite(result.current)||result.current<=0||result.current>10000000||!Number.isFinite(Date.parse(result.observedAt)))throw Error('來源價格格式不正確。');
  const history=validatePoints(result.history), merged=new Map(q.history.map(p=>[p.date,p]));
  history.forEach(p=>merged.set(p.date,p));
  return {...q,current:result.current,history:[...merged.values()].sort((a,b)=>a.date.localeCompare(b.date)),observedAt:result.observedAt,error:result.error?String(result.error).slice(0,300):null};
}
export function parseBackup(data) {
  if(data.version!==2||!Array.isArray(data.flights)||data.flights.length>500)throw Error('這不是支援的航價簿 v2 備份。');
  const ids=new Set();return data.flights.map(f=>{
    const q=normalizeQuery(f);if(ids.has(q.id))throw Error('備份包含重複查詢。');ids.add(q.id);
    const current=f.current??null;if(current!==null&&(!Number.isFinite(current)||current<=0||current>10000000))throw Error('備份價格格式不正確。');
    if(current!==null&&!Number.isFinite(Date.parse(f.observedAt)))throw Error('備份缺少價格查詢時間。');
    return {...q,current,history:validatePoints(f.history),observedAt:current===null?null:f.observedAt,error:f.error?String(f.error).slice(0,300):null};
  });
}
