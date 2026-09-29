import {ISLANDS,islandLessons} from './content.js';
/** Small original canvas world. All locations also have keyboard-accessible DOM buttons. */
export class World {
  constructor(canvas,state,onSelect,onMove,onMessage){
    this.canvas=canvas; this.ctx=canvas.getContext('2d');this.state=state;this.onSelect=onSelect;this.onMove=onMove;this.onMessage=onMessage;
    this.boat={...state.position};this.target=null;this.keys=new Set();this.time=0;this.pulse=0;
    this.resize=new ResizeObserver(()=>this.fit());this.resize.observe(canvas);
    canvas.addEventListener('pointerdown',e=>{
      canvas.focus(); const r=canvas.getBoundingClientRect(); const p={x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};
      const hit=ISLANDS.find(i=>Math.hypot((i.x-p.x)*1.4,i.y-p.y)<.135);
      this.sail(hit?.id,p);
      if(!hit && Math.hypot(p.x-.49,p.y-.22)<.08)this.onMessage('A tiny moonfish follows your boat. It appears to have mistaken you for its mother.');
    });
    canvas.addEventListener('keydown',e=>{
      const key=e.key.toLowerCase();
      if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','enter',' '].includes(key)){
        e.preventDefault();this.keys.add(key);this.target=null;
        if(key==='enter'||key===' '){const near=[...ISLANDS].sort((a,b)=>this.distance(a)-this.distance(b))[0];if(this.distance(near)<.24)this.onSelect(near.id);else this.onMessage('Sail closer to an island, or choose a destination below the map.');}
      }
    });
    canvas.addEventListener('keyup',e=>this.keys.delete(e.key.toLowerCase()));
    canvas.addEventListener('blur',()=>this.keys.clear());
    let last=0;
    const loop=now=>{const dt=Math.min((now-last)/1000,.04);last=now;this.time+=dt;this.update(dt);this.draw();requestAnimationFrame(loop);};
    requestAnimationFrame(loop);
  }
  fit(){const r=this.canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=r.width*dpr;this.canvas.height=r.height*dpr;this.w=r.width;this.h=r.height;this.ctx.setTransform(dpr,0,0,dpr,0,0);}
  distance(p){return Math.hypot(p.x-this.boat.x,p.y-this.boat.y);}
  sail(id,p){const island=ISLANDS.find(i=>i.id===id);this.target=island?{x:island.x,y:Math.min(.9,island.y+.11)}:p; if(island)this.onSelect(id);}
  update(dt){
    const before={...this.boat};
    if(this.target){const dx=this.target.x-this.boat.x,dy=this.target.y-this.boat.y,len=Math.hypot(dx,dy);if(len<.008)this.target=null;else{this.boat.x+=dx/len*Math.min(.23*dt,len);this.boat.y+=dy/len*Math.min(.23*dt,len);}}
    const key=this.keys;
    this.boat.x+=((key.has('d')||key.has('arrowright')?1:0)-(key.has('a')||key.has('arrowleft')?1:0))*.25*dt;
    this.boat.y+=((key.has('s')||key.has('arrowdown')?1:0)-(key.has('w')||key.has('arrowup')?1:0))*.25*dt;
    this.boat.x=Math.max(.04,Math.min(.96,this.boat.x));this.boat.y=Math.max(.06,Math.min(.94,this.boat.y));
    if(Math.hypot(before.x-this.boat.x,before.y-this.boat.y)>.00001){this.state.position={...this.boat};this.onMove();}
    this.pulse=Math.max(0,this.pulse-dt);
  }
  flash(){this.pulse=2;}
  poly(points,fill,stroke){const c=this.ctx;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
  ellipse(x,y,rx,ry,fill){const c=this.ctx;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();}
  glow(x,y,r,colour){const c=this.ctx,g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,colour);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
  tree(x,y,s=1){const c=this.ctx;c.fillStyle='#263f49';c.fillRect(x-2*s,y-5*s,4*s,22*s);this.poly([[x,y-37*s],[x-18*s,y+4*s],[x+18*s,y+4*s]],'#38635b');this.poly([[x,y-47*s],[x-14*s,y-10*s],[x+14*s,y-10*s]],'#487569');}
  draw(){
    // The static map behind a lesson does not need 60 repaints per second.
    if(this.hasDrawn && document.querySelector('dialog[open]'))return;
    this.hasDrawn=true;
    if(!this.w)return;const c=this.ctx,w=this.w,h=this.h,t=this.state.calm?0:this.time;
    c.clearRect(0,0,w,h);const bg=c.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#111c2b');bg.addColorStop(.6,'#142d39');bg.addColorStop(1,'#1c283e');c.fillStyle=bg;c.fillRect(0,0,w,h);
    this.glow(w*.28,h*.32,w*.38,'#376a5725');this.glow(w*.78,h*.70,w*.34,'#67558625');
    for(let i=0;i<90;i++){const x=((i*137.51)%997)/997*w,y=((i*87.77)%701)/701*h;c.globalAlpha=.15+(Math.sin(t*.4+i)+1)*.18;this.ellipse(x,y,i%7===0?1.5:.7,i%7===0?1.5:.7,'#c3dbdf');}c.globalAlpha=1;
    // Contour currents and routes.
    c.lineWidth=1;c.strokeStyle='#b5d6d90d';for(let i=0;i<7;i++){c.beginPath();c.ellipse(w*.48,h*.5,w*(.12+i*.07),h*(.1+i*.085),-.4,0,Math.PI*2);c.stroke();}
    c.setLineDash([3,9]);c.strokeStyle='#9bb9b333';c.beginPath();c.moveTo(w*.25,h*.43);c.quadraticCurveTo(w*.48,h*.52,w*.70,h*.32);c.quadraticCurveTo(w*.96,h*.5,w*.70,h*.73);c.quadraticCurveTo(w*.42,h*.85,w*.25,h*.43);c.stroke();c.setLineDash([]);
    // Central lighthouse on its own rock.
    const lx=w*.47,ly=h*.59;
    this.poly([[lx-27,ly],[lx+24,ly-5],[lx+18,ly+20],[lx,ly+38],[lx-18,ly+20]],'#2c4653');
    c.fillStyle='#748b8a';c.fillRect(lx-7,ly-42,14,43);c.fillStyle='#adc1af';c.fillRect(lx-10,ly-46,20,7);
    const lit=this.state.ending;
    this.glow(lx,ly-53,lit?130:20,lit?'#ffda7960':'#ffda7915');
    this.poly([[lx-15,ly-52],[lx,ly-65],[lx+15,ly-52]],lit?'#ffe5a1':'#68777e');
    if(lit){c.fillStyle='#ffde88';c.fillRect(lx-8,ly-51,16,7);c.globalAlpha=.1;this.poly([[lx,ly-53],[0,h*.04],[0,h*.3]],'#fff3a2');this.poly([[lx,ly-53],[w,h*.03],[w,h*.28]],'#fff3a2');c.globalAlpha=1;}
    for(const island of ISLANDS){
      const x=island.x*w,y=island.y*h+(island.pending?0:Math.sin(t*.7+island.x*7)*3),s=Math.min(w/760,h/590,1.25),r=(island.pending?43:72)*s;
      c.save();c.translate(x,y);
      this.ellipse(0,r*.72,r*1.15,r*.30,'#020c162c');
      this.poly([[-r,-5],[-r*.62,-r*.44],[r*.34,-r*.46],[r,.03*r],[r*.62,r*.40],[r*.16,r*.94],[-r*.43,r*.68]],island.pending?'#243441':'#29434c');
      this.poly([[-r,-5],[-r*.62,-r*.44],[r*.34,-r*.46],[r,.03*r],[r*.61,r*.26],[-r*.35,r*.28]],island.pending?'#37444d':island.id==='web'?'#596078':'#4e7167');
      if(!island.pending){
        const lessons=islandLessons(island.id),done=lessons.filter(l=>this.state.completed.includes(l.id)).length;
        this.glow(0,-20,75*s,island.colour+(done?'20':'09'));
        if(island.id==='sets'){
          this.tree(-40*s,-15*s,.65*s);this.tree(45*s,-15*s,.8*s);
          c.strokeStyle='#d0e4aeaa';c.lineWidth=2;for(const dx of [-14,14]){c.beginPath();c.ellipse(dx*s,-12*s,24*s,13*s,-.1,0,Math.PI*2);c.stroke();}
          for(let i=0;i<8;i++){const fx=Math.sin(i*2.4+t*.35)*35*s,fy=-20*s-Math.cos(i+t)*13*s;this.glow(fx,fy,8*s,'#ecf49b45');this.ellipse(fx,fy,2*s,2*s,'#e8eda0');}
        }else if(island.id==='python'){
          for(const dx of [-39,39]){c.fillStyle='#d6b78a';c.fillRect(dx*s-2,-38*s,4*s,40*s);this.ellipse(dx*s,-41*s,17*s,16*s,'#ad805b');this.ellipse(dx*s+4,-43*s,5*s,5*s,'#ffd78b');}
          this.poly([[-17*s,-5*s],[-17*s,-37*s],[15*s,-37*s],[18*s,-5*s]],'#394850');c.fillStyle='#f2bf75';c.fillRect(-7*s,-26*s,14*s,11*s);
          this.poly([[-23*s,-37*s],[0,-55*s],[23*s,-37*s]],'#c5a27a');
        }else{
          this.poly([[-31*s,0],[-31*s,-30*s],[20*s,-30*s],[31*s,0]],'#b5afbb');this.poly([[-36*s,-30*s],[-5*s,-65*s],[30*s,-30*s]],'#827995');
          c.fillStyle='#343d58';c.fillRect(-8*s,-21*s,14*s,21*s);this.ellipse(-5*s,-41*s,7*s,7*s,'#d7cff2');
          this.poly([[28*s,-15*s],[53*s,-35*s],[56*s,-32*s],[32*s,-10*s]],'#d1c4d7');
        }
        for(let i=0;i<lessons.length;i++){this.ellipse((i-(lessons.length-1)/2)*13*s,40*s,3*s,3*s,i<done?island.colour:'#71828b');}
      }else{
        c.font=`${24*s}px Georgia`;c.textAlign='center';c.fillStyle='#7c8b99';c.fillText(island.symbol,0,0);
      }
      c.textAlign='center';c.font=`${island.pending?10:12}px system-ui`;c.fillStyle=island.pending?'#97a6b8':'#dce7e3';c.fillText(island.name,0,r*.85+20);
      c.restore();
    }
    // The player: a paper-sailed walnut boat, with a lantern at its bow.
    const bx=this.boat.x*w,by=this.boat.y*h+Math.sin(t*2.1)*2;
    this.ellipse(bx,by+11,24,5,'#91ccc312');c.strokeStyle='#b9d9d548';c.beginPath();c.ellipse(bx,by+9,30+Math.sin(t)*3,8,0,0,Math.PI);c.stroke();
    this.poly([[bx-20,by+2],[bx+23,by+2],[bx+12,by+13],[bx-11,by+13]],'#b88862');
    c.strokeStyle='#f0d7b0';c.lineWidth=2;c.beginPath();c.moveTo(bx,by+3);c.lineTo(bx,by-38);c.stroke();
    this.poly([[bx-2,by-35],[bx-2,by-3],[bx-24,by-3]],'#efddba');this.poly([[bx+3,by-29],[bx+3,by-3],[bx+18,by-3]],'#a8d0bf');
    this.glow(bx+19,by,25,'#f6d59135');this.ellipse(bx+19,by,3,4,'#ffdda3');
    if(this.pulse){c.globalAlpha=this.pulse/4;c.strokeStyle='#eadcae';c.lineWidth=2;c.beginPath();c.arc(bx,by,(2-this.pulse)*100+20,0,Math.PI*2);c.stroke();c.globalAlpha=1;}
    c.font='10px system-ui';c.textAlign='left';c.fillStyle='#8da5b4';c.fillText('N',w-33,28);c.strokeStyle='#8da5b4';c.beginPath();c.moveTo(w-30,35);c.lineTo(w-30,60);c.moveTo(w-37,48);c.lineTo(w-23,48);c.stroke();
  }
}
