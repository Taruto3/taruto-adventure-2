const canvas=document.getElementById("rhythmGame"),ctx=canvas.getContext("2d"),$=s=>document.querySelector(s);
const W=1280,H=720,LANE_LEFT=180,LANE_W=222,HIT_Y=545,APPROACH=1.9,SONG_LENGTH=55;
const SONGS=[
  {name:"大冒険2",src:"assets/flowerbed-fields.ogg",bpm:118},
  {name:"大冒険3",src:"assets/mayu-kawaii-8bit.mp3?v=1",bpm:128}
];
const DIFFICULTIES=[
  {name:"EASY",beats:1.35,chord:.01},
  {name:"NORMAL",beats:1.05,chord:.05},
  {name:"HARD",beats:.82,chord:.12},
  {name:"EXPERT",beats:.64,chord:.2},
  {name:"TARUTO MASTER",beats:.5,chord:.29}
];
const laneColors=["#ff87ad","#ffe075","#82dda2","#7ed1eb"],tarutoImage=new Image();
tarutoImage.src="assets/taruto-character-v3.png";
const bgm=$("#rhythmBgm");bgm.volume=.3;
let song=0,level=0,running=false,starting=false,notes=[],score=0,combo=0,maxCombo=0;
let counts={perfect:0,great:0,good:0,miss:0,carrot:0,bone:0,duck:0,fever:0},pressed=[false,false,false,false];
let startStamp=0,nextTarget=2,noteId=0,judgeTimer=0,particles=[],feverUntil=0,lastFeverCombo=0,totalGoodNotes=0,groove=50,duckShield=0;

function bestKey(){return`taruto-rhythm-party-best-${song}-${level}`}
function loadBest(){try{return Number(localStorage.getItem(bestKey()))||0}catch(_){return 0}}
function saveBest(){try{if(score>loadBest())localStorage.setItem(bestKey(),String(score))}catch(_){}}
async function appMode(){const standalone=(window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches)||navigator.standalone===true;try{if(standalone&&screen.orientation&&screen.orientation.lock)await screen.orientation.lock("landscape")}catch(_){}}
function selectSong(next){song=next;document.querySelectorAll("[data-song]").forEach((b,i)=>b.classList.toggle("selected",i===song));bgm.src=SONGS[song].src;bgm.load()}
function selectLevel(next){level=next;document.querySelectorAll("[data-level]").forEach((b,i)=>b.classList.toggle("selected",i===level))}
document.querySelectorAll("[data-song]").forEach(b=>b.onclick=()=>selectSong(Number(b.dataset.song)));
document.querySelectorAll("[data-level]").forEach(b=>b.onclick=()=>selectLevel(Number(b.dataset.level)));

