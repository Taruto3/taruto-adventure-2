const canvas=document.getElementById("rhythmGame"),ctx=canvas.getContext("2d"),$=s=>document.querySelector(s);
const W=1280,H=720,LANES=4,LANE_LEFT=330,LANE_W=155,HIT_Y=585,APPROACH=1.85,SONG_LENGTH=47,BPM=128,BEAT=60/BPM;
const DIFFICULTIES=[
  {name:"EASY",step:1,chord:.02,offbeat:0},
  {name:"NORMAL",step:.75,chord:.08,offbeat:.1},
  {name:"HARD",step:.5,chord:.16,offbeat:.18},
  {name:"EXPERT",step:.375,chord:.27,offbeat:.28},
  {name:"MUSCLE MASTER",step:.25,chord:.42,offbeat:.42}
];
const itemIcons={dumbbell:"●━●",barbell:"▰━━▰",protein:"WHEY"},laneColors=["#ff5f83","#54e4eb","#54e4eb","#ff5f83"];
const tarutoImage=new Image();tarutoImage.src="assets/taruto-card-v1.png";
const bgm=$("#rhythmBgm");bgm.volume=.3;
let level=0,running=false,starting=false,notes=[],score=0,combo=0,maxCombo=0,counts={perfect:0,great:0,good:0,miss:0},pressed=[false,false,false,false],startStamp=0,judgeTimer=0,judgeLabel="",particles=[],caught=[];

function rng(seed){let n=seed|0;return()=>((n=Math.imul(48271,n)%2147483647)&2147483647)/2147483647}
function buildChart(){
  const d=DIFFICULTIES[level],random=rng(8173+level*997),chart=[];let index=0;
  for(let t=2;t<SONG_LENGTH-1;t+=BEAT*d.step){
    let lane=(index*3+Math.floor(index/3)+level)%4;if(random()<d.offbeat)lane=Math.floor(random()*4);
    const type=index%11===7?"protein":index%7===4?"barbell":"dumbbell";
    chart.push({time:t,lane,type,hit:false,miss:false,id:index++});
    if(random()<d.chord){let second=(lane+2+(random()<.5?0:1))%4;if(second===lane)second=(lane+1)%4;chart.push({time:t,lane:second,type:"barbell",hit:false,miss:false,id:index++})}
  }
  return chart.sort((a,b)=>a.time-b.time||a.lane-b.lane);
}
function bestKey(){return`taruto-muscle-beat-best-${level}`}
function loadBest(){try{return Number(localStorage.getItem(bestKey()))||0}catch(_){return 0}}
function saveBest(){try{if(score>loadBest())localStorage.setItem(bestKey(),String(score))}catch(_){}}
async function fullscreen(){const standalone=(window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches)||navigator.standalone===true;try{if(standalone&&screen.orientation&&screen.orientation.lock)await screen.orientation.lock("landscape")}catch(_){}}
function selectLevel(next){level=next;document.querySelectorAll("[data-level]").forEach((b,i)=>b.classList.toggle("selected",i===level))}
document.querySelectorAll("[data-level]").forEach(b=>b.onclick=()=>selectLevel(Number(b.dataset.level)));

