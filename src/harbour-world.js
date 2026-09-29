import {STATIONS} from './harbour-content.js';
import {CRATES,gateValue} from './harbour-state.js';
/** Original canvas art; positions and cargo are projections of shared game state. */
export class HarbourWorld {
  constructor(canvas,getState,onSelect,onMove){
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.getState=getState;this.onSelect=onSelect;this.onMove=onMove;this.target=null;this.selected='web';this.battery=null;this.pageTitle='An unnamed place';this.time=0;
    canvas.addEventListener('click',event=>{
      const r=canvas.getBoundingClientRect(),x=(event.clientX-r.left)/r.width,y=(event.clientY-r.top)/r.height;
      const station=STATIONS.find(s=>Math.hypot(x-s.x,y-s.y)<.105);
      if(station){this.target={x:station.x,y:station.y+.09};this.selected=station.id;onSelect(station.id,false);}
      else this.target={x:Math.max(.09,Math.min(.86,x)),y:Math.max(.23,Math.min(.82,y))};
    });
    canvas.addEventListener('keydown',event=>{
      const vectors={ArrowUp:[0,-.025],w:[0,-.025],ArrowDown:[0,.025],s:[0,.025],ArrowLeft:[-.025,0],a:[-.025,0],ArrowRight:[.025,0],d:[.025,0]};
      const vector=vectors[event.key];const h=getState().harbour;
      if(vector){event.preventDefault();this.target=null;h.position.x=Math.max(.09,Math.min(.86,h.position.x+vector[0]));h.position.y=Math.max(.23,Math.min(.82,h.position.y+vector[1]));onMove();}
      if(event.key==='Enter'){event.preventDefault();const s=[...STATIONS].sort((a,b)=>Math.hypot(a.x-h.position.x,a.y-h.position.y)-Math.hypot(b.x-h.position.x,b.y-h.position.y))[0];this.selected=s.id;onSelect(s.id,true);}
    });
    let previous=0;
    const tick=t=>{if(t-previous>32&&!document.hidden){const dt=Math.min(.06,(t-previous)/1000);previous=t;this.time=t/1000;this.move(dt);this.draw();}this.frame=requestAnimationFrame(tick);};
    this.frame=requestAnimationFrame(tick);
  }
  move(dt){
    if(!this.target)return;const state=this.getState(),p=state.harbour.position,dx=this.target.x-p.x,dy=this.target.y-p.y,d=Math.hypot(dx,dy);
    if(d<.008||state.calm){Object.assign(p,this.target);this.target=null;this.onMove();return;}
    p.x+=dx/d*dt*.17;p.y+=dy/d*dt*.17;this.onMove();
  }
  draw(){
    const c=this.ctx,w=1000,h=580,state=this.getState(),s=state.harbour,calm=state.calm,t=calm?0:this.time;
    c.clearRect(0,0,w,h);c.fillStyle='#102d39';c.fillRect(0,0,w,h);
    const ellipse=(x,y,rx,ry,colour)=>{c.fillStyle=colour;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
    const line=(points,colour,width=2)=>{c.strokeStyle=colour;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();};
    const text=(value,x,y,size=15,colour='#f0e6c9',align='center')=>{c.font=`${size}px system-ui`;c.textAlign=align;c.fillStyle=colour;c.fillText(value,x,y);};
    // Ripples use stable positions. Calm motion freezes all decorative movement.
    for(let i=0;i<32;i++){const x=(i*137+32)%1000,y=(i*79+50)%580;line([[x,y],[x+20+Math.sin(t+i)*3,y],[x+29,y-2]],'#1e4550',1);}
    ellipse(487,350,390,183,'#0c2530');
    c.fillStyle='#486864';c.beginPath();c.moveTo(104,251);c.bezierCurveTo(105,136,285,107,389,152);c.bezierCurveTo(546,85,760,113,817,256);c.bezierCurveTo(949,351,814,457,667,468);c.bezierCurveTo(557,546,191,463,125,376);c.closePath();c.fill();
    c.fillStyle='#6d8070';c.beginPath();c.moveTo(104,232);c.bezierCurveTo(105,121,285,92,389,137);c.bezierCurveTo(546,70,760,98,817,241);c.bezierCurveTo(949,336,814,442,667,453);c.bezierCurveTo(557,531,191,448,125,361);c.closePath();c.fill();
    line([[270,198],[468,281],[710,197]],'#baa987',24);line([[470,281],[288,378]],'#baa987',24);line([[470,281],[601,429],[698,472]],'#baa987',24);line([[280,378],[130,299]],'#baa987',17);
    line([[270,198],[468,281],[710,197]],'#d0bb94',3);line([[470,281],[601,429]],'#d0bb94',3);
    // Dock remains connected to the same loading tray and signal.
    c.fillStyle='#937455';c.fillRect(552,443,122,98);
    for(let y=450;y<540;y+=13)line([[552,y],[674,y]],'#5b5144',2);
    [[549,455],[678,455],[549,532],[678,532]].forEach(([x,y])=>{ellipse(x,y,5,5,'#483e35');});
    // Trees and wildflowers stay out of building footprints.
    [[391,198],[583,165],[789,295],[179,350],[727,386],[396,430],[207,258]].forEach(([x,y],i)=>{line([[x,y],[x,y-25]],'#495342',5);ellipse(x,y-37,19,29,i%2?'#466c58':'#52765d');ellipse(x-8,y-45,12,20,'#5f8368');});
    for(let i=0;i<20;i++){const x=360+(i*53)%230,y=335+(i*19)%93;ellipse(x,y,2,2,i%2?'#d3bb84':'#afc4a0');}
    // West garden visibly develops after the delivery, not after a lesson tick.
    ellipse(138,282,66,45,'#344f4d');
    for(let r=0;r<3;r++){line([[93,264+r*18],[176,264+r*18]],'#799877',6);if(s.deliveries.includes('garden'))for(let i=0;i<6;i++)ellipse(99+i*14,258+r*18,4,5,i%2?'#e3b0a0':'#edcf88');}
    text(s.deliveries.includes('garden')?'MIRA’S OPEN GARDEN':'Mira’s waiting garden',138,228,13);
    // Workstation buildings, with roofs drawn locally and no asset downloads.
    const house=(x,y,kind,active)=>{
      ellipse(x,y+44,68,21,'#435e56');
      c.fillStyle=active?'#e8d4a4':'#c2c3a0';c.fillRect(x-43,y-25,86,66);
      c.fillStyle='#73918c';c.fillRect(x+29,y-25,14,66);
      c.fillStyle='#3d5d69';c.beginPath();c.moveTo(x-54,y-26);c.lineTo(x,y-73);c.lineTo(x+54,y-26);c.closePath();c.fill();
      line([[x-54,y-26],[x,y-73],[x+54,y-26]],active?'#f2d694':'#91a39c',3);
      c.fillStyle='#294853';c.fillRect(x-28,y-11,20,25);c.fillStyle=active?'#efd29a':'#b5c8ba';c.fillRect(x-25,y-8,14,19);
      c.fillStyle='#4b5c54';c.fillRect(x+9,y+4,21,37);text(kind,x+19,y+26,13,'#e5d4aa');
    };
    for(const station of STATIONS){const x=station.x*w,y=station.y*h,active=this.selected===station.id;house(x,y,station.symbol,active);text(station.name,x,y+63,15);}
    // The Observatory is also the north destination: keep its sky changed.
    if(s.deliveries.includes('observation')||s.deliveries.includes('opening')){
      line([[700,131],[796,35]],'#e0cd96',3);line([[700,131],[777,42]],'#c1c0a36b',12);
      text('✧',805,32,27,'#f4dba2');text('A light worth finding',817,65,12);
    }
    text((this.pageTitle||'An unnamed place').slice(0,30),701,93,13,'#f4e3b7');
    // Every selected crate physically appears on the dock load.
    CRATES.forEach((crate,i)=>{
      const selected=s.selected.includes(crate.id),x=selected?560+i*25:221+i*36,y=selected?465:442;
      c.fillStyle=selected?'#cead72':'#a88e65';c.fillRect(x-11,y-13,23,23);line([[x-11,y-13],[x+12,y+10]],'#786244',1);text(crate.symbol,x,y+4,16,'#243c3e');
      text((crate.a?'A':'')+(crate.b?'B':'')||'—',x,y+24,10,'#f2e4c4');
    });
    const lit=gateValue(s.gate,s.selected.length>0,s.clear);line([[634,446],[634,400]],'#3a4a45',5);ellipse(634,397,10,10,lit?'#ebd786':'#495953');
    if(lit)ellipse(634,397,18,18,'#eed68520');
    if(!s.clear)line([[640,505],[703,479]],'#c79d77',7);
    text(s.clear?'CHANNEL CLEAR':'CHANNEL BLOCKED',797,503,12,s.clear?'#adcebf':'#edb598');
    // Characters are world residents. Pip's route follows the evaluated page.
    const person=(x,y,name,colour)=>{ellipse(x,y+14,11,5,'#38554f');c.fillStyle=colour;c.fillRect(x-6,y,12,14);ellipse(x,y-4,6,7,'#e5c5a0');text(name,x,y+32,11);};
    person(729,s.deliveries.includes('observation')?218:241,'Nova','#a696c8');person(172,310,'Mira','#c6a16f');person(315,222,'Orin','#a7c5a4');
    const j=s.journey,progress=j?.cursor?j.events[j.cursor-1].progress:0;
    const north=j?.direction!=='west',start={x:609,y:491},end=north?{x:712,y:220}:{x:136,y:305};
    let px=start.x+(end.x-start.x)*progress,py=start.y+(end.y-start.y)*progress;
    if(s.stage==='blocked'){px=start.x;py=start.y;}
    const wing=calm?7:7+Math.sin(t*7)*3;ellipse(px-8,py-9,11,wing,'#e5dabd');ellipse(px+8,py-9,11,wing,'#e5dabd');ellipse(px,py,5,10,'#ac8751');text('Pip',px,py+29,12);
    if(typeof this.battery==='number')text(Math.max(0,Math.min(12,this.battery))+' energy',px,py+44,10,'#e5d9b9');
    person(s.position.x*w,s.position.y*h,'You','#eed29b');
    if(s.deliveries.includes('opening'))for(let i=0;i<10;i++){const x=343+i*34,y=103+Math.sin(i*.4)*19;line([[x,y],[x,y+9]],'#bec89f',1);ellipse(x,y+13,4,6,'#eed18b');}
    text('WEST',55,305,10,'#91afb0');text('NORTH',905,71,10,'#91afb0');
  }
}