async function begin(){
  if(starting)return;starting=true;appMode();$("#rhythmTitle").classList.add("hidden");$("#rhythmResult").classList.add("hidden");$("#countdown").classList.remove("hidden");
  resetGame();for(let n=3;n>0;n--){$("#countdown").textContent=n;await wait(620)}$("#countdown").textContent="GO!";await wait(420);$("#countdown").classList.add("hidden");
  $("#rhythmHud").classList.remove("hidden");$("#laneControls").classList.remove("hidden");running=true;starting=false;startStamp=performance.now();bgm.currentTime=0;bgm.play().catch(()=>{});updateHud();
}
function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
function resetGame(){notes=[];score=0;combo=0;maxCombo=0;counts={perfect:0,great:0,good:0,miss:0,carrot:0,bone:0,duck:0,fever:0};particles=[];pressed.fill(false);judgeTimer=0;feverUntil=0;lastFeverCombo=0;nextTarget=2;noteId=0;totalGoodNotes=0;groove=50;duckShield=0;$("#feverBanner").classList.add("hidden");$("#feverHud").classList.remove("on");$("#comboBurst").classList.add("hidden")}
function songTime(){return running?(performance.now()-startStamp)/1000:0}
function isFever(now=songTime()){return running&&now<feverUntil}
function pressureLevel(){return Math.min(5,1+Math.floor(combo/12)+(isFever()?1:0))}
function updateHud(){
  $("#rhythmScore").textContent=score.toLocaleString("ja-JP");$("#rhythmCombo").textContent=combo;$("#rhythmBest").textContent=Math.max(score,loadBest()).toLocaleString("ja-JP");
  $("#rhythmLevel").textContent=`${DIFFICULTIES[level].name} Lv.${pressureLevel()}`;$("#feverValue").textContent=duckShield?"🦆 GUARD":isFever()?"DANCE!":`${Math.min(combo,15)}/15`;$("#feverHud").classList.toggle("on",isFever()||duckShield>0);
}
function spawnNotes(now){
  const d=DIFFICULTIES[level],beat=60/SONGS[song].bpm;
  while(nextTarget<=now+APPROACH&&nextTarget<SONG_LENGTH-1){
    const fever=isFever(now),density=Math.max(.53,1-Math.min(combo,65)*.007)*(fever?.72:1),lane=(noteId*3+Math.floor(noteId/3)+song+level)%4;
    const type=nextTarget>7&&Math.random()<.055?"duck":Math.random()<.5?"carrot":"bone";
    addNote(nextTarget,lane,type);
    const chordChance=d.chord+Math.min(combo,50)*.003+(fever?.16:0);
    if(type!=="duck"&&Math.random()<chordChance){let other=(lane+2+(noteId%2))%4;if(other===lane)other=(lane+1)%4;addNote(nextTarget,other,Math.random()<.5?"carrot":"bone")}
    nextTarget+=beat*d.beats*density;noteId++;
  }
}
function addNote(time,lane,type){notes.push({time,lane,type,done:false,id:noteId+notes.length/100});totalGoodNotes++}
function showJudge(text,color){const el=$("#judgeText");el.textContent=text;el.style.color=color;el.classList.remove("hidden");el.style.animation="none";void el.offsetWidth;el.style.animation="";judgeTimer=26}
function changeGroove(amount){groove=Math.max(0,Math.min(100,groove+amount))}
function showCombo(){const el=$("#comboBurst");if(combo<2){el.classList.add("hidden");return}$("#comboBurstValue").textContent=combo;el.className=`combo-burst${combo>=50?" ultra":combo>=30?" super":combo>=10?" hot":""}`;el.style.animation="none";void el.offsetWidth;el.style.animation=""}
function breakCombo(){combo=0;showCombo()}
function guardMiss(){if(!duckShield)return false;duckShield=0;showJudge("カモさんガード！","#8ff1df");burst("#8ff1df",24);sfx(760,.12);updateHud();return true}
function triggerFever(now){
  feverUntil=Math.max(feverUntil,now+8);lastFeverCombo=combo;counts.fever++;$("#feverBanner").classList.remove("hidden");setTimeout(()=>$("#feverBanner").classList.add("hidden"),1300);burst("#fff37a",30);sfx(880,.12);setTimeout(()=>sfx(1175,.14),90);
}
function hitLane(lane){
  if(!running)return;const now=songTime(),available=notes.filter(n=>!n.done&&n.lane===lane),note=available.reduce((best,n)=>Math.abs(n.time-now)<Math.abs((best?best.time:999)-now)?n:best,null);
  if(!note||Math.abs(note.time-now)>.23){if(guardMiss())return;breakCombo();changeGroove(-6);showJudge("MISS -6%","#ff7398");counts.miss++;feverUntil=0;sfx(145,.07);updateHud();return}
  note.done=true;
  const delta=Math.abs(note.time-now);let label,color,points;
  if(delta<=.06){label="PERFECT!";color="#fff06d";points=1000;counts.perfect++}else if(delta<=.13){label="GREAT!";color="#8ff1df";points=650;counts.great++}else{label="GOOD";color="#a7e889";points=350;counts.good++}
  counts[note.type]++;combo++;maxCombo=Math.max(maxCombo,combo);const fever=isFever(now),duckBonus=note.type==="duck";changeGroove(((delta<=.06?2.4:delta<=.13?1.6:.7)+(duckBonus?8:0))*(fever?1.25:1));score+=Math.round(((duckBonus?1500:points)+combo*6)*(fever?2:1));if(duckBonus)duckShield=1;showJudge(duckBonus?"カモさんガード GET!":fever?`${label} ×2`:label,duckBonus?"#8ff1df":color);showCombo();burst(duckBonus?"#8ff1df":laneColors[lane],duckBonus?28:fever?24:13);sfx(duckBonus?760:note.type==="carrot"?660:520,.055);
  if(combo>=15&&combo%15===0&&combo!==lastFeverCombo)triggerFever(now);updateHud();
}
function missNote(note){note.done=true;if(guardMiss())return;counts.miss++;breakCombo();changeGroove(-8);feverUntil=0;showJudge("MISS -8%","#ff7398");updateHud()}
function burst(color,amount=12){for(let i=0;i<amount;i++)particles.push({x:LANE_LEFT+LANE_W*2,y:HIT_Y,vx:(Math.random()-.5)*10,vy:-3-Math.random()*8,life:38,color})}
let audioCtx;
function sfx(freq,duration){try{audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.frequency.value=freq;o.type="sine";g.gain.setValueAtTime(.045,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration)}catch(_){}}
function finish(){
  running=false;bgm.pause();saveBest();$("#rhythmHud").classList.add("hidden");$("#laneControls").classList.add("hidden");$("#judgeText").classList.add("hidden");$("#comboBurst").classList.add("hidden");$("#feverBanner").classList.add("hidden");
  const cleared=groove>=70,judged=counts.perfect+counts.great+counts.good+counts.miss,accuracy=judged?(counts.perfect+counts.great*.75+counts.good*.4)/judged:0,grade=!cleared?"D":counts.miss===0&&accuracy>.97?"SSS":accuracy>=.92?"S":accuracy>=.8?"A":accuracy>=.66?"B":accuracy>=.5?"C":"D";
  const dance={SSS:"伝説のパーフェクトダンス",S:"キラキラダンサーたると",A:"ノリノリたると",B:"ごきげんステップ",C:"もう少し踊ろう",D:"リズムの特訓だ！"}[grade];
  $("#resultGrade").textContent=grade;$("#danceName").textContent=cleared?dance:"ゲージ70%に届かず…";$("#perfectCount").textContent=counts.perfect;$("#greatCount").textContent=counts.great;$("#goodCount").textContent=counts.good;$("#missCount").textContent=counts.miss;$("#maxComboResult").textContent=maxCombo;$("#resultGauge").textContent=`${Math.round(groove)}%`;$("#finalScore").textContent=score.toLocaleString("ja-JP");$("#carrotCount").textContent=counts.carrot;$("#boneCount").textContent=counts.bone;$("#duckCount").textContent=counts.duck;$("#resultTitle").textContent=!cleared?"クリア失敗！もう一度！":grade==="SSS"?"たると、完璧に踊った！":"RHYTHM CLEAR！";$("#rhythmResult").classList.remove("hidden");
}
function update(){
  if(!running)return;const now=songTime();spawnNotes(now);for(const n of notes)if(!n.done&&now-n.time>.24)missNote(n);particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.28;p.life--});particles=particles.filter(p=>p.life>0);if(judgeTimer>0&&--judgeTimer===0)$("#judgeText").classList.add("hidden");updateHud();if(now>SONG_LENGTH)finish();
}
function rounded(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function drawTaruto(now){
  if(!tarutoImage.complete)return;const fever=isFever(now),dance=fever?Math.sin(now*15)*13:combo>4?Math.sin(now*7)*5:0,tilt=fever?Math.sin(now*12)*.12:0;ctx.save();ctx.translate(78,490+dance);ctx.rotate(tilt);ctx.drawImage(tarutoImage,-70,-70,140,140);ctx.restore();ctx.fillStyle="#fff";ctx.font="900 10px sans-serif";ctx.textAlign="center";ctx.fillText(fever?"たるとフィーバー！":combo>=5?"踊ってる♪":"コンボでダンス！",78,395);if(fever){ctx.fillStyle="#fff06d";ctx.font="900 27px sans-serif";ctx.fillText("♪♫",78,335)}
}
function drawNote(note,x,y){
  ctx.save();ctx.translate(x,y);ctx.shadowColor=laneColors[note.lane];ctx.shadowBlur=15;
  if(note.type==="carrot"){ctx.fillStyle="#ff9650";ctx.strokeStyle="#fff0d5";ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(0,0,27,38,-.35,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle="#74c77b";for(let i=-1;i<=1;i++){ctx.save();ctx.rotate(i*.4);ctx.fillRect(-5,-49,10,20);ctx.restore()}ctx.fillStyle="#6d4251";ctx.font="900 9px sans-serif";ctx.textAlign="center";ctx.fillText("人参ちゃん",0,4)}
  else if(note.type==="bone"){ctx.strokeStyle="#a77c5f";ctx.fillStyle="#fff4dd";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-25,-14);ctx.quadraticCurveTo(-42,-28,-45,-9);ctx.quadraticCurveTo(-48,8,-28,8);ctx.lineTo(28,8);ctx.quadraticCurveTo(48,8,45,-9);ctx.quadraticCurveTo(42,-28,25,-14);ctx.lineTo(-25,-14);ctx.fill();ctx.stroke();ctx.fillStyle="#8a6656";ctx.font="900 11px sans-serif";ctx.textAlign="center";ctx.fillText("ホネッコ",0,2)}
  else{ctx.font="58px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("🦆",0,0)}
  ctx.shadowBlur=0;ctx.strokeStyle="#fff";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-45,0);ctx.lineTo(45,0);ctx.stroke();ctx.strokeStyle="#68445f";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-45,0);ctx.lineTo(45,0);ctx.stroke();ctx.restore();
}
function drawGroove(){
  const x=1110,y=135,w=86,h=365,fillH=(h-18)*groove/100,color=groove>=70?"#7ff0a5":groove>=35?"#ffe06c":"#ff7194";ctx.save();ctx.fillStyle="#4b365fd9";rounded(x,y,w,h,24);ctx.fill();ctx.strokeStyle="#fff";ctx.lineWidth=4;ctx.stroke();ctx.fillStyle="#ffffff17";rounded(x+10,y+10,w-20,h-20,15);ctx.fill();ctx.fillStyle=color;rounded(x+10,y+h-10-fillH,w-20,fillH,13);ctx.fill();ctx.shadowColor=color;ctx.shadowBlur=18;ctx.strokeStyle=color;ctx.lineWidth=3;ctx.stroke();ctx.shadowBlur=0;const clearY=y+10+(h-20)*.3;ctx.strokeStyle="#fff";ctx.lineWidth=3;ctx.setLineDash([7,5]);ctx.beginPath();ctx.moveTo(x+5,clearY);ctx.lineTo(x+w-5,clearY);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle="#fff";ctx.font="900 12px sans-serif";ctx.textAlign="center";ctx.fillText("CLEAR 70%",x+w/2,clearY-7);ctx.font="900 18px sans-serif";ctx.fillText(`${Math.round(groove)}%`,x+w/2,y+h+25);ctx.font="900 11px sans-serif";ctx.fillText("GROOVE",x+w/2,y-12);ctx.restore();
}
function draw(){
  const now=songTime();ctx.clearRect(0,0,W,H);const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,isFever(now)?"#ff7bb3":"#72518e");sky.addColorStop(1,isFever(now)?"#6ed7c7":"#f49bb1");ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  ctx.fillStyle="#ffffff18";for(let i=0;i<10;i++){ctx.beginPath();ctx.arc((i*149-now*25)%1450,90+(i%3)*70,30+(i%2)*15,0,Math.PI*2);ctx.fill()}drawTaruto(now);
  const boardX=LANE_LEFT-20,boardW=LANE_W*4+40;ctx.fillStyle="#4d3b65dd";rounded(boardX,58,boardW,598,25);ctx.fill();
  for(let i=0;i<4;i++){const x=LANE_LEFT+i*LANE_W;ctx.fillStyle=laneColors[i]+"42";ctx.fillRect(x,68,LANE_W-4,568);ctx.strokeStyle="#ffffff3d";ctx.lineWidth=2;ctx.strokeRect(x,68,LANE_W-4,568);ctx.strokeStyle="#ffffff28";ctx.setLineDash([8,10]);ctx.beginPath();ctx.moveTo(x+LANE_W/2-2,70);ctx.lineTo(x+LANE_W/2-2,HIT_Y);ctx.stroke();ctx.setLineDash([])}
  ctx.strokeStyle="#fff";ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(LANE_LEFT,HIT_Y);ctx.lineTo(LANE_LEFT+LANE_W*4-4,HIT_Y);ctx.stroke();ctx.strokeStyle="#ffef72";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(LANE_LEFT,HIT_Y);ctx.lineTo(LANE_LEFT+LANE_W*4-4,HIT_Y);ctx.stroke();ctx.fillStyle="#fff";ctx.font="900 13px sans-serif";ctx.textAlign="center";ctx.fillText("ノーツの中心線を ここに合わせよう！",LANE_LEFT+LANE_W*2,HIT_Y-36);
  if(running)for(const n of notes){if(n.done)continue;const y=HIT_Y-(n.time-now)/APPROACH*(HIT_Y-86);if(y>-70&&y<HIT_Y+60)drawNote(n,LANE_LEFT+n.lane*LANE_W+LANE_W/2-2,y)}drawGroove();
  particles.forEach(p=>{ctx.globalAlpha=p.life/38;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);ctx.fill()});ctx.globalAlpha=1;
}
function loop(){update();draw();requestAnimationFrame(loop)}
function setLane(lane,on){pressed[lane]=on;const button=document.querySelector(`[data-lane="${lane}"]`);if(button)button.classList.toggle("active",on);if(on)hitLane(lane)}
function vibrateButton(){try{if(navigator.vibrate)navigator.vibrate(18)}catch(_){}}
const keys={d:0,f:1,j:2,k:3};addEventListener("keydown",e=>{const lane=keys[e.key.toLowerCase()];if(lane!==undefined&&!pressed[lane]){e.preventDefault();setLane(lane,true)}});addEventListener("keyup",e=>{const lane=keys[e.key.toLowerCase()];if(lane!==undefined){e.preventDefault();setLane(lane,false)}});
document.querySelectorAll("[data-lane]").forEach(b=>{const lane=Number(b.dataset.lane);b.onpointerdown=e=>{e.preventDefault();if(b.setPointerCapture)b.setPointerCapture(e.pointerId);if(!pressed[lane]){vibrateButton();setLane(lane,true)}};b.onpointerup=b.onpointercancel=()=>setLane(lane,false);b.oncontextmenu=e=>e.preventDefault()});
$("#rhythmStart").onclick=begin;$("#rhythmRetry").onclick=begin;$("#rhythmHome").onclick=()=>location.href="index.html";addEventListener("blur",()=>pressed.forEach((_,i)=>setLane(i,false)));selectSong(0);selectLevel(0);draw();requestAnimationFrame(loop);
const localPlayPreview=(location.protocol==="file:"||location.hostname==="localhost"||location.hostname==="127.0.0.1")&&new URLSearchParams(location.search).has("play");if(localPlayPreview){selectLevel(2);setTimeout(begin,60)}
