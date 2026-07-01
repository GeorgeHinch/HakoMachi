import * as HakoMachiUtils from './shared.js';
import { createUtility3dPreview } from './utility-3d-preview.js';

const NS = 'http://www.w3.org/2000/svg';
const SVG_OP = HakoMachiUtils.SVG_FABRICATION_OPERATIONS;
const CUT = HakoMachiUtils.svgFabricationColor(SVG_OP.CUT_RETAINED);
const SCRAP = HakoMachiUtils.svgFabricationColor(SVG_OP.CUT_SCRAP);
const ENG = HakoMachiUtils.svgFabricationColor(SVG_OP.ENGRAVE);
const MARK = '#777';
const PX = 3.7795275591;
const shelf3d = createUtility3dPreview(document.getElementById('shelf3dPreview'), { readyText: '3D object preview ready.' });

function val(id){ return parseFloat(document.getElementById(id).value); }
function choice(id){ return document.getElementById(id).value; }
function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }
function operationForSvgAttrs(attrs={}){
  if(attrs.stroke===CUT) return SVG_OP.CUT_RETAINED;
  if(attrs.stroke===SCRAP) return SVG_OP.CUT_SCRAP;
  if(attrs.stroke===ENG || attrs.fill===ENG) return SVG_OP.ENGRAVE;
  return null;
}
function el(name, attrs={}, parent=null){ const e=document.createElementNS(NS,name); const op=attrs['data-operation'] || operationForSvgAttrs(attrs); if(op) attrs={...attrs,'data-operation':op}; for(const [k,v] of Object.entries(attrs)) e.setAttribute(k,v); if(parent) parent.appendChild(e); return e; }
function pathD(points){ return points.map((p,i)=>(i?'L':'M')+p[0].toFixed(3)+' '+p[1].toFixed(3)).join(' ')+' Z'; }
function line(parent,x1,y1,x2,y2,stroke=ENG,sw=.12,dash=''){ const a={x1,y1,x2,y2,stroke,'stroke-width':sw,'vector-effect':'non-scaling-stroke'}; if(dash)a['stroke-dasharray']=dash; return el('line',a,parent); }
function rect(parent,x,y,w,h,stroke=CUT,fill='none',sw=.12){ return el('rect',{x,y,width:w,height:h,stroke,fill,'stroke-width':sw,'vector-effect':'non-scaling-stroke'},parent); }

function circle(parent,cx,cy,r,stroke=ENG,fill='none',sw=.12){ return el('circle',{cx,cy,r,stroke,fill,'stroke-width':sw,'vector-effect':'non-scaling-stroke'},parent); }


function strutPoly(x1,y1,x2,y2,width){
  // Physical strip polygon for a diagonal member.
  const dx=x2-x1, dy=y2-y1;
  const len=Math.hypot(dx,dy) || 1;
  const nx=-(dy/len)*(width/2), ny=(dx/len)*(width/2);
  return [[x1+nx,y1+ny],[x2+nx,y2+ny],[x2-nx,y2-ny],[x1-nx,y1-ny]];
}
function strut(parent,x1,y1,x2,y2,width,stroke=CUT){
  const pts=strutPoly(x1,y1,x2,y2,width);
  return el('path',{d:pathD(pts),fill:'none',stroke,'stroke-width':.12,'vector-effect':'non-scaling-stroke'},parent);
}
function polygonArea(poly){
  let a=0;
  for(let i=0;i<poly.length;i++){ const p=poly[i], q=poly[(i+1)%poly.length]; a += p[0]*q[1]-q[0]*p[1]; }
  return a/2;
}
function pointInPoly(pt, poly){
  const [x,y]=pt; let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const xi=poly[i][0], yi=poly[i][1], xj=poly[j][0], yj=poly[j][1];
    const intersect=((yi>y)!==(yj>y)) && (x < (xj-xi)*(y-yi)/(yj-yi+1e-12)+xi);
    if(intersect) inside=!inside;
  }
  return inside;
}
function segIntersectionT(a,b,c,d){
  const r=[b[0]-a[0], b[1]-a[1]], s=[d[0]-c[0], d[1]-c[1]];
  const den=r[0]*s[1]-r[1]*s[0];
  if(Math.abs(den)<1e-9) return null;
  const qp=[c[0]-a[0], c[1]-a[1]];
  const t=(qp[0]*s[1]-qp[1]*s[0])/den;
  const u=(qp[0]*r[1]-qp[1]*r[0])/den;
  if(t>1e-7 && t<1-1e-7 && u>1e-7 && u<1-1e-7) return t;
  return null;
}
function splitPolyEdges(poly, other){
  const out=[];
  for(let i=0;i<poly.length;i++){
    const a=poly[i], b=poly[(i+1)%poly.length];
    const ts=[0,1];
    for(let j=0;j<other.length;j++){
      const t=segIntersectionT(a,b,other[j],other[(j+1)%other.length]);
      if(t!==null) ts.push(t);
    }
    ts.sort((m,n)=>m-n);
    const uniq=[];
    for(const t of ts){ if(!uniq.length || Math.abs(t-uniq[uniq.length-1])>1e-6) uniq.push(t); }
    for(let k=0;k<uniq.length-1;k++){
      const t1=uniq[k], t2=uniq[k+1];
      if(t2-t1<1e-7) continue;
      const p=[a[0]+(b[0]-a[0])*t1, a[1]+(b[1]-a[1])*t1];
      const q=[a[0]+(b[0]-a[0])*t2, a[1]+(b[1]-a[1])*t2];
      out.push([p,q]);
    }
  }
  return out;
}
function keyPt(p){ return `${p[0].toFixed(4)},${p[1].toFixed(4)}`; }
function unionTwoConvexPolysPath(polyA, polyB){
  // Returns a single outer contour for the union of two crossing strut rectangles.
  if(Math.sign(polygonArea(polyA)) !== Math.sign(polygonArea(polyB))) polyB = polyB.slice().reverse();
  const segs=[];
  for(const [p,q] of splitPolyEdges(polyA, polyB)){
    const m=[(p[0]+q[0])/2,(p[1]+q[1])/2];
    if(!pointInPoly(m, polyB)) segs.push({p,q,used:false});
  }
  for(const [p,q] of splitPolyEdges(polyB, polyA)){
    const m=[(p[0]+q[0])/2,(p[1]+q[1])/2];
    if(!pointInPoly(m, polyA)) segs.push({p,q,used:false});
  }
  if(!segs.length) return pathD(polyA);
  const byStart=new Map();
  segs.forEach((e,i)=>{ const k=keyPt(e.p); if(!byStart.has(k)) byStart.set(k,[]); byStart.get(k).push(i); });
  const startIndex=segs.findIndex(e=>!e.used);
  const first=segs[startIndex]; first.used=true;
  const pts=[first.p, first.q];
  let cur=first.q;
  for(let guard=0; guard<segs.length+8; guard++){
    const k=keyPt(cur);
    const choices=(byStart.get(k)||[]).filter(i=>!segs[i].used);
    if(!choices.length) break;
    const ni=choices[0];
    segs[ni].used=true;
    cur=segs[ni].q;
    if(keyPt(cur)===keyPt(pts[0])) break;
    pts.push(cur);
  }
  // Fallback: if orientation traversal failed, draw the two strips as one filled compound path for preview.
  if(keyPt(cur)!==keyPt(pts[0])) return pathD(polyA)+" "+pathD(polyB);
  return pathD(pts);
}
function xBrace(parent,x1,y1,x2,y2,x3,y3,x4,y4,width,stroke=CUT){
  const a=strutPoly(x1,y1,x2,y2,width);
  const b=strutPoly(x3,y3,x4,y4,width);
  const d=unionTwoConvexPolysPath(a,b);
  return el('path',{d,fill:'none',stroke,'stroke-width':.12,'vector-effect':'non-scaling-stroke'},parent);
}
function text(parent,x,y,s,size=2.2){ return null; } // SVG text labels intentionally disabled; part names are shown in HTML cards and filenames only.

function polyRect(x,y,w,h){ return [[x,y],[x+w,y],[x+w,y+h],[x,y+h]]; }
function polyTab(edge,x,y,w,h,pos,size,depth){
  if(edge==='top') return polyRect(x+pos,y-depth,size,depth);
  if(edge==='bottom') return polyRect(x+pos,y+h,size,depth);
  if(edge==='left') return polyRect(x-depth,y+pos,depth,size);
  if(edge==='right') return polyRect(x+w,y+pos,depth,size);
  return [];
}
function onSegParam(p,a,b){
  const dx=b[0]-a[0], dy=b[1]-a[1];
  const len2=dx*dx+dy*dy;
  if(len2<1e-12) return null;
  const cross=(p[0]-a[0])*dy-(p[1]-a[1])*dx;
  if(Math.abs(cross)>1e-7) return null;
  const t=((p[0]-a[0])*dx+(p[1]-a[1])*dy)/len2;
  if(t>-1e-7 && t<1+1e-7) return Math.max(0,Math.min(1,t));
  return null;
}
function pointInAny(pt, polys){ return polys.some(poly=>pointInPoly(pt, poly)); }
function splitEdgeByAll(a,b,polys){
  const ts=[0,1];
  for(const poly of polys){
    for(const v of poly){ const t=onSegParam(v,a,b); if(t!==null) ts.push(t); }
    for(let j=0;j<poly.length;j++){
      const c=poly[j], d=poly[(j+1)%poly.length];
      const t=segIntersectionT(a,b,c,d);
      if(t!==null) ts.push(t);
    }
  }
  ts.sort((m,n)=>m-n);
  const uniq=[];
  for(const t of ts){ if(!uniq.length || Math.abs(t-uniq[uniq.length-1])>1e-6) uniq.push(t); }
  return uniq;
}
function unionPolysToCompoundPath(polys){
  // Merge all filled polygons into boundary loops. Internal overlap cuts are removed.
  const clean=polys.filter(poly=>poly && poly.length>=3 && Math.abs(polygonArea(poly))>1e-7);
  const segs=[];
  const eps=1e-4;
  for(const poly of clean){
    const area=polygonArea(poly);
    for(let i=0;i<poly.length;i++){
      const a=poly[i], b=poly[(i+1)%poly.length];
      const ts=splitEdgeByAll(a,b,clean);
      for(let k=0;k<ts.length-1;k++){
        const t1=ts[k], t2=ts[k+1];
        if(t2-t1<1e-7) continue;
        let p=[a[0]+(b[0]-a[0])*t1, a[1]+(b[1]-a[1])*t1];
        let q=[a[0]+(b[0]-a[0])*t2, a[1]+(b[1]-a[1])*t2];
        const mx=(p[0]+q[0])/2, my=(p[1]+q[1])/2;
        const dx=q[0]-p[0], dy=q[1]-p[1];
        const len=Math.hypot(dx,dy)||1;
        let nx=-dy/len, ny=dx/len;
        if(area<0){ nx=-nx; ny=-ny; }
        const leftInside=pointInAny([mx+nx*eps,my+ny*eps], clean);
        const rightInside=pointInAny([mx-nx*eps,my-ny*eps], clean);
        if(leftInside !== rightInside){
          // Orient so the material is on the left side of the path.
          if(leftInside) segs.push({p,q,used:false});
          else segs.push({p:q,q:p,used:false});
        }
      }
    }
  }
  if(!segs.length) return '';
  const byStart=new Map();
  segs.forEach((e,i)=>{ const k=keyPt(e.p); if(!byStart.has(k)) byStart.set(k,[]); byStart.get(k).push(i); });
  const loops=[];
  for(let si=0; si<segs.length; si++){
    if(segs[si].used) continue;
    const first=segs[si]; first.used=true;
    const pts=[first.p, first.q];
    let cur=first.q;
    for(let guard=0; guard<segs.length+20; guard++){
      const choices=(byStart.get(keyPt(cur))||[]).filter(i=>!segs[i].used);
      if(!choices.length) break;
      // Prefer the next segment that turns the least from the current direction to keep loops stable.
      const prev=pts[pts.length-2];
      const vx=cur[0]-prev[0], vy=cur[1]-prev[1];
      let best=choices[0], bestScore=Infinity;
      for(const ci of choices){
        const e=segs[ci];
        const wx=e.q[0]-e.p[0], wy=e.q[1]-e.p[1];
        const ang=Math.atan2(vx*wy-vy*wx, vx*wx+vy*wy);
        const score=Math.abs(ang);
        if(score<bestScore){ bestScore=score; best=ci; }
      }
      segs[best].used=true;
      cur=segs[best].q;
      if(keyPt(cur)===keyPt(pts[0])) break;
      pts.push(cur);
    }
    if(pts.length>=3) loops.push(pts);
  }
  return loops.map(pathD).join(' ');
}
function mergedCutPath(parent, polys, stroke=CUT){
  const d=unionPolysToCompoundPath(polys);
  if(!d) return null;
  return el('path',{d,fill:'none',stroke,'stroke-width':.12,'vector-effect':'non-scaling-stroke'},parent);
}


function notchPathRect(x,y,w,h,notches){
  // notches: {edge:'top|bottom|left|right', pos, size, depth, dir:'out|in'} pos from left/top, size along edge
  const n = {top:[],right:[],bottom:[],left:[]};
  for(const no of notches) n[no.edge].push(no);
  for(const k in n) n[k].sort((a,b)=>a.pos-b.pos);
  let pts=[];
  function add(px,py){ const last=pts[pts.length-1]; if(!last || Math.abs(last[0]-px)>1e-6 || Math.abs(last[1]-py)>1e-6) pts.push([px,py]); }
  add(x,y);
  let cur=x;
  for(const no of n.top){ add(x+no.pos,y); const d=no.dir==='in'?no.depth:-no.depth; add(x+no.pos,y+d); add(x+no.pos+no.size,y+d); add(x+no.pos+no.size,y); cur=x+no.pos+no.size; }
  add(x+w,y); cur=y;
  for(const no of n.right){ add(x+w,y+no.pos); const d=no.dir==='in'?-no.depth:no.depth; add(x+w+d,y+no.pos); add(x+w+d,y+no.pos+no.size); add(x+w,y+no.pos+no.size); cur=y+no.pos+no.size; }
  add(x+w,y+h); cur=x+w;
  const bn=n.bottom.slice().sort((a,b)=>b.pos-a.pos);
  for(const no of bn){ add(x+no.pos+no.size,y+h); const d=no.dir==='in'?-no.depth:no.depth; add(x+no.pos+no.size,y+h+d); add(x+no.pos,y+h+d); add(x+no.pos,y+h); cur=x+no.pos; }
  add(x,y+h); cur=y+h;
  const ln=n.left.slice().sort((a,b)=>b.pos-a.pos);
  for(const no of ln){ add(x,y+no.pos+no.size); const d=no.dir==='in'?no.depth:-no.depth; add(x+d,y+no.pos+no.size); add(x+d,y+no.pos); add(x,y+no.pos); cur=y+no.pos; }
  return pathD(pts);
}