async function begin(){
  if(starting)return;starting=true;fullscreen();$("#rhythmTitle").classList.add("hidden");$("#rhythmResult").classList.add("hidden");$("#countdown").classList.remove("hidden");
  resetGame();for(let n=3;n>0;n--){$("#countdown").textContent=n;await new Promise(r=>setTimeout(r,650))}$("#countdown").textContent="GO!";await new Promise(r=>setTimeout(r,450));$("#countdown").classList.add("hidden");
  $("#rhythmHud").classList.remove("hidden");$("#laneControls").classList.remove("hidden");running=true;starting=false;startStamp=performance.now();bgm.currentTime=0;bgm.play().catch(()=>{});updateHud();
}
function resetGame(){notes=buildChart();score=0;combo=0;maxCombo=0;counts={perfect:0,great:0,good:0,miss:0};particles=[];caught=[];pressed.fill(false);judgeTimer=0}
function songTime(){return running?(performance.now()-startStamp)/1000:0}
function updateHud(){$("#rhythmScore").textContent=score.toLocaleString("ja-JP");$("#rhythmCombo").textContent=combo;$("#rhythmBest").textContent=Math.max(score,loadBest()).toLocaleString("ja-JP");$("#rhythmLevel").textContent=DIFFICULTIES[level].name}
function showJudge(text,color){judgeLabel=text;judgeTimer=24;const el=$("#judgeText");el.textContent=text;el.style.color=color;el.classList.remove("hidden");el.style.animation="none";void el.offsetWidth;el.style.animation=""}
function hitLane(lane){
  if(!running)return;const now=songTime(),candidates=notes.filter(n=>!n.hit&&!n.miss&&n.lane===lane),note=candidates.reduce((best,n)=>Math.abs(n.time-now)<Math.abs((best?best.time:999)-now)?n:best,null);
  if(!note||Math.abs(note.time-now)>.2){combo=0;showJudge("MISS","#ff718c");updateHud();return}
  const delta=Math.abs(note.time-now);note.hit=true;caught.push(note.type);let label,color,points;
  if(delta<=.055){label="PERFECT!";color="#ffe059";points=1000;counts.perfect++}else if(delta<=.115){label="GREAT!";color="#54e4eb";points=650;counts.great++}else{label="GOOD";color="#9bea7b";points=350;counts.good++}
  combo++;maxCombo=Math.max(maxCombo,combo);score+=points+combo*5;showJudge(label,color);burst(laneColors[lane]);updateHud();
}
function missNote(note){note.miss=true;counts.miss++;combo=0;showJudge("MISS","#ff718c");updateHud()}
function burst(color){for(let i=0;i<12;i++)particles.push({x:LANE_LEFT+LANE_W*2,y:HIT_Y,vx:(Math.random()-.5)*9,vy:-3-Math.random()*7,life:35,color})}
function finish(){
  running=false;bgm.pause();saveBest();$("#rhythmHud").classList.add("hidden");$("#laneControls").classList.add("hidden");$("#judgeText").classList.add("hidden");
  const total=notes.length,accuracy=(counts.perfect+counts.great*.75+counts.good*.4)/total,allPerfect=counts.perfect===total,grade=allPerfect?"SSS":accuracy>=.93?"S":accuracy>=.82?"A":accuracy>=.68?"B":accuracy>=.5?"C":"D";
  const muscle={SSS:[5,"伝説のパーフェクト筋肉"],S:[5,"超高校級マッスル"],A:[4,"マッスル高校生"],B:[3,"成長中マッスル"],C:[2,"筋トレ見習い"],D:[1,"これから鍛えよう"]}[grade];
  $("#resultGrade").textContent=grade;$("#muscleName").textContent=muscle[1];$("#resultKouki").className=`result-kouki muscle-${muscle[0]}`;$("#perfectCount").textContent=counts.perfect;$("#greatCount").textContent=counts.great;$("#goodCount").textContent=counts.good;$("#missCount").textContent=counts.miss;$("#maxComboResult").textContent=maxCombo;$("#finalScore").textContent=score.toLocaleString("ja-JP");
  $("#resultTitle").textContent=grade==="SSS"&&level===4?"最高難度パーフェクト達成！":"トレーニング完了！";$("#caughtPile").innerHTML=caught.slice(0,42).map(t=>`<span>${itemIcons[t]}</span>`).join("");$("#rhythmResult").classList.remove("hidden");
}
function update(){
  if(!running)return;const now=songTime();for(const n of notes)if(!n.hit&&!n.miss&&now-n.time>.22)missNote(n);particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.3;p.life--});particles=particles.filter(p=>p.life>0);if(judgeTimer>0&&--judgeTimer===0)$("#judgeText").classList.add("hidden");if(now>SONG_LENGTH)finish();
}
function rounded(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function drawKouki(){ctx.save();ctx.translate(1030,535);const pump=Math.min(1,caught.length/Math.max(1,notes.length*.7));ctx.fillStyle="#efbf98";ctx.beginPath();ctx.arc(0,-90,34,0,7);ctx.fill();ctx.fillStyle="#24212a";ctx.beginPath();ctx.arc(0,-102,37,Math.PI,0);ctx.fill();ctx.fillStyle="#477aaa";rounded(-43,-55,86,100,22);ctx.fill();ctx.strokeStyle="#efbf98";ctx.lineWidth=18+pump*16;ctx.beginPath();ctx.moveTo(-38,-35);ctx.lineTo(-68,-4);ctx.moveTo(38,-35);ctx.lineTo(68,-4);ctx.stroke();ctx.fillStyle="#fff";ctx.font="900 13px sans-serif";ctx.textAlign="center";ctx.fillText("こうき",0,-132);ctx.restore()}
function drawTaruto(){if(!tarutoImage.complete)return;ctx.save();ctx.translate(92,85);ctx.drawImage(tarutoImage,0,0,175,145);ctx.fillStyle="#fff";ctx.font="900 13px sans-serif";ctx.textAlign="center";ctx.fillText("たるとが投げるぞ！",88,5);ctx.restore()}
function drawItem(note,x,y,size=45){
  ctx.save();ctx.translate(x,y);const scale=size/45;ctx.scale(scale,scale);ctx.shadowColor=laneColors[note.lane];ctx.shadowBlur=16;ctx.strokeStyle="#f5f7ff";ctx.fillStyle=note.type==="protein"?"#fff4dc":"#3a4052";ctx.lineWidth=4;
  if(note.type==="protein"){rounded(-21,-27,42,54,9);ctx.fill();ctx.stroke();ctx.fillStyle=laneColors[note.lane];ctx.fillRect(-21,-7,42,23);ctx.fillStyle="#202039";ctx.font="900 9px sans-serif";ctx.textAlign="center";ctx.fillText("WHEY",0,8);ctx.fillStyle="#cfd4dd";rounded(-14,-35,28,11,4);ctx.fill();ctx.stroke()}
  else{const long=note.type==="barbell",bar=long?38:22;ctx.lineCap="round";ctx.strokeStyle="#d7dbe4";ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-bar,0);ctx.lineTo(bar,0);ctx.stroke();ctx.fillStyle=long?"#24293a":"#4b5267";ctx.strokeStyle="#fff";ctx.lineWidth=3;for(const side of[-1,1]){const px=side*bar;rounded(px-(side<0?13:1),-18,14,36,5);ctx.fill();ctx.stroke();if(long){rounded(px-(side<0?22:-8),-14,9,28,4);ctx.fill();ctx.stroke()}}}
  ctx.restore();
}
function draw(){
  ctx.clearRect(0,0,W,H);const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,"#242040");sky.addColorStop(1,"#6e315e");ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);ctx.fillStyle="#ffffff0d";for(let i=0;i<9;i++)ctx.fillRect(i*170-(songTime()*20)%170,90+(i%3)*55,110,8);drawTaruto();drawKouki();
  const boardX=LANE_LEFT-20,boardW=LANE_W*4+40;ctx.fillStyle="#121126dd";rounded(boardX,62,boardW,590,24);ctx.fill();for(let i=0;i<4;i++){const x=LANE_LEFT+i*LANE_W;ctx.fillStyle=i===0||i===3?"#6d294d77":"#226d7a66";ctx.fillRect(x,70,LANE_W-4,560);ctx.strokeStyle="#ffffff33";ctx.strokeRect(x,70,LANE_W-4,560);ctx.fillStyle=pressed[i]?"#fff":"#282447";rounded(x+12,HIT_Y-22,LANE_W-28,46,12);ctx.fill();ctx.strokeStyle=laneColors[i];ctx.lineWidth=5;ctx.stroke();ctx.fillStyle=pressed[i]?"#2a2443":"#fff";ctx.font="900 22px sans-serif";ctx.textAlign="center";ctx.fillText(["D","F","J","K"][i],x+LANE_W/2-2,HIT_Y+8)}
  if(running){const now=songTime();for(const n of notes){if(n.hit||n.miss)continue;const y=HIT_Y-(n.time-now)/APPROACH*(HIT_Y-85);if(y>-70&&y<HIT_Y+50)drawItem(n,LANE_LEFT+n.lane*LANE_W+LANE_W/2-2,y,n.type==="barbell"?50:43)}}
  particles.forEach(p=>{ctx.globalAlpha=p.life/35;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,4,0,7);ctx.fill()});ctx.globalAlpha=1;
}
function loop(){update();draw();requestAnimationFrame(loop)}
function setLane(lane,on){pressed[lane]=on;document.querySelector(`[data-lane="${lane}"]`).classList.toggle("active",on);if(on)hitLane(lane)}
function vibrateButton(){try{if(navigator.vibrate)navigator.vibrate(18)}catch(_){}}
const keys={d:0,f:1,j:2,k:3};addEventListener("keydown",e=>{const lane=keys[e.key.toLowerCase()];if(lane!==undefined&&!pressed[lane]){e.preventDefault();setLane(lane,true)}});addEventListener("keyup",e=>{const lane=keys[e.key.toLowerCase()];if(lane!==undefined){e.preventDefault();setLane(lane,false)}});
document.querySelectorAll("[data-lane]").forEach(b=>{const lane=Number(b.dataset.lane);b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture&&b.setPointerCapture(e.pointerId);if(!pressed[lane]){vibrateButton();setLane(lane,true)}};b.onpointerup=b.onpointercancel=()=>setLane(lane,false);b.oncontextmenu=e=>e.preventDefault()});
$("#rhythmStart").onclick=begin;$("#rhythmRetry").onclick=begin;$("#rhythmHome").onclick=()=>location.href="index.html";addEventListener("blur",()=>pressed.forEach((_,i)=>setLane(i,false)));selectLevel(0);draw();requestAnimationFrame(loop);
const localPlayPreview=(location.protocol==="file:"||location.hostname==="localhost"||location.hostname==="127.0.0.1")&&new URLSearchParams(location.search).has("play");if(localPlayPreview){selectLevel(2);setTimeout(begin,60)}
