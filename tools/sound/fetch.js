// Fill in: L = [[ "<session>/<generation>", "<Signature value>" ], ...] in order; Q = the query string up to "Signature="; PACK = pack file name.
document.querySelectorAll('video,audio').forEach(v=>{try{v.pause()}catch(e){}});
const B='/database/workspace/455cc57a6fb1402388831a0601c81803/content_generation/', Q='?Expires=EXPIRES&KeyName=assets-cdn-key-1&Signature=', PACK='zz_pack.bin';
const L=[];
let out; try { const parts=await Promise.all(L.map(async ([p,s])=>{const r=await fetch(B+p+'/content.mp3'+Q+s); if(!r.ok) throw new Error('http '+r.status+' '+p.slice(-6)); return new Uint8Array(await r.arrayBuffer())}));
  const tot=parts.reduce((a,b)=>a+b.length+4,0), buf=new Uint8Array(tot); let o=0; for(const p of parts){ new DataView(buf.buffer).setUint32(o,p.length); o+=4; buf.set(p,o); o+=p.length; }
  let s=''; for(let i=0;i<buf.length;i+=8192) s+=String.fromCharCode.apply(null, buf.subarray(i,i+8192)); const b=btoa(s);
  setTimeout(()=>{location.href='https://github.com/lebobo88/String-Theory/upload/carrier/audio#st='+PACK+':'+b},400); out='going '+tot+' sizes '+parts.map(p=>p.length).join(','); } catch(e){ out='err '+e.message } out