function tabPositions(length, count, tabW){
  if(count<=1) return [length/2-tabW/2];
  const margin = Math.max(tabW*1.5, 1.2);
  const usable = Math.max(0.1, length - 2*margin);
  return Array.from({length:count},(_,i)=> margin + (usable*i/(count-1)) - tabW/2);
}

function autoPosts(W){
  // roughly 12-18mm between vertical support lines for N-scale industrial shelving
  if(W <= 18) return 2;
  if(W <= 34) return 3;
  if(W <= 52) return 4;
  return 5;
}
function shelfLevels(H, shelfCount, minFeature){
  // Shelf count is the TOTAL number of shelf surfaces, including the bottom/base
  // shelf and the top shelf. The separate top/bottom frame parts represent those
  // two end shelves, so only the interior levels become separate shelf bay inserts.
  const total = Math.max(2, Math.round(shelfCount));
  const interiorCount = Math.max(0, total - 2);
  if(interiorCount <= 0) return [];
  return Array.from({length:interiorCount},(_,i)=> H * (i + 1) / (total - 1));
}

function shelfBayKeepoutRects(x,y,bayW,D,opt,tabLayout){
  const keep=[];
  const {tabW, tabD} = opt;
  // Keep decorative holes/slits away from end tabs so the tab roots remain strong.
  for(const pos of tabLayout.left){
    keep.push({x:x-0.05, y:y+pos-0.45, w:Math.max(1.2,tabD+0.7), h:tabW+0.9});
  }
  for(const pos of tabLayout.right){
    keep.push({x:x+bayW-tabD-0.65, y:y+pos-0.45, w:Math.max(1.2,tabD+0.7), h:tabW+0.9});
  }
  return keep;
}
function overlaps(a,b){ return !(a.x+a.w<=b.x || b.x+b.w<=a.x || a.y+a.h<=b.y || b.y+b.h<=a.y); }
function addShelfDeckPattern(g,x,y,W,D,opt,style,keep=[]){
  if(style==='solid') return;
  const minF = Math.max(1, opt.minFeature);
  const margin = Math.max(1.2, opt.railDepth * 0.45);
  const safeRect=(rx,ry,rw,rh)=>{
    if(rw < minF || rh < minF) return;
    const cand={x:rx,y:ry,w:rw,h:rh};
    if(keep.some(k=>overlaps(cand,k))) return;
    rect(g,rx,ry,rw,rh,SCRAP);
  };
  const safeDot=(cx,cy,r)=>{
    const cand={x:cx-r,y:cy-r,w:r*2,h:r*2};
    if(keep.some(k=>overlaps(cand,k))) return;
    circle(g,cx,cy,r,ENG,'none',0.12);
  };
  if(W-2*margin < minF || D-2*margin < minF) return;
  if(style==='dotted'){
    // Perforated shelf decks can be etched dots rather than cut openings.
    const dotDia = Math.max(1.0, Math.min(1.2, minF));
    const r = dotDia/2;
    const pitchX = Math.max(2.0, dotDia + 1.2);
    const pitchY = Math.max(2.0, dotDia + 1.2);
    const usableW = W - 2*margin;
    const usableD = D - 2*margin;
    const cols = Math.max(1, Math.floor((usableW - dotDia) / pitchX) + 1);
    const rows = Math.max(1, Math.floor((usableD - dotDia) / pitchY) + 1);
    const patternW = (cols-1)*pitchX + dotDia;
    const patternD = (rows-1)*pitchY + dotDia;
    const ox = x + (W - patternW)/2 + r;
    const oy = y + (D - patternD)/2 + r;
    for(let rIdx=0;rIdx<rows;rIdx++) for(let cIdx=0;cIdx<cols;cIdx++){
      safeDot(ox+cIdx*pitchX, oy+rIdx*pitchY, r);
    }
  } else if(style==='hslits'){
    const slitH = Math.max(1, minF);
    const gap = Math.max(1.2, minF*1.3);
    const slitW = Math.max(3.0, W-2*margin);
    for(let yy=y+margin; yy+slitH<=y+D-margin+0.001; yy += slitH+gap){
      safeRect(x+margin, yy, slitW, slitH);
    }
  } else if(style==='vslits'){
    const slitW = Math.max(1, minF);
    const gap = Math.max(1.2, minF*1.3);
    const slitH = Math.max(3.0, D-2*margin);
    for(let xx=x+margin; xx+slitW<=x+W-margin+0.001; xx += slitW+gap){
      safeRect(xx, y+margin, slitW, slitH);
    }
  }
}

function shelfTabLayout(D,opt,levelIdx,bayIdx){
  const {tabW} = opt;
  const front = clamp(D*0.28 - tabW/2, 0.8, D-tabW-0.8);
  const rear  = clamp(D*0.72 - tabW/2, 0.8, D-tabW-0.8);
  const bayCount = Math.max(1, (opt.postXs ? opt.postXs.length - 1 : bayIdx + 1));
  const postCount = bayCount + 1;
  const leftSupport = bayIdx;
  const rightSupport = bayIdx + 1;
  const both = [front, rear];
  const pairForSupport = (supportIndex)=>{
    const primary = ((levelIdx + supportIndex) % 2) ? rear : front;
    const secondary = (Math.abs(primary-front) < 0.001) ? rear : front;
    return {primary, secondary};
  };

  let left;
  if(leftSupport <= 0){
    // Outside/end shelf tabs do not share a support with another bay, so use both tab positions.
    left = both.slice();
  } else {
    // This bay is to the right of an interior support. Use the opposite slot from the bay on the left.
    left = [pairForSupport(leftSupport).secondary];
  }

  let right;
  if(rightSupport >= postCount-1){
    // Outside/end shelf tabs do not share a support with another bay, so use both tab positions.
    right = both.slice();
  } else {
    // This bay is to the left of an interior support. Use the primary slot for that shared support.
    right = [pairForSupport(rightSupport).primary];
  }

  return {left, right};
}

function makeShelfBay(g,x,y,bayW,D,opt,levelIdx,bayIdx){
  const {tabW, tabD, shelfStyle} = opt;
  const layout = shelfTabLayout(D,opt,levelIdx,bayIdx);
  const notches=[];
  for(const p of layout.left){ notches.push({edge:'left',pos:p,size:tabW,depth:tabD,dir:'out'}); }
  for(const p of layout.right){ notches.push({edge:'right',pos:p,size:tabW,depth:tabD,dir:'out'}); }
  el('path',{d:notchPathRect(x,y,bayW,D,notches),fill:'none',stroke:CUT,'stroke-width':.12,'vector-effect':'non-scaling-stroke'},g);
  addShelfDeckPattern(g,x,y,bayW,D,opt,shelfStyle,shelfBayKeepoutRects(x,y,bayW,D,opt,layout));
  // Blue centerline only: this bay is bounded by posts; it no longer has impossible pass-through post slots.
  line(g,x+0.8,y+D/2,x+bayW-0.8,y+D/2,ENG,.08,'0.7 0.5');
  const styleLabel = ({solid:'SOLID', dotted:'ETCHED DOTS', hslits:'HORIZONTAL SLITS', vslits:'VERTICAL SLITS'}[shelfStyle] || 'SOLID');
  text(g,x,y-1.2,`SHELF ${levelIdx+2} BAY ${bayIdx+1}: ${bayW.toFixed(1)}×${D}mm / ${styleLabel}`);
}

function shelfBaysFromPosts(postXs, receiverFeature){
  const bays=[];
  for(let i=0;i<postXs.length-1;i++){
    // Shelf bay pieces must reach from one vertical support slot line to the next.
    // Do not subtract the receiver/member width here: the tabs on each end are what
    // enter the side/interior support slots. Subtracting receiverFeature made the
    // shelf pieces visibly too short between a side and the first center support.
    const leftSlotLine = postXs[i];
    const rightSlotLine = postXs[i+1];
    const bayW = Math.max(2.0, rightSlotLine-leftSlotLine);
    bays.push({index:i, leftSlotLine, rightSlotLine, bayW});
  }
  return bays;
}

function shelfSlotsForSide(D,opt,levelIdx,isRightSide){
  // Side frame receiver slots must be created from the exact same shelf tab layout
  // used by the outer shelf bay. Slot length along depth equals tabW; slot height equals material-fit slotW.
  const bays = shelfBaysFromPosts(opt.postXs, opt.receiverFeature);
  const bayIdx = isRightSide ? Math.max(0,bays.length-1) : 0;
  const layout = shelfTabLayout(D,opt,levelIdx,bayIdx);
  return isRightSide ? layout.right : layout.left;
}

function rearSupportTabPositions(H,opt){
  // Vertical tabs on the rear edge of every vertical support. These tabs are what locate
  // the supports into matching vertical slots in the back panel.
  const count = Math.max(2, Math.min(4, Math.floor(H/10) + 1));
  return tabPositions(H, count, opt.tabW);
}

function shelfSlotsForBackPost(opt,levelIdx,postIndex){
  // Back receiver slots are derived from the adjacent shelf-bay tabs instead of guessed square holes.
  // The back view cannot show front/back offsets, so adjacent bay tabs intentionally share the same
  // material-thickness slot at the matching post and shelf height.
  const slots=[];
  const bayCount = Math.max(0,opt.postXs.length-1);
  if(postIndex>0){
    const leftBay = postIndex-1;
    const l = shelfTabLayout(10,opt,levelIdx,leftBay);
    if(l.right && l.right.length) slots.push({side:'leftBay', bay:leftBay});
  }
  if(postIndex<bayCount){
    const rightBay = postIndex;
    const l = shelfTabLayout(10,opt,levelIdx,rightBay);
    if(l.left && l.left.length) slots.push({side:'rightBay', bay:rightBay});
  }
  return slots.length ? slots : [{side:'single', bay:Math.max(0,Math.min(postIndex,bayCount-1))}];
}

function shelfSlotDepthPositionsForPost(D,opt,levelIdx,postIndex){
  // Returns exact front/back slot positions along a vertical support part.
  // These come directly from the shelf bay tabs that enter this support line.
  const bayCount = Math.max(0,opt.postXs.length-1);
  const positions=[];
  if(postIndex>0){
    const leftBay = postIndex-1;
    const l = shelfTabLayout(D,opt,levelIdx,leftBay);
    for(const p of (l.right || [])) positions.push(p);
  }
  if(postIndex<bayCount){
    const rightBay = postIndex;
    const l = shelfTabLayout(D,opt,levelIdx,rightBay);
    for(const p of (l.left || [])) positions.push(p);
  }
  // Deduplicate close positions so two adjacent bay tabs can intentionally share a slot when they align.
  const sorted=positions.slice().sort((a,b)=>a-b);
  const out=[];
  for(const p of sorted){ if(!out.length || Math.abs(p-out[out.length-1])>0.05) out.push(p); }
  return out;
}


function splitPolyByLine(poly,A,B,C){
  // Returns [negativeSide, positiveSide] polygons for the line A*x+B*y+C=0.
  const neg=[], pos=[];
  function val(p){ return A*p[0]+B*p[1]+C; }
  function add(list,p){
    const last=list[list.length-1];
    if(!last || Math.hypot(last[0]-p[0], last[1]-p[1])>1e-7) list.push(p);
  }
  for(let i=0;i<poly.length;i++){
    const P=poly[i], Q=poly[(i+1)%poly.length];
    const fP=val(P), fQ=val(Q);
    const Pin=fP<=1e-7, Qin=fQ<=1e-7;
    if(Pin) add(neg,P); else add(pos,P);
    if((fP< -1e-7 && fQ>1e-7) || (fP>1e-7 && fQ< -1e-7)){
      const t=fP/(fP-fQ);
      const I=[P[0]+(Q[0]-P[0])*t, P[1]+(Q[1]-P[1])*t];
      add(neg,I); add(pos,I);
    }
    if(!Qin){} // symmetry handled by the next edge start
  }
  return [neg.filter(Boolean), pos.filter(Boolean)].map(p=>p.length>=3?p:[]);
}
function removeBandFromPolys(polys,x1,y1,x2,y2,width){
  // Remove the material band area from a set of opening polygons; result is the voids left to cut.
  const dx=x2-x1, dy=y2-y1;
  const len=Math.hypot(dx,dy)||1;
  const nx=-dy/len, ny=dx/len;
  const half=width/2;
  const out=[];
  for(const poly of polys){
    const c1=-(nx*x1+ny*y1+half);       // keep f<=0 side: signed distance <= +half
    const c2=-(nx*x1+ny*y1-half);       // keep f>=0 side: signed distance >= -half
    const [below, restA]=splitPolyByLine(poly,nx,ny,c2); // below lower band edge
    const [insideOrBelow, above]=splitPolyByLine(poly,nx,ny,c1); // above upper band edge
    if(below.length && Math.abs(polygonArea(below))>0.08) out.push(below);
    if(above.length && Math.abs(polygonArea(above))>0.08) out.push(above);
  }
  return out;
}
function cutPolygon(parent,poly){
  if(poly && poly.length>=3 && Math.abs(polygonArea(poly))>0.08){
    el('path',{d:pathD(poly),fill:'none',stroke:SCRAP,'stroke-width':.12,'vector-effect':'non-scaling-stroke'},parent);
  }
}
function addBracedOpenings(g,rx,ry,rw,rh,diagLines,braceW){
  if(rw<1.2 || rh<1.2) return;
  let holes=[[[rx,ry],[rx+rw,ry],[rx+rw,ry+rh],[rx,ry+rh]]];
  for(const ln of diagLines){ holes=removeBandFromPolys(holes,ln[0],ln[1],ln[2],ln[3],braceW); }
  holes.forEach(p=>cutPolygon(g,p));
}
function railCentersToOpenBands(y,H,shelfYs,railDepth){
  const bands=[];
  const rails=[{a:y,b:y+railDepth},{a:y+H-railDepth,b:y+H}];
  for(const sy of shelfYs){
    const cy=y+H-sy;
    rails.push({a:cy-railDepth/2,b:cy+railDepth/2});
  }
  rails.sort((r1,r2)=>r1.a-r2.a);
  for(let i=0;i<rails.length-1;i++){
    const a=rails[i].b, b=rails[i+1].a;
    if(b-a>1.1) bands.push([a,b]);
  }
  return bands;
}

function levelUsesCutShelf(opt, levelIdx){
  const t = (opt.shelfTypes && opt.shelfTypes[levelIdx]) || opt.shelfStyle;
  // Only actual shelf deck types need shelf-tab slots / horizontal support rails.
  if(t === 'solid' || t === 'dotted' || t === 'hslits' || t === 'vslits') return true;
  // Open-door enclosed cabinets keep visible internal top/bottom plates; closed modules and
  // all special cabinet box types do not need shelf-tab slots at the rack support level.
  if(t === 'cabinet') return opt.cabinetDoorMode !== 'closed';
  return false;
}
function activeShelfYs(opt){
  return (opt.shelfYs || []).filter((_,idx)=>levelUsesCutShelf(opt,idx));
}

