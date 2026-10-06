import { env } from "cloudflare:workers";
import initial from "./seed.json";
export type Flight = Omit<typeof initial[number],'current'> & {current:number|null;error?:string};
export function db(){if(!env.DB)throw Error('儲存服務暫時無法使用');return env.DB}
export async function list(){const d=db();await d.batch(initial.map(f=>d.prepare('INSERT OR IGNORE INTO flights(id,data,archived) VALUES(?,?,0)').bind(f.id,JSON.stringify(f))));const rows=await d.prepare('SELECT data FROM flights WHERE archived=0 ORDER BY rowid').all<{data:string}>();return rows.results.map(r=>JSON.parse(r.data) as Flight)}
export async function get(id:string){const row=await db().prepare('SELECT data FROM flights WHERE id=?').bind(id).first<{data:string}>();return row?JSON.parse(row.data) as Flight:null}
export async function put(f:Flight){await db().prepare('INSERT INTO flights(id,data,archived) VALUES(?,?,0) ON CONFLICT(id) DO UPDATE SET data=excluded.data, archived=0').bind(f.id,JSON.stringify(f)).run();return f}
export async function save(f:Flight){await db().prepare('UPDATE flights SET data=? WHERE id=?').bind(JSON.stringify(f),f.id).run();return f}
export function sameOrigin(r:Request){const origin=r.headers.get('origin');return !origin||origin===new URL(r.url).origin}
export function unavailable(e:unknown){console.error('Fare storage error',e);return Response.json({error:'儲存服務暫時無法使用，請稍後再試。'},{status:503})}
