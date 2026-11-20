(function(){
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const rp=(t,a,b)=>cl((t-a)/(b-a),0,1);
const $=id=>document.getElementById(id);

// ---------- palet ----------
const PAL={K:[11,14,19,255],W:[242,246,250,255],s:[205,216,227,255],S:[150,166,184,255],V:[10,13,18,255],v:[34,48,62,255],
  D:[27,36,48,255],d:[16,22,30,255],C:[56,225,255,255],c:[190,248,255,255],B:[18,110,132,255],X:[0,0,0,90],
  L:[56,225,255,46],m:[150,166,184,150],g:[91,228,155,255]};

// ---------- mesin piksel (permukaan bisa diganti) ----------
let GW,GH,G;
function surf(w,h){return {w,h,g:new Array(w*h).fill(null)}}
function use(S){GW=S.w;GH=S.h;G=S.g;G.fill(null)}
function set(x,y,c){x=Math.floor(x);y=Math.floor(y);if(x>=0&&y>=0&&x<GW&&y<GH)G[y*GW+x]=c}
function P(){return new Map()}
function put(p,x,y,c){if(x>=0&&y>=0&&x<GW&&y<GH)p.set(y*GW+x,c)}
function ell(p,cx,cy,rx,ry,c){for(let y=Math.floor(cy-ry-1);y<=cy+ry+1;y++)for(let x=Math.floor(cx-rx-1);x<=cx+rx+1;x++){
  const dx=(x+.5-cx)/rx,dy=(y+.5-cy)/ry;if(dx*dx+dy*dy<=1)put(p,x,y,c)}}
function rect(p,x0,y0,x1,y1,c){for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)put(p,x,y,c)}
function poly(p,pts,c){const xs=pts.map(a=>a[0]),ys=pts.map(a=>a[1]);
  for(let y=Math.floor(Math.min(...ys));y<=Math.max(...ys);y++)for(let x=Math.floor(Math.min(...xs));x<=Math.max(...xs);x++){
    const px=x+.5,py=y+.5;let ins=false;
    for(let i=0,j=pts.length-1;i<pts.length;j=i++){const [xi,yi]=pts[i],[xj,yj]=pts[j];
      if(((yi>py)!=(yj>py))&&(px<(xj-xi)*(py-yi)/(yj-yi)+xi))ins=!ins}
    if(ins)put(p,x,y,c)}}
function seg(p,x0,y0,x1,y1,r,c){const vx=x1-x0,vy=y1-y0,L2=vx*vx+vy*vy||1;
  for(let y=Math.floor(Math.min(y0,y1)-r-1);y<=Math.max(y0,y1)+r+1;y++)for(let x=Math.floor(Math.min(x0,x1)-r-1);x<=Math.max(x0,x1)+r+1;x++){
    const px=x+.5-x0,py=y+.5-y0,u=cl((px*vx+py*vy)/L2,0,1),dx=px-u*vx,dy=py-u*vy;if(dx*dx+dy*dy<=r*r)put(p,x,y,c)}}
function stamp(p,outline=true){
  if(outline)for(const k of p.keys()){const x=k%GW,y=(k/GW)|0;
    for(const [ax,ay] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+ax,ny=y+ay;if(nx<0||ny<0||nx>=GW||ny>=GH)continue;
      if(!p.has(ny*GW+nx))set(nx,ny,'K')}}
  for(const [k,c] of p)G[k]=c}
function shade(p,fn,c){for(const [k,col] of p){const x=k%GW,y=(k/GW)|0;if(col==='W'&&fn(x,y))p.set(k,c)}}
function blit(canvas,S){const ctx=canvas.getContext('2d');const img=ctx.createImageData(S.w,S.h);
  for(let i=0;i<S.w*S.h;i++){const c=S.g[i];if(!c)continue;const q=PAL[c],o=i*4;img.data[o]=q[0];img.data[o+1]=q[1];img.data[o+2]=q[2];img.data[o+3]=q[3]}
  ctx.putImageData(img,0,0)}

// ---------- NERU ----------
function drawNeru(o){
  const bx=0,by=0,hy=(o.hy|0),hx=(o.hx|0);
  for(let x=10;x<46;x++){const d=Math.abs(x+.5-28)/18;if(d<1)set(x,57,'X');if(d<.75)set(x,58,'X')}
  const tf=o.tail;let T=P();const tp=[[38,50],[45,48],[49,43],[50+tf,37],[48+tf*2,32]];
  for(let i=0;i<tp.length-1;i++)seg(T,tp[i][0],tp[i][1],tp[i+1][0],tp[i+1][1],2.6,'D');
  seg(T,49+tf,40,50+tf*1.5,36,2.6,'C');stamp(T);
  for(const fx of [15,41]){let F=P();ell(F,fx,53,5.2,5,'W');stamp(F);
    let S=P();ell(S,fx+(fx<28?-.5:.5),53.5,3.4,3.3,'D');stamp(S,false);
    for(const [a,b] of [[0,2],[-1,2],[-2,-1],[0,-2],[2,-1]])set(fx+a,53+b,'C')}
  let L=P();ell(L,21.5,50,7,6,'W');ell(L,34.5,50,7,6,'W');shade(L,(x,y)=>y>=54,'s');stamp(L);
  let Bd=P();ell(Bd,28,42,8.5,8.5,'W');rect(Bd,21,42,35,49,'W');shade(Bd,(x)=>x>=33,'s');stamp(Bd);
  for(let x=25;x<=31;x++)for(let y=43;y<=46;y++)set(x,y,'d');
  for(const [a,b] of [[26,44],[26,45],[27,45],[28,44],[28,45],[29,44],[30,45],[31,44]])set(a,b,'C');
  let Co=P();rect(Co,22,34,34,36,'D');stamp(Co);
  for(const [a,b] of [[26,35],[27,36],[28,36],[29,36],[30,35]])set(a,b,'C');
  function arm(sx,sy,ang,palm){const a=ang*Math.PI/180,len=9.5,ex=sx-Math.sin(a)*len,ey=sy+Math.cos(a)*len;
    let A=P();seg(A,sx,sy,ex,ey,2.3,'W');ell(A,ex,ey,3,3,'W');stamp(A);
    set(sx-Math.sin(a)*len*.5,sy+Math.cos(a)*len*.5,'D');
    if(palm){set(ex,ey,'C');set(ex-1,ey-1,'C');set(ex+1,ey-1,'C')}}
  arm(21,38,o.aL,o.aL>90);arm(35,38,o.aR,o.aR<-90);
  for(const s of [-1,1]){const cx=28+hx,tw=s<0?o.eL:o.eR;
    let E=P();poly(E,[[cx+s*15,hy+15],[cx+s*12.5+s*tw,hy+.5],[cx+s*3,hy+9]],'W');stamp(E);
    let I=P();poly(I,[[cx+s*13,hy+12],[cx+s*11.7+s*tw,hy+4],[cx+s*6,hy+9.5]],'D');stamp(I,false);
    for(let k=0;k<5;k++)set(cx+s*(12.4-k*.15)+s*tw*(1-k/5),hy+5+k*1.4,'C')}
  let Hm=P();ell(Hm,28+hx,21+hy,15.5,13.2,'W');shade(Hm,(x,y)=>y>=30+hy,'s');stamp(Hm);
  for(let x=23;x<=33;x++)set(x+hx,9+hy,'W');for(let x=27;x<=29;x++)set(x+hx,8+hy,'D');
  for(let x=20;x<=24;x++)set(x+hx,10+hy,'c');
  const fx=o.fx|0;let Vi=P();ell(Vi,28+hx+fx*.5,21.5+hy,11.2,9.3,'V');stamp(Vi);
  for(const [a,b] of [[21,16],[22,15],[23,15],[24,14]])set(a+hx+fx,b+hy,'v');
  const ex=hx+fx,ey=hy+(o.ly|0);
  for(const [cx,big] of [[23,0],[33,o.big|0]]){
    if(o.happy){set(cx-2+ex,21+ey,'C');set(cx-1+ex,20+ey,'c');set(cx+ex,20+ey,'c');set(cx+1+ex,21+ey,'C');set(cx-2+ex,22+ey,'B');set(cx+1+ex,22+ey,'B')}
    else if(o.blink){set(cx-1+ex,21+ey,'C');set(cx+ex,21+ey,'C');set(cx-2+ex,21+ey,'B');set(cx+1+ex,21+ey,'B')}
    else{for(let y=18-big;y<=22;y++)for(let x=cx-1;x<=cx;x++)set(x+ex,y+ey,y===18-big?'c':'C')}}
  for(const [a,b] of [[18,23],[19,23],[18,25],[19,24],[37,23],[38,23],[37,24],[38,25]])set(a+ex,b+hy,'C');
  const mx=28+ex,my=24+hy;
  if(!o.mouth){for(const [a,b] of [[-2,0],[-1,1],[0,0],[1,1],[2,0]])set(mx+a,my+b,'C')}
  else{const h=o.mouth,w=h>=3?2:1;for(let x=mx-w-1;x<=mx+w+1;x++)set(x,my,'C');
    for(let y=my+1;y<=my+h;y++){set(mx-w-1,y,'C');set(mx+w+1,y,'C');for(let x=mx-w;x<=mx+w;x++)set(x,y,'B')}
    for(let x=mx-w;x<=mx+w;x++)set(x,my+h+1,'C')}
  for(const [cx,sx] of [[12.5,o.hpL],[43.5,o.hpR]]){let Hp=P();ell(Hp,cx+hx+sx,22+hy,5.3,5.5,'W');stamp(Hp);
    let In=P();ell(In,cx+hx+sx,22+hy,3.4,3.6,'C');stamp(In,false);let Ii=P();ell(Ii,cx+hx+sx,22+hy,2.4,2.6,'D');stamp(Ii,false);
    set(cx+hx+sx-1,21+hy,'c')}
}

// ---------- MEJA BELAJAR ----------
function drawDesk(o){
  for(let x=2;x<70;x++){set(x,57,'X');if(x>4&&x<67)set(x,58,'X')}
  // kaki & laci
  for(const lx of [5,62]){let Lg=P();rect(Lg,lx,37,lx+3,56,'W');shade(Lg,(x)=>x===lx+3,'s');stamp(Lg)}
  let Dr=P();rect(Dr,44,37,61,50,'W');shade(Dr,(x)=>x>=59,'s');stamp(Dr);
  for(let x=45;x<=60;x++)set(x,43,'K');for(let x=51;x<=54;x++){set(x,40,'D');set(x,46,'D')}
  // papan meja
  let Tp=P();rect(Tp,1,33,70,36,'W');shade(Tp,(x,y)=>y===36,'s');stamp(Tp);
  for(let x=3;x<=68;x+=1)if(x%9===0)set(x,34,'s');
  // tumpukan buku
  let B1=P();rect(B1,3,28,16,32,'D');stamp(B1);for(let x=4;x<=15;x++)set(x,30,'C');
  let B2=P();rect(B2,5,24,15,27,'W');shade(B2,(x,y)=>y===26,'S');stamp(B2);for(let y=24;y<=27;y++)set(14,y,'C');
  let B3=P();rect(B3,4,20,13,23,'C');stamp(B3);for(let x=5;x<=12;x++)set(x,21,'c');
  // laptop
  let Sc=P();rect(Sc,19,11,43,30,'D');stamp(Sc);
  let In=P();rect(In,21,13,41,28,'V');stamp(In,false);
  let Kb=P();rect(Kb,16,31,46,32,'S');stamp(Kb);
  for(let x=18;x<=44;x+=2)set(x,31,'s');
  set(31,29,'C');set(32,29,'C'); // LED
  // isi layar: baris teks + kursor
  const n=o.lines|0, lens=[14,18,11,17,15,9,16];
  for(let i=0;i<Math.min(n,6);i++){const y=15+i*2;const L=i===n-1?Math.max(2,Math.round(lens[i]*o.partial)):lens[i];
    for(let x=23;x<23+L&&x<=40;x++)set(x,y,i===n-1?'C':(o.dim?'B':'c'))}
  if(o.cursor){const i=Math.max(0,Math.min(n,6)-1),y=15+i*2,L=n?Math.max(2,Math.round(lens[i]*(i===n-1?o.partial:1))):0;
    set(23+L+1,y,'c');set(23+L+1,y-1,'c')}
  if(o.ok){for(const [a,b] of [[35,24],[36,25],[37,26],[38,25],[39,24],[40,23]])set(a,b,'g')}
  // mug + uap
  let Mg=P();rect(Mg,48,26,53,32,'W');shade(Mg,(x)=>x>=53,'s');stamp(Mg);
  for(let x=48;x<=53;x++)set(x,29,'C');set(55,28,'K');set(55,29,'K');set(55,30,'K');set(54,27,'K');set(54,31,'K');
  const st=o.steam|0;for(let k=0;k<3;k++){const y=24-k*2-(st%2);set(50+((k+st)%2),y,'m')}
  // lampu belajar
  let Lb=P();ell(Lb,64,32,4.5,1.6,'D');stamp(Lb);
  let Ar=P();seg(Ar,64,31,67,19,1,'S');seg(Ar,67,19,60,11,1,'S');stamp(Ar);
  let Hd=P();poly(Hd,[[54,10],[61,7],[63,11],[57,14]],'D');stamp(Hd);
  for(const [a,b] of [[56,13],[57,14],[58,13]])set(a,b,'c');
  // cahaya lampu (transparan)
  for(let y=15;y<=32;y++){const k=(y-15)/17,x0=Math.round(56-k*7),x1=Math.round(59+k*8);for(let x=x0;x<=x1;x++)if(!G[y*GW+x]||G[y*GW+x]==='L')set(x,y,'L')}
}

// ---------- koreografi per adegan ----------
const SC=window.DURS;
const AUD=[null,'a01','a02','a03','a04','a05','a06','a07','a08','a09','a10','a11','a12'];
// [mulai, selesai, aksi] dalam waktu adegan
const ACT={
 1:[[0,.5,'hop'],[.15,1.4,'wave'],[3.3,4.5,'ask']],
 2:[[1.5,2.45,'shake'],[2.85,4.5,'point']],
 3:[[.2,.85,'point'],[.85,3.25,'desk']],
 4:[[.4,1.9,'shake'],[2.3,4.6,'ask'],[4.6,6.9,'point']],
 5:[[.2,1.4,'wave'],[1.4,3.0,'point']],
 6:[[.15,1.0,'point'],[1.0,5.0,'desk']],
 7:[[.15,.9,'point'],[.9,4.6,'desk']],
 8:[[.15,.9,'point'],[.9,4.7,'desk']],
 9:[[.15,.9,'point'],[.9,4.35,'desk']],
 10:[[.2,2.3,'point'],[2.35,2.85,'hop'],[2.4,4.2,'wave'],[4.2,5.29,'happy']],
 11:[[.6,3.3,'point'],[3.3,4.2,'nod'],[4.3,5.72,'happy']],
 12:[[.1,2.0,'wave'],[3.3,5.4,'point'],[5.5,6.0,'hop'],[5.5,6.83,'happy']],
};
// isi layar laptop per adegan
function screen(si,lt){
  const typ=(st,dur)=>cl((lt-st)/dur,0,1);
  if(si===3) return {lines:1,partial:typ(.9,1.0),cursor:true};
  if(si===4) return {lines:3,partial:1,dim:true,cursor:false};
  if(si>=6&&si<=9){const n=si-5;return {lines:n,partial:typ(.7,1.6),cursor:true}}
  if(si===10) return {lines:5,partial:1,ok:lt>2.4};
  if(si===11) return {lines:4,partial:1,cursor:true};
  return {lines:2,partial:1,dim:true,cursor:true};
}
const BL=[1.9,4.3,6.1];
const CAPS=[...document.querySelectorAll('.scene')].map(s=>{const c=s.querySelector('.cap span');return c?c.textContent:''});
const SN=surf(56,60), SD=surf(72,60);
const base=window.render;

window.render=function(t){
  base(t);
  let acc=0,idx=0;for(;idx<SC.length-1;idx++){if(t<acc+SC[idx])break;acc+=SC[idx]}
  const lt=t-acc, si=idx+1, f=Math.floor(t*12), ts=Math.floor(lt*12)/12;
  const sec=document.querySelectorAll('.scene')[idx];
  const light=sec.classList.contains('light');
  document.getElementById('floor').style.setProperty('--fl',light?'#C9D1D9':'#1c2733');
  $('pglow').style.opacity=light?0:1;
  if(window.LAND){document.body.style.background=light?'#F2F2F0':'#080808';document.body.style.setProperty('--fg',light?'#080808':'#fff');$('prog').style.width=(cl(t/window.TOTAL,0,1)*1920)+'px'}
  // mulut
  const e=ENV[AUD[si]]; const k=Math.round((ts-.25)*30); const m=(k>=0&&k<e.length)?e[k]:0;
  const mouth=m<.08?0:m<.35?1:m<.7?2:3;
  const A={};for(const [a,b,n] of (ACT[si]||[]))if(ts>=a&&ts<b)A[n]=[a,b];
  let jy=0;if(A.hop){const p=(ts-A.hop[0])/(A.hop[1]-A.hop[0]);jy=-Math.round(Math.sin(p*Math.PI)*(si===1?12:6))}
  const breathe=Math.floor(t/.5)%2;
  let blink=false;for(const b of BL)if(lt>=b&&lt<b+.12)blink=true;
  const happy=!!(A.wave||A.happy||(si===1&&lt<.5));
  let fx=0,ly=0,hx=0,hy=0,big=0,aL=10+(breathe?0:2),aR=-10-(breathe?0:2);
  if(A.shake)fx=(f%4<2)?-2:2;
  if(A.point){fx=-2;ly=-2;hx=-1;hy=-1;aL=(f%8<4)?122:127}
  if(A.ask){fx=1;ly=-1;hx=1;hy=-1;big=1}
  if(A.desk){fx=2;ly=1;hx=1;aR=(f%3===0)?-62:(f%3===1?-70:-56)}
  if(A.wave)aR=(f%4<2)?-125:-150;
  if(A.nod)hy+=(f%4<2)?1:-1;
  hy+=(mouth>=2&&f%2===0?-1:0)+(breathe?0:1);
  const tw=c=>lt>=c&&lt<c+.17;
  use(SN);
  drawNeru({hy,hx,tail:[-1,0,1,0][Math.floor(t*5)%4],aL,aR,eL:tw(2.6)?-2:0,eR:tw(3.7)?2:0,
    fx,ly,big,happy,blink:blink&&!happy,mouth,hpL:fx?1:0,hpR:fx?-1:0});
  blit($('spr'),SN);
  $('spr').style.transform=`translateY(${jy*($('spr').offsetWidth/56)}px)`;
  const scr=screen(si,lt);
  use(SD);drawDesk({...scr,cursor:scr.cursor&&Math.floor(t*2.5)%2===0,steam:Math.floor(t*3)});
  blit($('desk'),SD);
  // dialog: mengetik mengikuti suara
  const txt=CAPS[idx]||'', dur=(e?e.length/30:3)*0.92;
  const p=cl((lt-.25)/dur,0,1), n=Math.floor(p*txt.length);
  $('dt').textContent=txt.slice(0,n);
  $('nx').style.opacity=(p>=1&&Math.floor(t*3)%2===0)?1:0;
  $('dlg').style.opacity=lt<.12&&idx===0?0:1;
};
window.render(0);
})();