function addFrameOnlyOpenings(g,x,y,W,H,opt,verticalBands){
  // Cut away open rectangles between the remaining frame members.
  // This leaves one outer frame, shelf-level horizontal rails, and vertical posts,
  // but intentionally omits any diagonal cross bracing for thickener layers.
  const {shelfYs, railDepth} = opt;
  const bands = verticalBands
    .map(b=>[clamp(b[0],0,W), clamp(b[1],0,W)])
    .filter(b=>b[1]-b[0] > 0.2)
    .sort((a,b)=>a[0]-b[0]);
  const merged=[];
  for(const b of bands){
    if(!merged.length || b[0] > merged[merged.length-1][1]) merged.push(b.slice());
    else merged[merged.length-1][1] = Math.max(merged[merged.length-1][1], b[1]);
  }
  const openXBands=[];
  for(let i=0;i<merged.length-1;i++){
    const a=merged[i][1], b=merged[i+1][0];
    if(b-a >= Math.max(1.0,opt.minFeature)) openXBands.push([a,b]);
  }
  const openYBands = railCentersToOpenBands(y,H,activeShelfYs(opt),railDepth).map(([a,b])=>[a-y,b-y]);
  for(const [xa,xb] of openXBands){
    for(const [ya,yb] of openYBands){
      if(xb-xa >= 1.0 && yb-ya >= 1.0) rect(g,x+xa,y+ya,xb-xa,yb-ya,SCRAP);
    }
  }
}

function makeSideFrame(g,x,y,D,H,opt,label,includeOuter=false){
  const {slotW, tabW, tabD, shelfYs, minFeature, receiverFeature, railDepth} = opt;
  const notches=[];
  for(const p of tabPositions(D,2,tabW)){
    notches.push({edge:'top',pos:p,size:tabW,depth:tabD,dir:'out'});
    notches.push({edge:'bottom',pos:p,size:tabW,depth:tabD,dir:'out'});
  }
  for(const p of rearSupportTabPositions(H,opt)){
    notches.push({edge:'right',pos:p,size:tabW,depth:tabD,dir:'out'});
  }
  // One outside outline for the whole side part. Internal openings are cut out of this panel,
  // leaving posts, horizontal shelf rails, and the full-height X as one merged piece of material.
  el('path',{d:notchPathRect(x,y,D,H,notches),fill:'none',stroke:CUT,'stroke-width':.12,'vector-effect':'non-scaling-stroke'},g);
  const braceW=Math.max(1.0,minFeature);
  const ix=x+receiverFeature, iw=D-2*receiverFeature;
  const diagLines=[
    [x+receiverFeature/2,y+H-railDepth/2, x+D-receiverFeature/2,y+railDepth/2],
    [x+D-receiverFeature/2,y+H-railDepth/2, x+receiverFeature/2,y+railDepth/2]
  ];
  for(const [yt,yb] of railCentersToOpenBands(y,H,activeShelfYs(opt),railDepth)){
    addBracedOpenings(g,ix,yt,iw,yb-yt,diagLines,braceW);
  }
  // Slots are intentional internal cuts for tab-through assembly.
  // They now match the exact tab positions used on the shelf bay that meets this side frame.
  const isRightSide = String(label).toUpperCase().includes('RIGHT');
  shelfYs.forEach((sy,levelIdx)=>{
    if(!levelUsesCutShelf(opt,levelIdx)) return;
    const yy = y+H-sy;
    for(const p of shelfSlotsForSide(D,opt,levelIdx,isRightSide)){
      rect(g,x+p,yy-slotW/2,tabW,slotW,SCRAP);
    }
    line(g,x,yy,x+D,yy,ENG,.08,'0.8 0.5');
  });
  text(g,x,y-1.2,`${label} SIDE FRAME`);
  if(includeOuter){
    const ox = x + D + opt.gap;
    makeSideOuter(g,ox,y,D,H,opt,label);
  }
}

function makeSideOuter(g,x,y,D,H,opt,label){
  const {slotW, tabW, tabD, shelfYs, receiverFeature} = opt;
  const notches=[];
  for(const p of tabPositions(D,2,tabW)){
    notches.push({edge:'top',pos:p,size:tabW,depth:tabD,dir:'out'});
    notches.push({edge:'bottom',pos:p,size:tabW,depth:tabD,dir:'out'});
  }
  // Thickener is not a solid filler panel: it is the same outer frame/shelf-rail outline
  // with the diagonal cross bracing omitted.
  el('path',{d:notchPathRect(x,y,D,H,notches),fill:'none',stroke:CUT,'stroke-width':.12,'vector-effect':'non-scaling-stroke'},g);
  addFrameOnlyOpenings(g,x,y,D,H,opt,[[0,receiverFeature],[D-receiverFeature,D]]);

  // Any tabs that pass through the underlying side frame also need clearance
  // through this glued-on stiffener layer, otherwise the overlay blocks assembly.
  const isRightSide = String(label).toUpperCase().includes('RIGHT');
  shelfYs.forEach((sy,levelIdx)=>{
    if(!levelUsesCutShelf(opt,levelIdx)) return;
    const yy = y+H-sy;
    for(const p of shelfSlotsForSide(D,opt,levelIdx,isRightSide)){
      rect(g,x+p,yy-slotW/2,tabW,slotW,SCRAP);
    }
    line(g,x,yy,x+D,yy,ENG,.08,'0.8 0.5');
  });
  text(g,x,y-1.2,`${label} SIDE OUTER THICKENER`);
}

function makeInteriorVerticalSupport(g,x,y,D,H,opt,postIndex){
  const {slotW, tabW, tabD, shelfYs, receiverFeature} = opt;
  const notches=[];
  // These tabs go into the enclosed slots in the top and bottom frame pieces.
  for(const p of tabPositions(D,2,tabW)){
    notches.push({edge:'top',pos:p,size:tabW,depth:tabD,dir:'out'});
    notches.push({edge:'bottom',pos:p,size:tabW,depth:tabD,dir:'out'});
  }
  for(const p of rearSupportTabPositions(H,opt)){
    notches.push({edge:'right',pos:p,size:tabW,depth:tabD,dir:'out'});
  }
  el('path',{d:notchPathRect(x,y,D,H,notches),fill:'none',stroke:CUT,'stroke-width':.12,'vector-effect':'non-scaling-stroke'},g);
  // Make the support a ladder-like piece rather than a filled slab: front/back uprights plus shelf rails.
  addFrameOnlyOpenings(g,x,y,D,H,opt,[[0,receiverFeature],[D-receiverFeature,D]]);
  shelfYs.forEach((sy,levelIdx)=>{
    if(!levelUsesCutShelf(opt,levelIdx)) return;
    const yy = y+H-sy;
    const positions = shelfSlotDepthPositionsForPost(D,opt,levelIdx,postIndex);
    for(const p of positions){
      rect(g,x+p,yy-slotW/2,tabW,slotW,SCRAP);
    }
    line(g,x,yy,x+D,yy,ENG,.08,'0.8 0.5');
  });
  text(g,x,y-1.2,`INTERIOR VERTICAL SUPPORT ${postIndex}`);
}

function makeBack(g,x,y,W,H,opt,style,includeOuter=false){
  const {slotW, tabW, tabD, postXs, shelfYs, minFeature, receiverFeature, railDepth} = opt;
  const tabCount=Math.max(2,Math.min(4,postXs.length));
  const notches=[];
  for(const p of tabPositions(W,tabCount,tabW)){
    notches.push({edge:'top',pos:p,size:tabW,depth:tabD,dir:'out'});
    notches.push({edge:'bottom',pos:p,size:tabW,depth:tabD,dir:'out'});
  }
  // The left/right side frames attach to the back through open edge slots, using
  // the same outside-edge datum as the top/bottom frame slots. Interior supports
  // still use enclosed vertical slots because they are inside the shelf width.
  for(const py of rearSupportTabPositions(H,opt)){
    notches.push({edge:'left',pos:py,size:tabW,depth:slotW,dir:'in'});
    notches.push({edge:'right',pos:py,size:tabW,depth:slotW,dir:'in'});
  }
  // Back styles are now drawn as one perimeter outline plus intentional internal openings.
  // This avoids overlapping frame/brace outlines that cut through each other.
  el('path',{d:notchPathRect(x,y,W,H,notches),fill:'none',stroke:CUT,'stroke-width':.12,'vector-effect':'non-scaling-stroke'},g);

  if(style==='cross'){
    const braceW=Math.max(1.0,minFeature);
    for(let i=0;i<postXs.length-1;i++){
      const left=x+postXs[i]+receiverFeature/2;
      const right=x+postXs[i+1]-receiverFeature/2;
      const rw=right-left;
      const diagLines=[
        [x+postXs[i],y+H-railDepth/2, x+postXs[i+1],y+railDepth/2],
        [x+postXs[i+1],y+H-railDepth/2, x+postXs[i],y+railDepth/2]
      ];
      // Back shelf-level lines are alignment only; the back remains one merged braced panel.
      addBracedOpenings(g,left,y+railDepth,rw,H-2*railDepth,diagLines,braceW);
    }
  } else if(style==='flat'){
    for(const px of postXs) line(g,x+px,y+receiverFeature,x+px,y+H-receiverFeature,ENG,.08,'0.9 0.45');
  } else if(style==='slotted'){
    const cols = Math.max(2, Math.floor(W/7));
    const rows = Math.max(2, Math.floor(H/7));
    const pad=Math.max(2.0, receiverFeature), gapHole=Math.max(1.0, minFeature);
    const sw=Math.max(1.0,(W-2*pad-cols*gapHole)/(cols));
    const sh=Math.max(1.0,(H-2*pad-rows*gapHole)/(rows));
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
      const sx=x+pad+c*(sw+gapHole), sy=y+pad+r*(sh+gapHole);
      rect(g,sx,sy,Math.min(sw,4.5),Math.min(sh,3.2),SCRAP);
    }
  }

  // Rear vertical support receiver slots. These match the rear-facing tabs on the
  // left/right side frames and each interior vertical support. Slots are vertical
  // because the tabs on the support rear edges are vertical tabs.
  postXs.forEach((px,idx)=>{
    const isEdge = idx===0 || idx===postXs.length-1;
    if(!isEdge){
      for(const py of rearSupportTabPositions(H,opt)){
        rect(g,x+px-slotW/2,y+py,slotW,tabW,SCRAP);
      }
    }
  });

  shelfYs.forEach((sy,levelIdx)=>{
    if(!levelUsesCutShelf(opt,levelIdx)) return;
    const yy=y+H-sy;
    line(g,x,yy,x+W,yy,ENG,.08,'0.8 0.5');
  });
  text(g,x,y-1.2,`BACK: ${style.toUpperCase()}`);
  if(includeOuter){
    const ox=x, oy=y+H+opt.gap;
    makeBackOuter(g,ox,oy,W,H,opt);
  }
}

function makeBackOuter(g,x,y,W,H,opt){
  const {slotW, tabW, tabD, postXs, receiverFeature} = opt;
  const notches=[];
  for(const p of tabPositions(W,Math.max(2,Math.min(4,postXs.length)),tabW)){
    notches.push({edge:'top',pos:p,size:tabW,depth:tabD,dir:'out'});
    notches.push({edge:'bottom',pos:p,size:tabW,depth:tabD,dir:'out'});
  }
  // Keep the back stiffener clearance slots aligned with the structural back panel:
  // side-frame rear tabs use open left/right edge slots, not centerline slots.
  for(const py of rearSupportTabPositions(H,opt)){
    notches.push({edge:'left',pos:py,size:tabW,depth:slotW,dir:'in'});
    notches.push({edge:'right',pos:py,size:tabW,depth:slotW,dir:'in'});
  }
  // Thickener is a frame/post/shelf-rail outline matching the back frame below it,
  // without cross-brace geometry and without a giant solid center panel.
  el('path',{d:notchPathRect(x,y,W,H,notches),fill:'none',stroke:CUT,'stroke-width':.12,'vector-effect':'non-scaling-stroke'},g);
  const verticalBands=[];
  for(let i=0;i<postXs.length;i++){
    if(i===0) verticalBands.push([0,receiverFeature]);
    else if(i===postXs.length-1) verticalBands.push([W-receiverFeature,W]);
    else verticalBands.push([postXs[i]-receiverFeature/2, postXs[i]+receiverFeature/2]);
  }
  addFrameOnlyOpenings(g,x,y,W,H,opt,verticalBands);

  // Match the back panel's rear-support receiver slots so support tabs can pass
  // through both the structural back layer and this visual stiffener layer.
  postXs.forEach((px,idx)=>{
    const isEdge = idx===0 || idx===postXs.length-1;
    if(!isEdge){
      for(const py of rearSupportTabPositions(H,opt)){
        rect(g,x+px-slotW/2,y+py,slotW,tabW,SCRAP);
      }
    }
  });
  text(g,x,y-1.2,'BACK OUTER THICKENER');
}

function makeTopBottomFrame(g,x,y,W,D,opt,label,includeEngrave=true){
  const {slotW, edgeSlotW, tabW, postXs, receiverFeature} = opt;
  // Side/back assemblies are doubled by the stiffener layer, so their slots in the
  // top/bottom shelf frames are open edge notches sized for the doubled material.
  // Interior vertical supports still use enclosed slots because they are internal parts.
  const doubledSlotW = Math.max(edgeSlotW || slotW, slotW);
  const depthTabPositions = tabPositions(opt.supportDepth || D,2,tabW);
  const edgeNotches=[];

  // Open side edge slots for the left/right side frame + side stiffener assemblies.
  for(const p of depthTabPositions){
    edgeNotches.push({edge:'left',pos:p,size:tabW,depth:doubledSlotW,dir:'in'});
    edgeNotches.push({edge:'right',pos:p,size:tabW,depth:doubledSlotW,dir:'in'});
  }

  // Open rear edge slots for the back panel + back stiffener assembly.
  const backTabCount=Math.max(2,Math.min(4,postXs.length));
  for(const p of tabPositions(W,backTabCount,tabW)){
    edgeNotches.push({edge:'bottom',pos:p,size:tabW,depth:doubledSlotW,dir:'in'});
  }
  el('path',{d:notchPathRect(x,y,W,D,edgeNotches),fill:'none',stroke:CUT,'stroke-width':.12,'vector-effect':'non-scaling-stroke'},g);

  // Enclosed internal support slots only for the actual interior vertical supports.
  postXs.forEach((px,idx)=>{
    const isEdge = idx===0 || idx===postXs.length-1;
    if(!isEdge){
      for(const p of depthTabPositions){
        rect(g,x+px-slotW/2,y+p,slotW,tabW,SCRAP);
      }
    }
    line(g,x+px,y+0.8,x+px,y+D-0.8,ENG,.08,'0.7 0.5');
  });

  // Optional engraved guide lines show the support rows without adding extra cut geometry.
  // Doubled top/bottom stiffener layers intentionally omit these marks, because only
  // one layer in each pair needs assembly/alignment engraving.
  if(includeEngrave){
    for(const p of depthTabPositions){
      line(g,x+0.8,y+p+tabW/2,x+W-0.8,y+p+tabW/2,ENG,.08,'0.7 0.5');
    }
    line(g,x+0.8,y+D-doubledSlotW/2,x+W-0.8,y+D-doubledSlotW/2,ENG,.08,'0.7 0.5');
  }
  text(g,x,y-1.2,label);
}


