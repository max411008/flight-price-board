type Point = {date:string;price:number};
export function combineTripPrices(outbound:Point[],inbound:Point[]){
 const out=new Map(outbound.map(p=>[p.date,p.price]));
 const back=new Map(inbound.map(p=>[p.date,p.price]));
 return [...new Set([...out.keys(),...back.keys()])].sort().map(date=>{
  const outboundPrice=out.get(date)??null,inboundPrice=back.get(date)??null;
  return {date,outbound:outboundPrice,inbound:inboundPrice,total:outboundPrice!==null&&inboundPrice!==null?outboundPrice+inboundPrice:null};
 });
}
