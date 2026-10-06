import {mkdir,readFile,writeFile,cp,readdir,rm} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'docs');
await cp(path.join(root,'src/model.js'),path.join(root,'extension/model.js'));
// This script only replaces the generated docs folder inside this repository.
if(path.dirname(out)!==root||path.basename(out)!=='docs')throw Error('Unsafe build target');
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
for(const name of ['index.html','icon.svg','seed.json','src'])await cp(path.join(root,name),path.join(out,name),{recursive:true});
await writeFile(path.join(out,'.nojekyll'),'');
// Dependency-free ZIP (stored entries): the extension can be unzipped by Windows, Chrome and Edge users.
const crc32=data=>{let c=0xffffffff;for(const b of data){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;};
const locals=[],central=[];let offset=0;
const names=(await readdir(path.join(root,'extension'))).filter(n=>!n.startsWith('.')).sort();
for(const name of names){const filename=Buffer.from(name),data=await readFile(path.join(root,'extension',name)),crc=crc32(data),header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);header.writeUInt16LE(0x21,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(data.length,18);header.writeUInt32LE(data.length,22);header.writeUInt16LE(filename.length,26);locals.push(header,filename,data);const entry=Buffer.alloc(46);entry.writeUInt32LE(0x02014b50);entry.writeUInt16LE(20,4);entry.writeUInt16LE(20,6);entry.writeUInt16LE(0x800,8);entry.writeUInt16LE(0x21,14);entry.writeUInt32LE(crc,16);entry.writeUInt32LE(data.length,20);entry.writeUInt32LE(data.length,24);entry.writeUInt16LE(filename.length,28);entry.writeUInt32LE(offset,42);central.push(entry,filename);offset+=header.length+filename.length+data.length;}
const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(names.length,8);end.writeUInt16LE(names.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
const zip=Buffer.concat([...locals,directory,end]);await writeFile(path.join(out,'fare-bridge.zip'),zip);await writeFile(path.join(root,'fare-bridge.zip'),zip);
console.log('Built docs/ for GitHub Pages; extension ZIP included.');