function safeFileName(name){
  return String(name).toLowerCase()
    .replace(/[^a-z0-9]+/g,'_')
    .replace(/^_+|_+$/g,'')
    .slice(0,80) || 'part';
}

function badgeTextColor(hex){
  const h=String(hex||'').replace('#','');
  if(h.length!==6) return '#111';
  const r=parseInt(h.slice(0,2),16), g=parseInt(h.slice(2,4),16), b=parseInt(h.slice(4,6),16);
  const lum=(0.2126*r + 0.7152*g + 0.0722*b)/255;
  return lum < 0.48 ? '#fff' : '#111';
}

function materialSheetForPart(part){
  const title=String(part && part.title || '').toUpperCase();
  const has=(s)=>title.includes(s);

  // Rack structure: reads best as painted steel.
  if(has('SIDE FRAME') || has('VERTICAL SUPPORT') || has('BACK:') || has('OUTER THICKENER') || has('BASE FRAME') || has('TOP FRAME')){
    return {label:'Dark gray sheet', hex:'#2f3338', group:'dark_gray_sheet'};
  }
  if(has('SHELF') && has('BAY') && !has('CABINET')){
    return {label:'Light gray sheet', hex:'#b7bcc2', group:'light_gray_sheet'};
  }

  // Hidden/core cabinet boxes should be neutral because cladding covers most of them.
  if(has('CORE')){
    return {label:'Raw chipboard / core sheet', hex:'#8a8176', group:'raw_chipboard_core'};
  }

  // Fire safety cabinets are commonly red in Japanese industrial scenes.
  if(has('FIRE') || has('EXTINGUISHER') || has('HOSE') || has('消火')){
    return {label:'Red sheet', hex:'#b72020', group:'red_sheet'};
  }
  if(has('FIRST AID')){
    return {label:'White sheet', hex:'#f7f7f2', group:'white_sheet'};
  }
  if(has('CONTROL CABINET') || has('BREAKER') || has('DISTRIBUTION') || has('GAS') || has('UTILITY') || has('METER')){
    return {label:'Light gray sheet', hex:'#cfd2d4', group:'light_gray_sheet'};
  }
  if(has('TOOL') || has('MAINTENANCE') || has('LOCKER BANK') || has('PPE') || has('SAFETY EQUIPMENT')){
    return {label:'Blue-gray sheet', hex:'#6f8291', group:'blue_gray_sheet'};
  }
  if(has('VENDING') || has('SERVICE')){
    return {label:'Off-white sheet', hex:'#e7e2d6', group:'off_white_sheet'};
  }
  if(has('CLADDING') || has('DOORS')){
    return {label:'Light gray sheet', hex:'#c9c7bd', group:'light_gray_sheet'};
  }
  return {label:'Neutral gray sheet', hex:'#9a9a9a', group:'neutral_gray_sheet'};
}
function materialFilePrefix(part){
  const s=materialSheetForPart(part);
  return safeFileName(s.group || s.label).slice(0,32) || 'material';
}

function serializeSvgForDownload(svg){
  return HakoMachiUtils.serializeSvgElement(svg);
}

function triggerSvgDownload(svg, filename){
  HakoMachiUtils.downloadText(serializeSvgForDownload(svg), filename, 'image/svg+xml');
}


function shelfTypeLabel(v){
  return ({
    solid:'SOLID SHELF',
    dotted:'ETCHED DOT SHELF',
    hslits:'HORIZONTAL SLIT SHELF',
    vslits:'VERTICAL SLIT SHELF',
    cabinet:'ENCLOSED CABINET',
    fireSmall:'SMALL FIRE EXTINGUISHER CABINET',
    fireHose:'LARGE FIRE / HOSE CABINET',
    controlCabinet:'ELECTRICAL CONTROL CABINET',
    breakerBox:'BREAKER / DISTRIBUTION BOX',
    gasMeter:'GAS / UTILITY METER CABINET',
    toolLocker:'TOOL / MAINTENANCE LOCKER',
    lockerBank:'LOCKER BANK',
    firstAid:'FIRST AID CABINET',
    ppeCabinet:'SAFETY EQUIPMENT / PPE CABINET',
    hoseReel:'STANDALONE HOSE REEL CABINET',
    vendingCabinet:'PARTS VENDING / SERVICE CABINET'
  }[v] || 'SOLID SHELF');
}
function shelfTypeOptionsHtml(defaultType){
  const opts=[['solid','Solid shelf'],['dotted','Etched dotted shelf'],['hslits','Horizontal slit shelf'],['vslits','Vertical slit shelf']];
  return opts.map(([v,l])=>`<option value="${v}" ${v===defaultType?'selected':''}>${l}</option>`).join('');
}
function syncShelfTypeControls(totalShelfCount){
  const host=document.getElementById('shelfTypeControls');
  if(!host) return;
  const defaultType=choice('shelfStyle');
  const interiorCount=Math.max(0, Math.round(totalShelfCount)-2);
  const old={};
  host.querySelectorAll('select[data-shelf-type]').forEach(s=>old[s.dataset.index]=s.value);
  if(interiorCount<=0){ host.innerHTML='<div>No interior shelf inserts for this shelf count. Bottom and top are the frame layers.</div>'; return; }
  const rows=[];
  rows.push('<div style="font-weight:650;color:#333;margin:8px 0 4px">Per-level shelf/cabinet type</div>');
  for(let i=0;i<interiorCount;i++){
    const levelNumber=i+2;
    const val=old[String(i)] || defaultType;
    rows.push(`<div class="row"><label>Shelf ${levelNumber}</label><select data-shelf-type="1" data-index="${i}" id="shelfType_${i}">${shelfTypeOptionsHtml(val)}</select></div>`);
  }
  host.innerHTML=rows.join('');
  host.querySelectorAll('select').forEach(s=>{
    s.addEventListener('input', scheduleRender);
    s.addEventListener('change', scheduleRender);
  });
}
function getInteriorShelfTypes(totalShelfCount){
  const defaultType=choice('shelfStyle');
  const interiorCount=Math.max(0, Math.round(totalShelfCount)-2);
  const out=[];
  for(let i=0;i<interiorCount;i++){
    const s=document.getElementById('shelfType_'+i);
    out.push(s ? s.value : defaultType);
  }
  return out;
}

function cabinetHeightForLevel(H,shelfCount,mat,opt){
  const intervals=Math.max(1, Math.round(shelfCount)-1);
  const bayH=H/intervals;
  return Math.max(4, bayH - Math.max(opt.receiverFeature, mat*2));
}
function makeCabinetCorePanel(g,x,y,w,h,label=''){
  rect(g,x,y,w,h,CUT);
  // light blue glue/alignment margin only, no text labels
  line(g,x+0.8,y+0.8,x+w-0.8,y+0.8,ENG,.08,'0.7 0.5');
  line(g,x+0.8,y+h-0.8,x+w-0.8,y+h-0.8,ENG,.08,'0.7 0.5');
}
function makeCabinetTopBottomCore(g,x,y,bayW,D,opt,levelIdx,bayIdx,label){
  // Same footprint and shelf/support tabs as a shelf bay, but solid because it is the core box top/bottom.
  const layout=shelfTabLayout(D,opt,levelIdx,bayIdx);
  const notches=[];
  for(const p of layout.left){ notches.push({edge:'left',pos:p,size:opt.tabW,depth:opt.tabD,dir:'out'}); }
  for(const p of layout.right){ notches.push({edge:'right',pos:p,size:opt.tabW,depth:opt.tabD,dir:'out'}); }
  el('path',{d:notchPathRect(x,y,bayW,D,notches),fill:'none',stroke:CUT,'stroke-width':.12,'vector-effect':'non-scaling-stroke'},g);
  line(g,x+0.8,y+D/2,x+bayW-0.8,y+D/2,ENG,.08,'0.7 0.5');
}
function makeCabinetSideCore(g,x,y,D,cabH,opt){
  // Side core box wall. Simple flat panel; top/bottom glue lines are engraved.
  makeCabinetCorePanel(g,x,y,D,cabH);
  line(g,x+0.8,y+opt.receiverFeature,x+D-0.8,y+opt.receiverFeature,ENG,.08,'0.7 0.5');
  line(g,x+0.8,y+cabH-opt.receiverFeature,x+D-0.8,y+cabH-opt.receiverFeature,ENG,.08,'0.7 0.5');
}
function makeCabinetBackCore(g,x,y,bayW,cabH,opt){
  makeCabinetCorePanel(g,x,y,bayW,cabH);
  // rear/core alignment marks for side walls
  line(g,x+opt.receiverFeature/2,y+0.8,x+opt.receiverFeature/2,y+cabH-0.8,ENG,.08,'0.7 0.5');
  line(g,x+bayW-opt.receiverFeature/2,y+0.8,x+bayW-opt.receiverFeature/2,y+cabH-0.8,ENG,.08,'0.7 0.5');
}
function cabinetDoorCountForBay(bayW,opt){
  const mode = opt.cabinetDoorCount || 'auto';
  if(mode === '1' || mode === 1) return 1;
  if(mode === '2' || mode === 2) return 2;
  // Dimensions entered in the generator are model mm. At 1:150, 600mm real ≈ 4mm model.
  const scaleDenom = opt.scaleDenom || 150;
  const breakpointReal = opt.doorBreakpointReal || 600;
  return (bayW * scaleDenom >= breakpointReal) ? 2 : 1;
}

function makeCabinetFrontCladding(g,x,y,bayW,cabH,mat,opt,doorMode='closed'){
  // Seamless outside cladding front: overhangs the core by one material thickness on all sides.
  const over=Math.max(mat,0.3);
  const W=bayW+over*2;
  const H=cabH+over*2;
  rect(g,x,y,W,H,CUT);
  const inset=Math.max(0.8, over+0.5);
  const gap=Math.max(0.6, mat*1.5);
  const doorH=H-2*inset;
  const yTop=y+inset;
  const yBot=y+inset+doorH;
  const doorCount=cabinetDoorCountForBay(bayW,opt);

  function drawHandle(d, side){
    const hx = side==='left' ? d.x+d.w-0.7 : d.x+0.7;
    line(g,hx,y+H/2-1.0,hx,y+H/2+1.0,ENG,.12);
  }
  function drawClosedDoor(d, handleSide){
    rect(g,d.x,d.y,d.w,d.h,ENG);
    drawHandle(d,handleSide);
  }
  function drawOpenDoor(d, handleSide){
    const hingeX = d.hinge==='left' ? d.x : d.x+d.w;
    const insideX = d.hinge==='left' ? d.x+d.w : d.x;
    // Through-cut three free edges so the door can be posed open:
    // top, bottom, and inside edge. The hinge edge stays attached and is engraved.
    line(g,Math.min(hingeX,insideX),d.y,Math.max(hingeX,insideX),d.y,CUT,.12);
    line(g,Math.min(hingeX,insideX),d.y+d.h,Math.max(hingeX,insideX),d.y+d.h,CUT,.12);
    line(g,insideX,d.y,insideX,d.y+d.h,CUT,.12);
    line(g,hingeX,d.y,hingeX,d.y+d.h,ENG,.12);
    drawHandle(d,handleSide);
  }

  if(doorCount===1){
    const door={x:x+inset, y:yTop, w:W-2*inset, h:doorH, hinge:'left'};
    const open = doorMode !== 'closed';
    if(open) drawOpenDoor(door,'left'); else drawClosedDoor(door,'left');
  } else {
    const doorW=(W-2*inset-gap)/2;
    const left={x:x+inset, y:yTop, w:doorW, h:doorH, hinge:'left'};
    const right={x:x+inset+doorW+gap, y:yTop, w:doorW, h:doorH, hinge:'right'};
    const leftOpen = doorMode==='leftOpen' || doorMode==='bothOpen';
    const rightOpen = doorMode==='rightOpen' || doorMode==='bothOpen';
    if(leftOpen) drawOpenDoor(left,'left'); else drawClosedDoor(left,'left');
    if(rightOpen) drawOpenDoor(right,'right'); else drawClosedDoor(right,'right');
    // Light engrave line between doors when neither door cuts the center seam fully.
    if(!leftOpen && !rightOpen){
      line(g,x+inset+doorW+gap/2,yTop,x+inset+doorW+gap/2,yBot,ENG,.08,'0.7 0.5');
    }
  }
}
function makeCabinetSideCladding(g,x,y,D,cabH,mat,opt,side){
  // Side cladding overhangs front and top/bottom by material thickness so the front layer can hide seams.
  const over=Math.max(mat,0.3);
  rect(g,x,y,D+over,cabH+over*2,CUT);
  line(g,x+over,y+over,x+D,y+over,ENG,.08,'0.7 0.5');
  line(g,x+over,y+cabH+over,x+D,y+cabH+over,ENG,.08,'0.7 0.5');
}
function makeCabinetTopBottomCladding(g,x,y,bayW,D,mat,opt,which){
  // Cladding cap/floor layer overhangs front and both sides by material thickness.
  const over=Math.max(mat,0.3);
  rect(g,x,y,bayW+over*2,D+over,CUT);
  line(g,x+over,y+over,x+bayW+over,y+over,ENG,.08,'0.7 0.5');
}

