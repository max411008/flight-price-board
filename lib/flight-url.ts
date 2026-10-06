// A selected-flight Google Flights URL: one adult, one-way, economy, TWD.
export function flightUrl(f:{flight:string;departure:string;origin:string;destination:string}){
 const match=f.flight.match(/^([A-Z0-9]{2})(\d{1,4}[A-Z]?)$/);if(!match)throw Error('航班編號格式錯誤');
 const enc=new TextEncoder();const v=(n:number):number[]=>n<128?[n]:[(n&127)|128,...v(Math.floor(n/128))];
 const n=(i:number,x:number)=>[...v(i*8),...v(x)];const b=(i:number,x:number[])=>[...v(i*8+2),...v(x.length),...x];const s=(i:number,x:string)=>b(i,[...enc.encode(x)]);
 const airport=(x:string)=>[...n(1,1),...s(2,x)];
 const selected=[...s(1,f.origin),...s(2,f.departure),...s(3,f.destination),...s(5,match[1]),...s(6,match[2])];
 const leg=[...s(2,f.departure),...b(4,selected),...s(6,match[1]),...b(13,airport(f.origin)),...b(14,airport(f.destination))];
 const body=[...n(1,28),...n(2,2),...b(3,leg),...n(8,1),...n(9,1),...n(14,1),...b(16,[8,255,255,255,255,255,255,255,255,255,1]),...n(19,2)];
 const tfs=btoa(String.fromCharCode(...body)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
 return `https://www.google.com/travel/flights/booking?tfs=${tfs}&hl=zh-TW&curr=TWD`;
}
