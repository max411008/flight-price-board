"use client";
import {useState} from 'react';
import {NativeSelect,NativeSelectOption} from '@/components/ui/native-select';
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from '@/components/ui/table';
import {combineTripPrices} from '@/lib/trip-prices';
type Flight={id:string;flight:string;origin:string;destination:string;departure:string;current:number|null;observedAt:string;history:{date:string;price:number}[];error?:string};
const price=(x:number|null)=>x===null?'缺資料':`NT$ ${x.toLocaleString('en-US')}`;
const time=(x:string)=>x?new Date(x).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}):'尚未查詢';
export default function TripPrices({flights}:{flights:Flight[]}){
 const [outId,setOutId]=useState(''),[backId,setBackId]=useState('');
 const out=flights.find(f=>f.id===outId)||flights[0];
 const returns=out?flights.filter(f=>f.id!==out.id&&f.origin===out.destination&&f.destination===out.origin&&f.departure>=out.departure):[];
 const back=returns.find(f=>f.id===backId)||returns[0];
 const history=out&&back?combineTripPrices(out.history,back.history):[];
 const complete=history.filter((p):p is typeof p & {total:number}=>p.total!==null);
 const low=complete.reduce<typeof complete[number]|null>((best,p)=>!best||p.total<best.total?p:best,null);
 const current=out?.current!=null&&back?.current!=null?out.current+back.current:null;
 const difference=current!==null&&low?current-low.total:null;
 return <section aria-labelledby="trip-heading" className="bg-white rounded-xl border overflow-hidden">
  <div className="p-5 md:p-6 border-b bg-[#f5f8ff]"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="trip-heading" className="text-xl font-semibold">去回總價比較</h2><span className="text-sm text-slate-500">兩張單程票合計 · 1 位成人 · TWD</span></div>
   <div className="flex flex-wrap gap-4 mt-5">
    <label className="min-w-0 flex-1 text-sm space-y-2"><span>去程</span><NativeSelect aria-label="去程航班" className="max-w-full bg-white h-11" value={out?.id||''} onChange={e=>{setOutId(e.target.value);setBackId('')}} disabled={!flights.length}>{!flights.length&&<NativeSelectOption value="">請先新增航班</NativeSelectOption>}{flights.map(f=><NativeSelectOption key={f.id} value={f.id}>{f.departure} · {f.flight} · {f.origin} — {f.destination}</NativeSelectOption>)}</NativeSelect></label>
    <label className="min-w-0 flex-1 text-sm space-y-2"><span>回程</span><NativeSelect aria-label="回程航班" className="max-w-full bg-white h-11" value={back?.id||''} onChange={e=>setBackId(e.target.value)} disabled={!returns.length}>{!returns.length&&<NativeSelectOption value="">尚無符合航線與日期的回程</NativeSelectOption>}{returns.map(f=><NativeSelectOption key={f.id} value={f.id}>{f.departure} · {f.flight} · {f.origin} — {f.destination}</NativeSelectOption>)}</NativeSelect></label>
   </div>
  </div>
  {!out||!back?<p className="p-6 text-slate-500">新增反向航線、日期不早於去程的回程航班，即可比較整趟總價。</p>:<>
   <div className="p-5 md:p-6 grid gap-5 sm:grid-cols-3"><div><p className="text-sm text-slate-500 mb-2">最近查詢合計</p><p className="text-3xl font-semibold text-blue-700 tabular-nums">{price(current)}</p><p className="text-sm text-slate-500 mt-2">{price(out.current)} ＋ {price(back.current)}</p></div><div><p className="text-sm text-slate-500 mb-2">同一觀察日最低合計</p><p className="text-2xl font-semibold tabular-nums">{price(low?.total??null)}</p><p className="text-sm text-slate-500 mt-2">{low?`${low.date} · ${complete.length} 天可比`:'尚無兩段同一天的記錄'}</p></div><div><p className="text-sm text-slate-500 mb-2">最近合計較歷史最低</p><p className="text-2xl font-semibold tabular-nums">{difference===null?'—':`${difference>=0?'+':'−'} NT$ ${Math.abs(difference).toLocaleString('en-US')}`}</p><p className="text-sm text-slate-500 mt-2">歷史依兩段相同觀察日期相加</p></div></div>
   <p className="px-5 md:px-6 pb-4 text-sm text-slate-500 leading-6">去程資料時間：{time(out.observedAt)}；回程：{time(back.observedAt)}。{out.error||back.error?'部分航班上次更新未成功，合計沿用已保存價格。':'兩段最近價格可能來自不同查詢時間。'}</p>
   <div className="max-h-[330px] overflow-y-auto border-t" tabIndex={0} role="region" aria-label="去回逐日價格表"><Table><TableHeader className="bg-slate-50"><TableRow><TableHead className="pl-5 md:pl-6">觀察日期</TableHead><TableHead>去程 {out.flight}</TableHead><TableHead>回程 {back.flight}</TableHead><TableHead>整趟合計</TableHead></TableRow></TableHeader><TableBody><TableRow className="bg-blue-50 font-semibold"><TableCell className="pl-5 md:pl-6 py-4">最近查詢</TableCell><TableCell className="whitespace-nowrap tabular-nums">{price(out.current)}</TableCell><TableCell className="whitespace-nowrap tabular-nums">{price(back.current)}</TableCell><TableCell className="text-blue-700 whitespace-nowrap tabular-nums">{price(current)}</TableCell></TableRow>{[...history].reverse().map(p=><TableRow key={p.date}><TableCell className="pl-5 md:pl-6 py-3 whitespace-nowrap">{p.date}{p.date===low?.date&&<span className="ml-2 text-xs text-blue-700">最低合計</span>}</TableCell><TableCell className="whitespace-nowrap tabular-nums">{price(p.outbound)}</TableCell><TableCell className="whitespace-nowrap tabular-nums">{price(p.inbound)}</TableCell><TableCell className="font-semibold whitespace-nowrap tabular-nums">{price(p.total)}</TableCell></TableRow>)}</TableBody></Table></div>
   <p className="px-5 md:px-6 py-4 text-sm text-slate-500 leading-6">缺少任一段當日價格，就不計算該日總價。這是分開購買兩張單程的合計，不是航空公司來回套票報價。</p>
  </>}
 </section>;
}