function engraveText(g,x,y,txt,size=1.6,vertical=false){
  // Product engraving text; intentionally allowed in the SVG because it is part detail, not a label.
  const attrs={x,y,fill:ENG,stroke:'none','font-size':size,'font-family':'sans-serif','text-anchor':'middle'};
  if(vertical){
    attrs['writing-mode']='tb';
    attrs['glyph-orientation-vertical']='0';
  }
  const t=el('text',attrs,g);
  t.textContent=txt;
  return t;
}
function fireCabinetDims(type,bayW,cabH,supportDepth,mat,opt){
  // Approximate Japanese industrial wall fire cabinets at 1:150, clamped to the shelf bay.
  // Small: wall-mounted extinguisher box. Large: extinguisher + hose roll / hydrant-style cabinet.
  const minW=Math.max(3.0,opt.receiverFeature+1.0);
  const minH=Math.max(5.0,opt.receiverFeature*2.2);
  if(type==='fireSmall'){
    return {
      w:clamp(Math.min(bayW*0.62,5.5), Math.min(minW,bayW), bayW),
      h:clamp(Math.min(cabH*0.72,8.0), Math.min(minH,cabH), cabH),
      d:clamp(Math.min(supportDepth*0.48,2.2), 1.2, supportDepth)
    };
  }
  return {
    w:clamp(Math.min(bayW*0.92,9.5), Math.min(minW,bayW), bayW),
    h:clamp(Math.min(cabH*0.92,12.0), Math.min(minH,cabH), cabH),
    d:clamp(Math.min(supportDepth*0.70,3.4), 1.4, supportDepth)
  };
}
function makeFireCabinetCorePanel(g,x,y,w,h){
  rect(g,x,y,w,h,CUT);
  line(g,x+0.5,y+0.5,x+w-0.5,y+0.5,ENG,.08,'0.6 0.5');
  line(g,x+0.5,y+h-0.5,x+w-0.5,y+h-0.5,ENG,.08,'0.6 0.5');
}
function makeFireCabinetFrontCladding(g,x,y,w,h,mat,opt,type){
  const over=Math.max(mat,0.3);
  const W=w+over*2, H=h+over*2;
  rect(g,x,y,W,H,CUT);
  const inset=Math.max(0.45, over+0.35);
  const doorX=x+inset, doorY=y+inset, doorW=W-2*inset, doorH=H-2*inset;
  rect(g,doorX,doorY,doorW,doorH,ENG);
  // Keep engraved safety labels clear of the door border with extra margin on very small parts.
  if(type==='fireSmall'){
    const handleX=doorX+doorW-0.55;
    line(g,handleX,doorY+doorH*0.28,handleX,doorY+doorH*0.62,ENG,.12);
    const labelSize = clamp(doorW*0.22, 0.85, 1.35);
    const labelY = doorY + Math.max(doorH*0.25, labelSize*1.18);
    engraveText(g,doorX+doorW*0.50,labelY,'消火器',labelSize,false);
    // Small window/panel suggestion.
    rect(g,doorX+doorW*0.22,doorY+doorH*0.45,doorW*0.36,doorH*0.34,ENG);
  } else {
    // Larger Japanese fire hose/hydrant cabinet: engraved hose roll and extinguisher section.
    const split=doorX+doorW*0.56;
    line(g,split,doorY,split,doorY+doorH,ENG,.08,'0.6 0.5');
    const cx=doorX+doorW*0.30, cy=doorY+doorH*0.55;
    circle(g,cx,cy,Math.min(doorW,doorH)*0.18,ENG,'none',.12);
    circle(g,cx,cy,Math.min(doorW,doorH)*0.09,ENG,'none',.10);
    line(g,cx,cy,cx+doorW*0.18,cy+doorH*0.10,ENG,.08);
    const ex=doorX+doorW*0.73;
    rect(g,ex-doorW*0.07,doorY+doorH*0.42,doorW*0.14,doorH*0.34,ENG);
    line(g,ex-doorW*0.05,doorY+doorH*0.42,ex+doorW*0.05,doorY+doorH*0.35,ENG,.08);
    line(g,doorX+doorW-0.55,doorY+doorH*0.28,doorX+doorW-0.55,doorY+doorH*0.62,ENG,.12);
    const topLeftSize = clamp(doorW*0.16, 0.80, 1.20);
    const topRightSize = clamp(doorW*0.13, 0.75, 1.00);
    const hoseSize = clamp(doorW*0.11, 0.65, 0.90);
    const topY = doorY + Math.max(doorH*0.22, topLeftSize*1.15);
    const hoseY = topY + Math.max(doorH*0.14, hoseSize*1.55);
    engraveText(g,doorX+doorW*0.30,topY,'消火栓',topLeftSize,false);
    engraveText(g,doorX+doorW*0.73,topY,'消火器',topRightSize,false);
    engraveText(g,doorX+doorW*0.30,hoseY,'ホース',hoseSize,false);
  }
}
function makeFireCabinetSideCladding(g,x,y,d,h,mat,opt){
  const over=Math.max(mat,0.3);
  rect(g,x,y,d+over,h+over*2,CUT);
  line(g,x+over,y+over,x+d,y+over,ENG,.08,'0.6 0.5');
  line(g,x+over,y+h+over,x+d,y+h+over,ENG,.08,'0.6 0.5');
}
function makeFireCabinetCapCladding(g,x,y,w,d,mat,opt){
  const over=Math.max(mat,0.3);
  rect(g,x,y,w+over*2,d+over,CUT);
  line(g,x+over,y+over,x+w+over,y+over,ENG,.08,'0.6 0.5');
}

function utilityCabinetDims(type,bayW,cabH,supportDepth,mat,opt){
  const presets={
    controlCabinet:{w:0.78,h:0.96,d:0.62},
    breakerBox:{w:0.56,h:0.66,d:0.34},
    gasMeter:{w:0.60,h:0.72,d:0.28},
    toolLocker:{w:0.90,h:0.96,d:0.74},
    lockerBank:{w:0.98,h:0.98,d:0.76},
    firstAid:{w:0.48,h:0.58,d:0.28},
    ppeCabinet:{w:0.74,h:0.84,d:0.50},
    hoseReel:{w:0.86,h:0.88,d:0.48},
    vendingCabinet:{w:0.92,h:0.96,d:0.56}
  }[type] || {w:0.72,h:0.84,d:0.46};
  const minW=Math.max(3.0,opt.receiverFeature+0.8), minH=Math.max(4.5,opt.receiverFeature*2.0), minD=1.1;
  return {
    w:clamp(Math.min(bayW*presets.w, bayW), Math.min(minW,bayW), bayW),
    h:clamp(Math.min(cabH*presets.h, cabH), Math.min(minH,cabH), cabH),
    d:clamp(Math.min(supportDepth*presets.d, supportDepth), minD, supportDepth)
  };
}
function lockerBankColumnCountForWidth(modelW){
  // Two rows of locker doors are stacked. Choose columns so each single locker door
  // stays within a plausible Japanese locker width range while filling the available width.
  const minDoorW = 2.6;   // model mm, roughly 390 mm real at 1:150
  const maxDoorW = 4.0;   // model mm, roughly 600 mm real at 1:150
  const idealDoorW = 3.2; // model mm, roughly 480 mm real at 1:150
  const minCols = Math.max(2, Math.ceil(modelW / maxDoorW));
  const maxCols = Math.max(minCols, Math.floor(modelW / minDoorW) || minCols);
  const guess = Math.max(2, Math.round(modelW / idealDoorW));
  return clamp(guess, minCols, maxCols);
}

function makeUtilityCabinetFrontCladding(g,x,y,w,h,mat,opt,type){
  const over=Math.max(mat,0.3);
  const W=w+over*2, H=h+over*2;
  rect(g,x,y,W,H,CUT);
  const inset=Math.max(0.45, over+0.35);
  const ix=x+inset, iy=y+inset, iw=W-2*inset, ih=H-2*inset;
  const addHandle=(hx)=>line(g,hx,iy+ih*0.43,hx,iy+ih*0.61,ENG,.12);
  const addVent=(vx,vy,vw,vh,rows=4)=>{ for(let i=0;i<rows;i++){ const yy=vy + vh*(i+1)/(rows+1); line(g,vx,yy,vx+vw,yy,ENG,.08); } };
  const addCross=(cx,cy,s)=>{ line(g,cx-s,cy,cx+s,cy,ENG,.12); line(g,cx,cy-s,cx,cy+s,ENG,.12); };
  if(type==='controlCabinet'){
    rect(g,ix,iy,iw,ih,ENG); addHandle(ix+iw-0.55); addVent(ix+iw*0.14,iy+ih*0.18,iw*0.26,ih*0.18,3);
    rect(g,ix+iw*0.10,iy+ih*0.52,iw*0.22,ih*0.18,ENG);
    circle(g,ix+iw*0.58,iy+ih*0.34,0.18,ENG,'none',.1); circle(g,ix+iw*0.70,iy+ih*0.34,0.18,ENG,'none',.1); circle(g,ix+iw*0.82,iy+ih*0.34,0.18,ENG,'none',.1);
  } else if(type==='breakerBox'){
    rect(g,ix,iy,iw,ih,ENG); addHandle(ix+iw-0.5); addVent(ix+iw*0.18,iy+ih*0.58,iw*0.48,ih*0.12,3);
    // warning triangle
    el('path',{d:pathD([[ix+iw*0.18,iy+ih*0.26],[ix+iw*0.24,iy+ih*0.15],[ix+iw*0.30,iy+ih*0.26]]),fill:'none',stroke:ENG,'stroke-width':.10,'vector-effect':'non-scaling-stroke'},g);
  } else if(type==='gasMeter'){
    rect(g,ix,iy,iw,ih,ENG); addHandle(ix+iw-0.5); circle(g,ix+iw*0.34,iy+ih*0.56,Math.min(iw,ih)*0.14,ENG,'none',.12);
    line(g,ix+iw*0.34,iy+ih*0.56,ix+iw*0.43,iy+ih*0.47,ENG,.08); rect(g,ix+iw*0.54,iy+ih*0.48,iw*0.18,ih*0.18,ENG);
  } else if(type==='toolLocker'){
    const gap=Math.max(0.5,mat*1.2), dw=(iw-gap)/2; rect(g,ix,iy,dw,ih,ENG); rect(g,ix+dw+gap,iy,dw,ih,ENG);
    addHandle(ix+dw-0.55); addHandle(ix+dw+gap+0.55); addVent(ix+iw*0.18,iy+ih*0.18,iw*0.20,ih*0.16,3); addVent(ix+iw*0.62,iy+ih*0.18,iw*0.20,ih*0.16,3);
  } else if(type==='lockerBank'){
    const cols = lockerBankColumnCountForWidth(w);
    const gapX = Math.max(0.35, mat*1.2);
    const gapY = Math.max(0.45, mat*1.4);
    const doorW = (iw - gapX*(cols-1)) / cols;
    const doorH = (ih - gapY) / 2;
    const lockW = Math.max(0.22, Math.min(0.42, doorW*0.16));
    const lockH = Math.max(0.32, Math.min(0.62, doorH*0.22));
    for(let row=0; row<2; row++){
      for(let col=0; col<cols; col++){
        const dx = ix + col*(doorW + gapX);
        const dy = iy + row*(doorH + gapY);
        rect(g,dx,dy,doorW,doorH,ENG);
        // Louvers in upper half of each locker door.
        const ventX = dx + doorW*0.20;
        const ventW = doorW*0.46;
        const ventTop = dy + doorH*0.22;
        const ventBand = doorH*0.24;
        addVent(ventX, ventTop, ventW, ventBand, 4);
        // Lock panel and short handle.
        const panelX = dx + doorW*0.68;
        const panelY = dy + doorH*0.56;
        rect(g,panelX,panelY,lockW,lockH,ENG);
        line(g,panelX + lockW*0.5, panelY + lockH*0.18, panelX + lockW*0.5, panelY + lockH*0.82, ENG, .10);
        circle(g,panelX + lockW*0.5, panelY + lockH*0.30, Math.max(0.06, lockW*0.16), ENG, 'none', .08);
      }
    }
  } else if(type==='firstAid'){
    rect(g,ix,iy,iw,ih,ENG); addHandle(ix+iw-0.5); addCross(ix+iw*0.30,iy+ih*0.44,Math.min(iw,ih)*0.10);
  } else if(type==='ppeCabinet'){
    rect(g,ix,iy,iw,ih,ENG); addHandle(ix+iw-0.5); addVent(ix+iw*0.18,iy+ih*0.62,iw*0.58,ih*0.12,3);
    // helmet arc icon
    line(g,ix+iw*0.26,iy+ih*0.42,ix+iw*0.42,iy+ih*0.42,ENG,.08); el('path',{d:`M ${ix+iw*0.24} ${(iy+ih*0.42).toFixed(3)} Q ${ix+iw*0.34} ${(iy+ih*0.28).toFixed(3)} ${ix+iw*0.44} ${(iy+ih*0.42).toFixed(3)}`,fill:'none',stroke:ENG,'stroke-width':.10,'vector-effect':'non-scaling-stroke'},g);
  } else if(type==='hoseReel'){
    rect(g,ix,iy,iw,ih,ENG); addHandle(ix+iw-0.5); const cx=ix+iw*0.36, cy=iy+ih*0.56; circle(g,cx,cy,Math.min(iw,ih)*0.18,ENG,'none',.12); circle(g,cx,cy,Math.min(iw,ih)*0.09,ENG,'none',.10); line(g,cx,cy,cx+iw*0.20,cy+ih*0.11,ENG,.08);
    rect(g,ix+iw*0.64,iy+ih*0.44,iw*0.14,ih*0.22,ENG);
  } else if(type==='vendingCabinet'){
    rect(g,ix,iy,iw,ih,ENG); rect(g,ix+iw*0.12,iy+ih*0.15,iw*0.54,ih*0.46,ENG); addHandle(ix+iw-0.5);
    for(let r=0;r<3;r++) for(let c=0;c<3;c++) rect(g,ix+iw*(0.16+c*0.16),iy+ih*(0.20+r*0.12),iw*0.10,ih*0.07,ENG);
    rect(g,ix+iw*0.20,iy+ih*0.70,iw*0.44,ih*0.08,ENG); rect(g,ix+iw*0.68,iy+ih*0.70,iw*0.14,ih*0.10,ENG);
  } else {
    rect(g,ix,iy,iw,ih,ENG); addHandle(ix+iw-0.5);
  }
}

function standaloneEdgeSpecs(length, nominalTabW){
  const minLen = 1.0; // do not create less-than-1mm tab/slot lengths
  const safeLength = Math.max(length, minLen);
  if(safeLength <= nominalTabW * 1.75){
    // Very small cabinet parts cannot support a full embedded tab pattern.
    // Use a compact half-length tab/slot instead.
    const size = clamp(safeLength * 0.5, minLen, Math.min(nominalTabW, safeLength - 0.05));
    return [{pos:Math.max(0,(length - size)/2), size, compact:true}];
  }
  if(safeLength < nominalTabW * 4.0){
    const size = Math.min(nominalTabW, Math.max(minLen, safeLength * 0.66));
    return [{pos:Math.max(0,(length - size)/2), size, compact:false}];
  }
  return tabPositions(length,2,nominalTabW).map(p=>({pos:Math.max(0,Math.min(length-nominalTabW,p)), size:nominalTabW, compact:false}));
}
function standaloneCoreJoinery(w,d,h,opt){
  const tabW=Math.max(2.0, opt.receiverFeature || 2.0);
  // Standalone cabinet components need much shorter joinery tabs than the rack parts.
  // Use a depth scaled to the smallest body dimension so small lockers and wall boxes
  // do not end up with overly long tabs. The receiving edge slots must match this depth.
  const minDim=Math.max(1.0, Math.min(w,d,h));
  const tabD=clamp(minDim*0.14, 0.45, 0.80);
  const kerf=(opt.kerf || 0);
  const slotDepth=tabD + kerf*0.5;
  const depthSpecs=standaloneEdgeSpecs(d, tabW);
  const widthSpecs=standaloneEdgeSpecs(w, tabW);
  const heightSpecs=standaloneEdgeSpecs(h, tabW);
  return {tabW, tabD, slotDepth, depthSpecs, widthSpecs, heightSpecs};
}
function makeStandaloneCoreTopBottom(g,x,y,w,d,opt){
  // Top/bottom core plate: tabs on left/right edges into the side panels,
  // plus front and rear open slots so the front frame and back panel can lock in.
  const j=standaloneCoreJoinery(w,d,Math.max(3,d),opt);
  const notches=[];
  for(const spec of j.depthSpecs){
    notches.push({edge:'left',pos:spec.pos,size:spec.size,depth:j.tabD,dir:'out'});
    notches.push({edge:'right',pos:spec.pos,size:spec.size,depth:j.tabD,dir:'out'});
  }
  for(const spec of j.widthSpecs){
    notches.push({edge:'top',pos:spec.pos,size:spec.size,depth:j.slotDepth,dir:'in'});
    notches.push({edge:'bottom',pos:spec.pos,size:spec.size,depth:j.slotDepth,dir:'in'});
  }
  el('path',{d:notchPathRect(x,y,w,d,notches),fill:'none',stroke:CUT,'stroke-width':.12,'vector-effect':'non-scaling-stroke'},g);
  line(g,x+0.7,y+d*0.55,x+w-0.7,y+d*0.55,ENG,.08,'0.7 0.5');
}
function makeStandaloneCoreSide(g,x,y,d,h,opt){
  // Side core wall: open slots along top/bottom receive the top/bottom plate tabs,
  // and open front/rear edge slots receive the front frame and back panel side tabs.
  const j=standaloneCoreJoinery(Math.max(3,d),d,h,opt);
  const notches=[];
  for(const spec of j.depthSpecs){
    notches.push({edge:'top',pos:spec.pos,size:spec.size,depth:j.slotDepth,dir:'in'});
    notches.push({edge:'bottom',pos:spec.pos,size:spec.size,depth:j.slotDepth,dir:'in'});
  }
  for(const spec of j.heightSpecs){
    notches.push({edge:'left',pos:spec.pos,size:spec.size,depth:j.slotDepth,dir:'in'});
    notches.push({edge:'right',pos:spec.pos,size:spec.size,depth:j.slotDepth,dir:'in'});
  }
  el('path',{d:notchPathRect(x,y,d,h,notches),fill:'none',stroke:CUT,'stroke-width':.12,'vector-effect':'non-scaling-stroke'},g);
  line(g,x+0.6,y+0.8,x+d-0.6,y+0.8,ENG,.08,'0.7 0.5');
  line(g,x+0.6,y+h-0.8,x+d-0.6,y+h-0.8,ENG,.08,'0.7 0.5');
}
function makeStandaloneCoreBack(g,x,y,w,h,opt){
  // Back core wall: outward tabs on all four sides lock into the side, top, and bottom core pieces.
  const j=standaloneCoreJoinery(w,Math.max(3,w),h,opt);
  const notches=[];
  for(const spec of j.heightSpecs){
    notches.push({edge:'left',pos:spec.pos,size:spec.size,depth:j.tabD,dir:'out'});
    notches.push({edge:'right',pos:spec.pos,size:spec.size,depth:j.tabD,dir:'out'});
  }
  for(const spec of j.widthSpecs){
    notches.push({edge:'top',pos:spec.pos,size:spec.size,depth:j.tabD,dir:'out'});
    notches.push({edge:'bottom',pos:spec.pos,size:spec.size,depth:j.tabD,dir:'out'});
  }
  el('path',{d:notchPathRect(x,y,w,h,notches),fill:'none',stroke:CUT,'stroke-width':.12,'vector-effect':'non-scaling-stroke'},g);
  line(g,x+0.8,y+0.8,x+w-0.8,y+0.8,ENG,.08,'0.7 0.5');
  line(g,x+0.8,y+h-0.8,x+w-0.8,y+h-0.8,ENG,.08,'0.7 0.5');
}
function makeStandaloneCoreFront(g,x,y,w,h,opt,type='generic'){
  // Front core frame: same locking tabs as the back, but with a large opening so the outer
  // cladding remains the visible finished face while the core still has a true front structure.
  const j=standaloneCoreJoinery(w,Math.max(3,w),h,opt);
  const notches=[];
  for(const spec of j.heightSpecs){
    notches.push({edge:'left',pos:spec.pos,size:spec.size,depth:j.tabD,dir:'out'});
    notches.push({edge:'right',pos:spec.pos,size:spec.size,depth:j.tabD,dir:'out'});
  }
  for(const spec of j.widthSpecs){
    notches.push({edge:'top',pos:spec.pos,size:spec.size,depth:j.tabD,dir:'out'});
    notches.push({edge:'bottom',pos:spec.pos,size:spec.size,depth:j.tabD,dir:'out'});
  }
  el('path',{d:notchPathRect(x,y,w,h,notches),fill:'none',stroke:CUT,'stroke-width':.12,'vector-effect':'non-scaling-stroke'},g);
  const minFrame = Math.max(1.0, opt.minFeature || 1.0);
  let sideFrame = clamp(Math.min(w,h) * (type==='cabinet' ? 0.13 : 0.16), minFrame, 2.0);
  let topFrame = clamp(Math.min(w,h) * 0.18, minFrame, 2.4);
  let bottomFrame = clamp(Math.min(w,h) * (type==='cabinet' ? 0.13 : 0.16), minFrame, 2.0);
  const clearW = w - sideFrame*2;
  const clearH = h - topFrame - bottomFrame;
  if(clearW >= Math.max(1.2, minFrame) && clearH >= Math.max(1.4, minFrame)){
    rect(g,x+sideFrame,y+topFrame,clearW,clearH,SCRAP);
  } else {
    // Very small parts fall back to a solid front panel so the frame itself stays cuttable.
    line(g,x+0.8,y+h*0.55,x+w-0.8,y+h*0.55,ENG,.08,'0.6 0.5');
  }
}

function addStandaloneComponentParts(parts,type,W,D,H,mat,opt){
  const title=shelfTypeLabel(type);
  // W/D/H remain the finished outside dimensions used by the visible cladding.
  // Core box parts are inset by material thickness so the front/back frames fit between
  // the side panels instead of being full outside width plus tabs.
  const w=Math.max(W,2.5), d=Math.max(D,1.0), h=Math.max(H,3.0);
  const coreW=Math.max(2.0, w - 2*mat);
  const coreD=Math.max(1.0, d - 2*mat);
  const coreH=Math.max(3.0, h - 2*mat);
  const join=standaloneCoreJoinery(coreW,coreD,coreH,opt);
  if(type==='cabinet'){
    const doorMode=opt.cabinetDoorMode || 'closed';
    parts.push({title:`${title} / CORE BOTTOM`, w:coreW + join.tabD*2 + 2, h:coreD + join.tabD*2 + 5, draw:(pg,x,y)=>makeStandaloneCoreTopBottom(pg,x,y,coreW,coreD,opt)});
    parts.push({title:`${title} / CORE TOP`, w:coreW + join.tabD*2 + 2, h:coreD + join.tabD*2 + 5, draw:(pg,x,y)=>makeStandaloneCoreTopBottom(pg,x,y,coreW,coreD,opt)});
    parts.push({title:`${title} / CORE LEFT SIDE`, w:coreD + 2, h:coreH + 5, draw:(pg,x,y)=>makeStandaloneCoreSide(pg,x,y,coreD,coreH,opt)});
    parts.push({title:`${title} / CORE RIGHT SIDE`, w:coreD + 2, h:coreH + 5, draw:(pg,x,y)=>makeStandaloneCoreSide(pg,x,y,coreD,coreH,opt)});
    parts.push({title:`${title} / CORE BACK`, w:coreW + join.tabD*2 + 2, h:coreH + join.tabD*2 + 5, draw:(pg,x,y)=>makeStandaloneCoreBack(pg,x,y,coreW,coreH,opt)});
    parts.push({title:`${title} / CORE FRONT FRAME`, w:coreW + join.tabD*2 + 2, h:coreH + join.tabD*2 + 5, draw:(pg,x,y)=>makeStandaloneCoreFront(pg,x,y,coreW,coreH,opt,'cabinet')});
    parts.push({title:`${title} / FRONT CLADDING DOORS`, w:w + mat*2 + 2, h:h + mat*2 + 5, draw:(pg,x,y)=>makeCabinetFrontCladding(pg,x,y,w,h,mat,opt,doorMode)});
    parts.push({title:`${title} / LEFT CLADDING`, w:d + mat + 2, h:h + mat*2 + 5, draw:(pg,x,y)=>makeCabinetSideCladding(pg,x,y,d,h,mat,opt,'LEFT')});
    parts.push({title:`${title} / RIGHT CLADDING`, w:d + mat + 2, h:h + mat*2 + 5, draw:(pg,x,y)=>makeCabinetSideCladding(pg,x,y,d,h,mat,opt,'RIGHT')});
    parts.push({title:`${title} / TOP CLADDING`, w:w + mat*2 + 2, h:d + mat + 5, draw:(pg,x,y)=>makeCabinetTopBottomCladding(pg,x,y,w,d,mat,opt,'TOP')});
    parts.push({title:`${title} / BOTTOM CLADDING`, w:w + mat*2 + 2, h:d + mat + 5, draw:(pg,x,y)=>makeCabinetTopBottomCladding(pg,x,y,w,d,mat,opt,'BOTTOM')});
    return;
  }
  const useFire = type==='fireSmall' || type==='fireHose';
  const frontFn = useFire ? makeFireCabinetFrontCladding : makeUtilityCabinetFrontCladding;
  parts.push({title:`${title} / CORE BACK`, w:coreW + join.tabD*2 + 2, h:coreH + join.tabD*2 + 5, draw:(pg,x,y)=>makeStandaloneCoreBack(pg,x,y,coreW,coreH,opt)});
  parts.push({title:`${title} / CORE FRONT FRAME`, w:coreW + join.tabD*2 + 2, h:coreH + join.tabD*2 + 5, draw:(pg,x,y)=>makeStandaloneCoreFront(pg,x,y,coreW,coreH,opt,type)});
  parts.push({title:`${title} / CORE LEFT SIDE`, w:coreD + 2, h:coreH + 5, draw:(pg,x,y)=>makeStandaloneCoreSide(pg,x,y,coreD,coreH,opt)});
  parts.push({title:`${title} / CORE RIGHT SIDE`, w:coreD + 2, h:coreH + 5, draw:(pg,x,y)=>makeStandaloneCoreSide(pg,x,y,coreD,coreH,opt)});
  parts.push({title:`${title} / CORE TOP`, w:coreW + join.tabD*2 + 2, h:coreD + join.tabD*2 + 5, draw:(pg,x,y)=>makeStandaloneCoreTopBottom(pg,x,y,coreW,coreD,opt)});
  parts.push({title:`${title} / CORE BOTTOM`, w:coreW + join.tabD*2 + 2, h:coreD + join.tabD*2 + 5, draw:(pg,x,y)=>makeStandaloneCoreTopBottom(pg,x,y,coreW,coreD,opt)});
  parts.push({title:`${title} / FRONT CLADDING`, w:w + mat*2 + 2, h:h + mat*2 + 5, draw:(pg,x,y)=>frontFn(pg,x,y,w,h,mat,opt,type)});
  parts.push({title:`${title} / LEFT CLADDING`, w:d + mat + 2, h:h + mat*2 + 5, draw:(pg,x,y)=>makeFireCabinetSideCladding(pg,x,y,d,h,mat,opt)});
  parts.push({title:`${title} / RIGHT CLADDING`, w:d + mat + 2, h:h + mat*2 + 5, draw:(pg,x,y)=>makeFireCabinetSideCladding(pg,x,y,d,h,mat,opt)});
  parts.push({title:`${title} / TOP CLADDING`, w:w + mat*2 + 2, h:d + mat + 5, draw:(pg,x,y)=>makeFireCabinetCapCladding(pg,x,y,w,d,mat,opt)});
  parts.push({title:`${title} / BOTTOM CLADDING`, w:w + mat*2 + 2, h:d + mat + 5, draw:(pg,x,y)=>makeFireCabinetCapCladding(pg,x,y,w,d,mat,opt)});
}

function componentPreset(type){
  // Dimensions are model-space mm at approximately 1:150 scale.
  // These are intentionally conservative defaults for believable Japanese industrial fixtures.
  return {
    rack:{w:36,d:12,h:26,label:'Industrial shelf rack'},
    cabinet:{w:6.0,d:3.0,h:8.8,label:'Enclosed cabinet module'},
    fireSmall:{w:3.8,d:1.8,h:5.2,label:'Small wall fire extinguisher cabinet'},
    fireHose:{w:6.6,d:2.6,h:8.8,label:'Large extinguisher + hose cabinet'},
    controlCabinet:{w:7.5,d:3.2,h:11.0,label:'Electrical control cabinet'},
    breakerBox:{w:4.0,d:1.8,h:5.6,label:'Wall breaker / distribution box'},
    gasMeter:{w:4.4,d:2.1,h:6.2,label:'Gas / utility meter cabinet'},
    toolLocker:{w:7.8,d:3.2,h:10.8,label:'Tool / maintenance locker / locker bank'},
    lockerBank:{w:10.8,d:3.4,h:12.4,label:'Locker bank'},
    firstAid:{w:3.6,d:1.6,h:4.8,label:'First aid cabinet'},
    ppeCabinet:{w:6.2,d:2.7,h:8.8,label:'Safety equipment / PPE cabinet'},
    hoseReel:{w:6.6,d:2.5,h:8.8,label:'Standalone hose reel cabinet'},
    vendingCabinet:{w:8.8,d:4.2,h:12.4,label:'Parts vending / service cabinet'}
  }[type] || null;
}

function applyComponentPreset(type){
  const p=componentPreset(type);
  if(!p) return;
  const w=document.getElementById('w');
  const d=document.getElementById('d');
  const h=document.getElementById('h');
  if(w) w.value=Number(p.w).toFixed(1);
  if(d) d.value=Number(p.d).toFixed(1);
  if(h) h.value=Number(p.h).toFixed(1);
}

function renderShelf3d(model){
  shelf3d.setModel((THREE, helpers)=>{
    const group=new THREE.Group();
    const box=helpers.box;
    const W=Math.max(1, model.W), D=Math.max(1, model.D), H=Math.max(1, model.H);
    const mat=Math.max(0.08, model.opt.mat || 0.28);
    const metal=0x53606d, shelf=0xb7a37c, panel=0xd5c29a, dark=0x2f3a44, glass=0x90a8b9;
    function addRack(){
      const postSize=Math.max(0.28, model.opt.receiverFeature*0.38);
      const xPositions=(model.postXs||[0,W]).map(x=>x-W/2);
      const zPositions=[-D/2+postSize/2,D/2-postSize/2];
      xPositions.forEach(x=>zPositions.forEach(z=>{
        group.add(box({w:postSize,h:H,d:postSize,x,y:H/2,z,color:metal}));
      }));
      const levels=[0].concat(model.shelfYs||[]).concat([H]).filter((value,index,arr)=>index===0 || Math.abs(value-arr[index-1])>0.01);
      levels.forEach(y=>{
        group.add(box({w:W,h:Math.max(mat,0.22),d:D,x:0,y:y+mat/2,z:0,color:shelf}));
        group.add(box({w:W,h:postSize*0.55,d:postSize,x:0,y:y+postSize,z:-D/2+postSize/2,color:metal}));
        group.add(box({w:W,h:postSize*0.55,d:postSize,x:0,y:y+postSize,z:D/2-postSize/2,color:metal}));
      });
      if(model.back==='cross'){
        const radius=Math.max(0.04,postSize/4);
        group.add(helpers.cylinderBetween({x:-W/2,y:0,z:-D/2},{x:W/2,y:H,z:-D/2},radius,metal));
        group.add(helpers.cylinderBetween({x:W/2,y:0,z:-D/2},{x:-W/2,y:H,z:-D/2},radius,metal));
      }
    }
    function addCabinet(){
      group.add(box({w:W,h:H,d:D,x:0,y:H/2,z:0,color:panel,opacity:0.82}));
      group.add(box({w:W*0.94,h:H*0.9,d:mat,x:0,y:H/2,z:D/2+mat*0.7,color:0xc49b63}));
      const twoDoors=W>6.5 || model.componentType==='lockerBank' || model.componentType==='toolLocker';
      if(twoDoors){
        group.add(box({w:mat*0.55,h:H*0.82,d:mat*1.2,x:0,y:H/2,z:D/2+mat*1.4,color:dark}));
        group.add(box({w:mat*0.75,h:H*0.16,d:mat*1.8,x:-W*0.11,y:H*0.52,z:D/2+mat*2,color:dark}));
        group.add(box({w:mat*0.75,h:H*0.16,d:mat*1.8,x:W*0.11,y:H*0.52,z:D/2+mat*2,color:dark}));
      } else {
        group.add(box({w:mat*0.85,h:H*0.18,d:mat*1.8,x:W*0.28,y:H*0.52,z:D/2+mat*2,color:dark}));
      }
      if(/fire|hose/i.test(model.componentType)){
        group.add(box({w:W*0.45,h:H*0.34,d:mat*1.6,x:0,y:H*0.58,z:D/2+mat*1.8,color:glass,opacity:0.72}));
      } else if(/gasMeter|breakerBox|controlCabinet/i.test(model.componentType)){
        group.add(box({w:W*0.5,h:H*0.18,d:mat*1.5,x:0,y:H*0.68,z:D/2+mat*1.8,color:glass,opacity:0.62}));
        group.add(box({w:W*0.42,h:mat*0.5,d:mat*1.6,x:0,y:H*0.36,z:D/2+mat*1.8,color:dark}));
      }
      group.add(box({w:W,h:mat,d:D,x:0,y:H+mat/2,z:0,color:0xb28d5e}));
      group.add(box({w:W,h:mat,d:D,x:0,y:mat/2,z:0,color:0xb28d5e}));
    }
    if(model.componentType==='rack')addRack(); else addCabinet();
    group.userData.previewKind='industrial-shelf';
    return group;
  });
}

function render(){
  const W=val('w'), D=val('d'), H=val('h'), mat=val('mat'), kerf=val('kerf'), gap=val('gap');
  const componentType=choice('componentType');
  const minFeature=Math.max(1.0, val('min'));
  const receiverFeature=Math.max(2.0, minFeature);
  const railDepth=Math.max(val('rail'), receiverFeature);
  const shelfCount=Math.round(val('shelves'));
  if(componentType==='rack') syncShelfTypeControls(shelfCount); else { const host=document.getElementById('shelfTypeControls'); if(host) host.innerHTML='<div>Standalone component mode: shelf-level rack options are ignored.</div>'; }
  const shelfTypes=getInteriorShelfTypes(shelfCount);
  const cabinetDoorMode=choice('cabinetDoorMode');
  const cabinetDoorCount=choice('cabinetDoorCount');
  const doorBreakpointReal=val('doorBreakpointReal');
  const scaleDenom=150;
  const back=choice('back');
  const shelfStyle=choice('shelfStyle');
  const postMode=choice('postMode');
  const postCount = postMode==='auto' ? autoPosts(W) : parseInt(postMode,10);
  const postXs = Array.from({length:postCount},(_,i)=> i===0?receiverFeature/2 : i===postCount-1?W-receiverFeature/2 : W*i/(postCount-1));
  const shelfYs = shelfLevels(H,shelfCount,minFeature+0.3);
  const interiorShelfCount = shelfYs.length;
  const tabW=Math.max(2.0, receiverFeature);
  const tabD=Math.max(mat*2.2, 1.0);
  const slotW=Math.max(mat+kerf, 0.45); // true material-fit slot; receiving strips around slots are clamped to 2mm.
  const edgeSlotW=Math.max((mat*2)+kerf, slotW); // open edge slots clear the side/back panel plus its stiffener layer.
  // Vertical side/interior support bodies stop short of the rear by tabD; their rear tabs
  // occupy that remaining depth, so the total support length never exceeds the requested D.
  const supportDepth=Math.max(receiverFeature*2 + tabW + 0.5, D - tabD);
  const opt={slotW,edgeSlotW,tabW,tabD,postXs,shelfYs,minFeature,receiverFeature,railDepth,gap,shelfStyle,supportDepth,externalDepth:D,mat,shelfTypes,shelfCount,cabinetDoorMode,cabinetDoorCount,doorBreakpointReal,scaleDenom};
  renderShelf3d({W,D,H,opt,componentType,postXs,shelfYs,shelfCount,postCount,back});

  const pad=4;
  const titleSpace=3;
  const frameCW = W + tabD*2 + 2;
  const frameCH = D + tabD*2 + 5;
  const bays = shelfBaysFromPosts(postXs, receiverFeature);
  const maxBayW = Math.max(...bays.map(b=>b.bayW), 2);
  const shelfCW = maxBayW + tabD*2 + 2;
  const shelfCH = supportDepth + tabD*2 + 5;
  const sideCW = supportDepth + tabD + 2;
  const sideCH = H + tabD*2 + 5;
  const backCW = W + tabD*2 + 2;
  const backCH = H + tabD*2 + 5;

  const parts=[];
  if(componentType !== 'rack') {
    addStandaloneComponentParts(parts,componentType,W,D,H,mat,opt);
  } else {
  parts.push({title:'SHELF 1 / BOTTOM BASE FRAME', w:frameCW, h:frameCH, draw:(pg,x,y)=>makeTopBottomFrame(pg,x,y,W,D,opt,'SHELF 1 / BOTTOM BASE FRAME',true)});
  parts.push({title:'BOTTOM BASE FRAME DOUBLER / NO ENGRAVE', w:frameCW, h:frameCH, draw:(pg,x,y)=>makeTopBottomFrame(pg,x,y,W,D,opt,'BOTTOM BASE FRAME DOUBLER / NO ENGRAVE',false)});
  parts.push({title:`SHELF ${shelfCount} / TOP FRAME`, w:frameCW, h:frameCH, draw:(pg,x,y)=>makeTopBottomFrame(pg,x,y,W,D,opt,`SHELF ${shelfCount} / TOP FRAME`,true)});
  parts.push({title:'TOP FRAME DOUBLER / NO ENGRAVE', w:frameCW, h:frameCH, draw:(pg,x,y)=>makeTopBottomFrame(pg,x,y,W,D,opt,'TOP FRAME DOUBLER / NO ENGRAVE',false)});
  for(let i=0;i<interiorShelfCount;i++) for(const bay of bays){
    const levelType=shelfTypes[i] || shelfStyle;
    if(levelType==='fireSmall' || levelType==='fireHose'){
      const cabH=cabinetHeightForLevel(H,shelfCount,mat,opt);
      const dims=fireCabinetDims(levelType,bay.bayW,cabH,supportDepth,mat,opt);
      const typeName = levelType==='fireSmall' ? 'SMALL WALL FIRE EXTINGUISHER CABINET' : 'LARGE FIRE EXTINGUISHER + HOSE CABINET';
      parts.push({title:`SHELF ${i+2} / BAY ${bay.index+1} / ${typeName} CORE BACK`, w:dims.w + 2, h:dims.h + 5, draw:(pg,x,y)=>makeFireCabinetCorePanel(pg,x,y,dims.w,dims.h)});
      parts.push({title:`SHELF ${i+2} / BAY ${bay.index+1} / ${typeName} CORE LEFT SIDE`, w:dims.d + 2, h:dims.h + 5, draw:(pg,x,y)=>makeFireCabinetCorePanel(pg,x,y,dims.d,dims.h)});
      parts.push({title:`SHELF ${i+2} / BAY ${bay.index+1} / ${typeName} CORE RIGHT SIDE`, w:dims.d + 2, h:dims.h + 5, draw:(pg,x,y)=>makeFireCabinetCorePanel(pg,x,y,dims.d,dims.h)});
      parts.push({title:`SHELF ${i+2} / BAY ${bay.index+1} / ${typeName} CORE TOP`, w:dims.w + 2, h:dims.d + 5, draw:(pg,x,y)=>makeFireCabinetCorePanel(pg,x,y,dims.w,dims.d)});
      parts.push({title:`SHELF ${i+2} / BAY ${bay.index+1} / ${typeName} CORE BOTTOM`, w:dims.w + 2, h:dims.d + 5, draw:(pg,x,y)=>makeFireCabinetCorePanel(pg,x,y,dims.w,dims.d)});
      parts.push({title:`SHELF ${i+2} / BAY ${bay.index+1} / ${typeName} FRONT CLADDING`, w:dims.w + mat*2 + 2, h:dims.h + mat*2 + 5, draw:(pg,x,y)=>makeFireCabinetFrontCladding(pg,x,y,dims.w,dims.h,mat,opt,levelType)});
      parts.push({title:`SHELF ${i+2} / BAY ${bay.index+1} / ${typeName} LEFT CLADDING`, w:dims.d + mat + 2, h:dims.h + mat*2 + 5, draw:(pg,x,y)=>makeFireCabinetSideCladding(pg,x,y,dims.d,dims.h,mat,opt)});
      parts.push({title:`SHELF ${i+2} / BAY ${bay.index+1} / ${typeName} RIGHT CLADDING`, w:dims.d + mat + 2, h:dims.h + mat*2 + 5, draw:(pg,x,y)=>makeFireCabinetSideCladding(pg,x,y,dims.d,dims.h,mat,opt)});
      parts.push({title:`SHELF ${i+2} / BAY ${bay.index+1} / ${typeName} TOP CLADDING`, w:dims.w + mat*2 + 2, h:dims.d + mat + 5, draw:(pg,x,y)=>makeFireCabinetCapCladding(pg,x,y,dims.w,dims.d,mat,opt)});
      parts.push({title:`SHELF ${i+2} / BAY ${bay.index+1} / ${typeName} BOTTOM CLADDING`, w:dims.w + mat*2 + 2, h:dims.d + mat + 5, draw:(pg,x,y)=>makeFireCabinetCapCladding(pg,x,y,dims.w,dims.d,mat,opt)});
    } else if(['controlCabinet','breakerBox','gasMeter','toolLocker','firstAid','ppeCabinet','hoseReel','vendingCabinet'].includes(levelType)){
      const cabH=cabinetHeightForLevel(H,shelfCount,mat,opt);
      const dims=utilityCabinetDims(levelType,bay.bayW,cabH,supportDepth,mat,opt);
      const typeName=shelfTypeLabel(levelType);
      parts.push({title:`SHELF ${i+2} / BAY ${bay.index+1} / ${typeName} CORE BACK`, w:dims.w + 2, h:dims.h + 5, draw:(pg,x,y)=>makeFireCabinetCorePanel(pg,x,y,dims.w,dims.h)});
      parts.push({title:`SHELF ${i+2} / BAY ${bay.index+1} / ${typeName} CORE LEFT SIDE`, w:dims.d + 2, h:dims.h + 5, draw:(pg,x,y)=>makeFireCabinetCorePanel(pg,x,y,dims.d,dims.h)});
      parts.push({title:`SHELF ${i+2} / BAY ${bay.index+1} / ${typeName} CORE RIGHT SIDE`, w:dims.d + 2, h:dims.h + 5, draw:(pg,x,y)=>makeFireCabinetCorePanel(pg,x,y,dims.d,dims.h)});
      parts.push({title:`SHELF ${i+2} / BAY ${bay.index+1} / ${typeName} CORE TOP`, w:dims.w + 2, h:dims.d + 5, draw:(pg,x,y)=>makeFireCabinetCorePanel(pg,x,y,dims.w,dims.d)});
      parts.push({title:`SHELF ${i+2} / BAY ${bay.index+1} / ${typeName} CORE BOTTOM`, w:dims.w + 2, h:dims.d + 5, draw:(pg,x,y)=>makeFireCabinetCorePanel(pg,x,y,dims.w,dims.d)});
      parts.push({title:`SHELF ${i+2} / BAY ${bay.index+1} / ${typeName} FRONT CLADDING`, w:dims.w + mat*2 + 2, h:dims.h + mat*2 + 5, draw:(pg,x,y)=>makeUtilityCabinetFrontCladding(pg,x,y,dims.w,dims.h,mat,opt,levelType)});
      parts.push({title:`SHELF ${i+2} / BAY ${bay.index+1} / ${typeName} LEFT CLADDING`, w:dims.d + mat + 2, h:dims.h + mat*2 + 5, draw:(pg,x,y)=>makeFireCabinetSideCladding(pg,x,y,dims.d,dims.h,mat,opt)});
      parts.push({title:`SHELF ${i+2} / BAY ${bay.index+1} / ${typeName} RIGHT CLADDING`, w:dims.d + mat + 2, h:dims.h + mat*2 + 5, draw:(pg,x,y)=>makeFireCabinetSideCladding(pg,x,y,dims.d,dims.h,mat,opt)});
      parts.push({title:`SHELF ${i+2} / BAY ${bay.index+1} / ${typeName} TOP CLADDING`, w:dims.w + mat*2 + 2, h:dims.d + mat + 5, draw:(pg,x,y)=>makeFireCabinetCapCladding(pg,x,y,dims.w,dims.d,mat,opt)});
      parts.push({title:`SHELF ${i+2} / BAY ${bay.index+1} / ${typeName} BOTTOM CLADDING`, w:dims.w + mat*2 + 2, h:dims.d + mat + 5, draw:(pg,x,y)=>makeFireCabinetCapCladding(pg,x,y,dims.w,dims.d,mat,opt)});
    } else if(levelType==='cabinet'){
      const cabH=cabinetHeightForLevel(H,shelfCount,mat,opt);
      const cabW=bay.bayW;
      const cabD=supportDepth;
      const cabinetIsOpen = cabinetDoorMode !== 'closed';
      if(cabinetIsOpen){
        parts.push({title:`SHELF ${i+2} / BAY ${bay.index+1} / CABINET CORE BOTTOM`, w:cabW + tabD*2 + 2, h:cabD + tabD*2 + 5, draw:(pg,x,y)=>makeCabinetTopBottomCore(pg,x,y,cabW,cabD,opt,i,bay.index,'BOTTOM')});
        parts.push({title:`SHELF ${i+2} / BAY ${bay.index+1} / CABINET CORE TOP`, w:cabW + tabD*2 + 2, h:cabD + tabD*2 + 5, draw:(pg,x,y)=>makeCabinetTopBottomCore(pg,x,y,cabW,cabD,opt,i,bay.index,'TOP')});
      }
      parts.push({title:`SHELF ${i+2} / BAY ${bay.index+1} / CABINET CORE LEFT SIDE`, w:cabD + 2, h:cabH + 5, draw:(pg,x,y)=>makeCabinetSideCore(pg,x,y,cabD,cabH,opt)});
      parts.push({title:`SHELF ${i+2} / BAY ${bay.index+1} / CABINET CORE RIGHT SIDE`, w:cabD + 2, h:cabH + 5, draw:(pg,x,y)=>makeCabinetSideCore(pg,x,y,cabD,cabH,opt)});
      parts.push({title:`SHELF ${i+2} / BAY ${bay.index+1} / CABINET CORE BACK`, w:cabW + 2, h:cabH + 5, draw:(pg,x,y)=>makeCabinetBackCore(pg,x,y,cabW,cabH,opt)});
      parts.push({title:`SHELF ${i+2} / BAY ${bay.index+1} / CABINET FRONT CLADDING DOORS`, w:cabW + mat*2 + 2, h:cabH + mat*2 + 5, draw:(pg,x,y)=>makeCabinetFrontCladding(pg,x,y,cabW,cabH,mat,opt,cabinetDoorMode)});
      parts.push({title:`SHELF ${i+2} / BAY ${bay.index+1} / CABINET LEFT CLADDING`, w:cabD + mat + 2, h:cabH + mat*2 + 5, draw:(pg,x,y)=>makeCabinetSideCladding(pg,x,y,cabD,cabH,mat,opt,'LEFT')});
      parts.push({title:`SHELF ${i+2} / BAY ${bay.index+1} / CABINET RIGHT CLADDING`, w:cabD + mat + 2, h:cabH + mat*2 + 5, draw:(pg,x,y)=>makeCabinetSideCladding(pg,x,y,cabD,cabH,mat,opt,'RIGHT')});
      if(cabinetIsOpen){
        parts.push({title:`SHELF ${i+2} / BAY ${bay.index+1} / CABINET TOP CLADDING`, w:cabW + mat*2 + 2, h:cabD + mat + 5, draw:(pg,x,y)=>makeCabinetTopBottomCladding(pg,x,y,cabW,cabD,mat,opt,'TOP')});
        parts.push({title:`SHELF ${i+2} / BAY ${bay.index+1} / CABINET BOTTOM CLADDING`, w:cabW + mat*2 + 2, h:cabD + mat + 5, draw:(pg,x,y)=>makeCabinetTopBottomCladding(pg,x,y,cabW,cabD,mat,opt,'BOTTOM')});
      }
    } else {
      const localOpt={...opt,shelfStyle:levelType};
      parts.push({title:`SHELF ${i+2} / BAY ${bay.index+1} / ${shelfTypeLabel(levelType)}`, w:bay.bayW + tabD*2 + 2, h:shelfCH, draw:(pg,x,y)=>makeShelfBay(pg,x,y,bay.bayW,supportDepth,localOpt,i,bay.index)});
    }
  }
  for(let pi=1; pi<postXs.length-1; pi++){
    parts.push({title:`INTERIOR VERTICAL SUPPORT ${pi}`, w:sideCW, h:sideCH, draw:(pg,x,y)=>makeInteriorVerticalSupport(pg,x,y,supportDepth,H,opt,pi)});
  }
  parts.push({title:'LEFT SIDE FRAME', w:sideCW, h:sideCH, draw:(pg,x,y)=>makeSideFrame(pg,x,y,supportDepth,H,opt,'LEFT')});
  parts.push({title:'LEFT SIDE OUTER THICKENER', w:sideCW, h:sideCH, draw:(pg,x,y)=>makeSideOuter(pg,x,y,supportDepth,H,opt,'LEFT')});
  parts.push({title:'RIGHT SIDE FRAME', w:sideCW, h:sideCH, draw:(pg,x,y)=>makeSideFrame(pg,x,y,supportDepth,H,opt,'RIGHT')});
  parts.push({title:'RIGHT SIDE OUTER THICKENER', w:sideCW, h:sideCH, draw:(pg,x,y)=>makeSideOuter(pg,x,y,supportDepth,H,opt,'RIGHT')});
  parts.push({title:`BACK: ${back.toUpperCase()}`, w:backCW, h:backCH, draw:(pg,x,y)=>makeBack(pg,x,y,W,H,opt,back)});
  parts.push({title:'BACK OUTER THICKENER', w:backCW, h:backCH, draw:(pg,x,y)=>makeBackOuter(pg,x,y,W,H,opt)});

  }
  const cards=document.getElementById('previewCards');
  cards.innerHTML='';

  function makePartSvg(part){
    const svg=document.createElementNS(NS,'svg');
    const viewW=part.w + pad*2;
    const viewH=part.h + pad*2;
    svg.setAttribute('xmlns',NS);
    svg.setAttribute('viewBox',`0 0 ${viewW} ${viewH}`);
    svg.setAttribute('width',viewW*PX/3.2);
    svg.setAttribute('height',viewH*PX/3.2);
    const g=el('g',{},svg);
    part.draw(g,pad+tabD+0.5,pad+tabD+titleSpace);
    // Preview only: thicken strokes so tiny geometry stays visible without zooming.
    svg.querySelectorAll('[stroke-width]').forEach(node=>{
      const raw=parseFloat(node.getAttribute('stroke-width') || '0');
      if(!isFinite(raw) || raw<=0) return;
      const boosted=Math.max(raw * 3.2, 0.45);
      node.setAttribute('stroke-width', boosted.toFixed(3));
    });
    return svg;
  }

  function makePartDownloadSvg(part){
    const svg=document.createElementNS(NS,'svg');
    const viewW=part.w + pad*2;
    const viewH=part.h + pad*2;
    svg.setAttribute('xmlns',NS);
    svg.setAttribute('viewBox',`0 0 ${viewW} ${viewH}`);
    svg.setAttribute('width',viewW+'mm');
    svg.setAttribute('height',viewH+'mm');
    const g=el('g',{},svg);
    part.draw(g,pad+tabD+0.5,pad+tabD+titleSpace);
    return svg;
  }

  window._latestShelfParts = parts;
  window._makeShelfPartSvg = makePartDownloadSvg;

  for(const part of parts){
    const card=document.createElement('div');
    card.className='partCard';
    const h3=document.createElement('h3');
    h3.textContent=part.title;
    const matHint=materialSheetForPart(part);
    const materialDiv=document.createElement('div');
    materialDiv.className='materialHint';
    const badge=document.createElement('span');
    badge.className='materialBadge';
    badge.style.background=matHint.hex;
    badge.style.color=badgeTextColor(matHint.hex);
    const dot=document.createElement('span');
    dot.className='materialBadgeDot';
    dot.style.background=badgeTextColor(matHint.hex);
    const materialText=document.createElement('span');
    materialText.textContent=matHint.label;
    badge.appendChild(dot);
    badge.appendChild(materialText);
    badge.title='Material sheet color. Red SVG lines are retained cuts, green SVG lines are scrap/internal cutouts, and blue SVG lines engrave/score darker on this material.';
    materialDiv.appendChild(badge);
    const box=document.createElement('div');
    box.className='svgBox';
    box.appendChild(makePartSvg(part));
    const dl=document.createElement('button');
    dl.className='secondary';
    dl.style.marginTop='8px';
    dl.style.alignSelf='stretch';
    dl.style.fontSize='12px';
    dl.textContent='Download this SVG';
    dl.addEventListener('click',()=>{
      triggerSvgDownload(window._makeShelfPartSvg(part), safeFileName(part.title)+'.svg');
    });
    card.appendChild(h3);
    card.appendChild(materialDiv);
    card.appendChild(box);
    card.appendChild(dl);
    cards.appendChild(card);
  }

  // Build one hidden combined SVG for export/download while the on-screen preview remains separate cards.
  const exportSvg=document.getElementById('downloadSvg');
  exportSvg.innerHTML='';
  const g=el('g',{},exportSvg);
  const margin=8;
  const sheetMaxW=Math.max(160, Math.min(260, Math.max(W*2.4, H*2.2, 190)));
  let cursorX=margin, cursorY=margin, rowH=0, usedW=0;
  function addExportPart(part){
    const cardW = part.w + pad*2;
    const cardH = part.h + pad*2 + 5;
    if(cursorX > margin && cursorX + cardW > sheetMaxW){
      cursorX = margin;
      cursorY += rowH + gap + 6;
      rowH = 0;
    }
    const cg = el('g',{},g);
    rect(cg,cursorX,cursorY,cardW,cardH,'#bbb','none',.08);
    text(cg,cursorX+pad,cursorY+3.5,part.title,2.4);
    part.draw(cg, cursorX + pad + tabD + 0.5, cursorY + pad + tabD + 6.5);
    cursorX += cardW + gap + 6;
    rowH = Math.max(rowH, cardH);
    usedW = Math.max(usedW, cursorX);
  }
  parts.forEach(addExportPart);
  const width = Math.max(usedW + margin, sheetMaxW + margin);
  const height = cursorY + rowH + margin;
  exportSvg.setAttribute('viewBox',`0 0 ${width} ${height}`);
  exportSvg.setAttribute('width',width*PX/3.2);
  exportSvg.setAttribute('height',height*PX/3.2);

  const activePreset = componentPreset(componentType);
  const modeNote = componentType==='rack'
    ? `Component: <b>Industrial shelf rack</b>. `
    : `Component: <b>${activePreset ? activePreset.label : componentType}</b>. Default standalone size loaded: <b>${activePreset ? `${activePreset.w.toFixed(1)}×${activePreset.d.toFixed(1)}×${activePreset.h.toFixed(1)}mm` : `${W.toFixed(1)}×${D.toFixed(1)}×${H.toFixed(1)}mm`}</b> (W×D×H). `;
  document.getElementById('stats').innerHTML = modeNote + `Auto supports: <b>${postCount}</b> vertical lines at about <b>${(W/(postCount-1 || 1)).toFixed(1)}mm</b> spacing.<br>`+
    `Shelf count includes the bottom/base shelf and top shelf. Interior shelf spacing: <b>${(H/(Math.max(1,shelfCount-1))).toFixed(1)}mm</b> between shelf levels; interior shelf inserts generated: <b>${interiorShelfCount}</b>. Internal slot width: <b>${slotW.toFixed(2)}mm</b>; open doubled edge slot width: <b>${edgeSlotW.toFixed(2)}mm</b>; min structural strip: <b>${minFeature.toFixed(1)}mm</b>; slot-receiving strips: <b>${receiverFeature.toFixed(1)}mm</b> minimum.<br>`+
    `Only interior shelf levels that need physical shelf plates are split into bay sections between vertical support slot lines, because the bottom/base and top frame parts count as shelves; closed cabinet levels omit hidden shelf plates and their receiver slots. Cabinet front cladding auto-selects one door below the chosen real-width breakpoint and two doors at/above it. Fire and utility cabinet shelf types generate closed Japanese-style cabinets with name-style text removed unless that component intentionally uses an explicit engraved label; the fire cabinet types keep 消火器 / 消火栓 / ホース labels, while the other components use door, handle, vent, panel, meter, reel, and icon detailing without text labels. The shelf bay body spans from support slot line to support slot line, and the end tabs extend into the receivers. The exact shelf tab coordinates are reused to place matching receiver slots on the side frames and the separate interior vertical support parts. Top/bottom frames are doubled layers using open edge notches for the doubled side/back wall-plus-stiffener assemblies and matched enclosed slots for the interior vertical supports; only the main top/bottom layer carries blue engraving; center/side support bodies are shortened so the rear tabs fit within the requested depth D, and the back panel has matched vertical slots for those rear tabs. Each part is shown as its own preview card. Downloads can export either one combined SVG sheet or a ZIP bundle containing one SVG file for every generated part; ZIP filenames are prefixed with the material sheet group. Each file is still a single material color: red geometry is a retained cut, green geometry is scrap/internal cutout material, and blue geometry is engrave/score. Touching members on a part are represented as one perimeter outline with intentional internal cutout openings; thickener layers match the frame/rail/post outline below them, omit cross bracing, are not solid filled panels, and include matching clearance slots anywhere tabs pass through the lower layer.`;
}

function scheduleRender(){
  if(scheduleRender._pending) cancelAnimationFrame(scheduleRender._pending);
  scheduleRender._pending = requestAnimationFrame(()=>{
    scheduleRender._pending = null;
    render();
  });
}

document.querySelectorAll('.controls input, .controls select').forEach(control=>{
  control.addEventListener('input', scheduleRender);
  control.addEventListener('change', scheduleRender);
});
const componentTypeControl=document.getElementById('componentType');
if(componentTypeControl){
  componentTypeControl.addEventListener('change', ()=>{
    applyComponentPreset(componentTypeControl.value);
    scheduleRender();
  });
}
const shelfTypeHost=document.getElementById('shelfTypeControls');
if(shelfTypeHost){
  shelfTypeHost.addEventListener('input', scheduleRender);
  shelfTypeHost.addEventListener('change', scheduleRender);
}

function downloadSVG(){
  render();
  const svg=document.getElementById('downloadSvg').cloneNode(true);
  triggerSvgDownload(svg, 'industrial_shelf_generator_combined.svg');
}

function triggerBlobDownload(blob, filename){
  HakoMachiUtils.downloadBlob(blob, filename);
}

function downloadEachSVG(){
  render();
  const parts = window._latestShelfParts || [];
  const makeSvg = window._makeShelfPartSvg;
  if(!parts.length || !makeSvg) return;
  const used={};
  const files = parts.map((part,idx)=>{
    const materialPrefix=materialFilePrefix(part);
    const base=materialPrefix+'__'+safeFileName(part.title);
    used[base]=(used[base]||0)+1;
    const suffix=used[base]>1 ? '_'+used[base] : '';
    const filename=String(idx+1).padStart(2,'0')+'_'+base+suffix+'.svg';
    return {name: filename, text: serializeSvgForDownload(makeSvg(part))};
  });
  triggerBlobDownload(HakoMachiUtils.makeZipBlob(files), 'industrial_shelf_svg_parts.zip');
}

document.getElementById('refreshPreview')?.addEventListener('click', render);
document.getElementById('downloadCombinedSvg')?.addEventListener('click', downloadSVG);
document.getElementById('downloadPartZip')?.addEventListener('click', downloadEachSVG);

render();
