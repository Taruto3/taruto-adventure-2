const canvas=document.getElementById("runGame"),ctx=canvas.getContext("2d"),$=s=>document.querySelector(s);
const W=1280,H=720,groundY=590,worldW=16200,goalX=16050,RUN_TIME=405,MAX_CHASE=620;
const MAYU_HIGH_SCORE_KEY="taruto-adventure-3-high-score";
let running=false,paused=false,pauseStarted=0,won=false,last=0,camera=0,lives=5,score=0,timeLeft=RUN_TIME*10,endTime=0;
let player,items,enemies,ducks,projectiles,musicNotes,barkWaves,thrownBones,splashes,sandPuffs,duckHearts,rainbowBerry,chase=0,chaseRetreat=0,boneRetreating=false,goldPower=0,mayuPowerFx=0,tarutoHappy=0,tarutoStun=0,bites=0,defeated=0,duckJumps=0,duckScoreTotal=0,duckSpawnTimer=0,actionMistakes=0,messageTimer,actionMessage="",actionMessageUntil=0,jumpHeld=false,jumpHold=0;
let audioCtx,lastBarkCycle=-1,gameOverSequence=false,gameOverTimers=[],mapDebugMode=false,mapDebugPan=0,mapDebugDragX=null;
let highScore=loadHighScore();
const grounds=[{x:0,w:2750},{x:3010,w:490},{x:3820,w:780},{x:4900,w:1520},{x:6700,w:1200},{x:8300,w:850},{x:9600,w:700},{x:10650,w:950},{x:12050,w:550},{x:12900,w:300},{x:13600,w:250},{x:14170,w:380},{x:15000,w:1200}];
const ledges=[
  {x:1045,y:405,w:105,h:24},{x:1190,y:490,w:155,h:24},
  {x:1740,y:425,w:155,h:24},
  {x:3220,y:390,w:160,h:24},{x:3710,y:465,w:135,h:24},
  {x:4300,y:420,w:135,h:24},
  {x:4720,y:375,w:105,h:24},{x:4885,y:295,w:125,h:24},
  {x:5570,y:385,w:150,h:24},
  {x:7310,y:500,w:115,h:24},{x:7525,y:415,w:150,h:24},
  {x:7950,y:350,w:145,h:24},{x:8180,y:475,w:150,h:24},
  {x:8460,y:490,w:100,h:24},{x:8670,y:410,w:150,h:24},{x:8910,y:495,w:110,h:24},
  {x:9070,y:395,w:115,h:24},{x:9290,y:300,w:145,h:24},{x:9500,y:460,w:130,h:24},
  {x:10950,y:485,w:130,h:24},{x:11220,y:390,w:155,h:24},
  {x:12410,y:420,w:150,h:24},{x:13020,y:470,w:165,h:24},
  {x:14020,y:390,w:150,h:24},{x:14320,y:300,w:125,h:24},
  {x:14700,y:450,w:140,h:24},{x:14900,y:350,w:120,h:24}
];
const stairs=[
  {x:2490,y:430,w:110,h:160},{x:4860,y:390,w:110,h:200},
  {x:6880,y:390,w:110,h:200},{x:13500,y:370,w:110,h:220},
  {x:9780,y:530,w:90,h:60},{x:9870,y:470,w:90,h:120},{x:9960,y:410,w:90,h:180},
  {x:10050,y:350,w:90,h:240},{x:10140,y:290,w:220,h:300}
  ,{x:15000,y:530,w:90,h:60},{x:15090,y:470,w:90,h:120},{x:15180,y:410,w:90,h:180},
  {x:15270,y:350,w:90,h:240},{x:15360,y:290,w:90,h:300},{x:15450,y:230,w:170,h:360}
];
const slopes=[{x:5760,w:660,rise:300},{x:12200,w:650,rise:250}];
const sandZones=[{x:1800,w:240},{x:3500,w:320},{x:5700,w:260},{x:7200,w:320},{x:9150,w:450},{x:11600,w:450},{x:13200,w:400}].map((zone,index)=>({...zone,debugNo:index+1}));
const cliffZones=[{x:2750,w:260},{x:4600,w:300},{x:6420,w:280},{x:7900,w:400},{x:10300,w:350},{x:13850,w:320}].map((zone,index)=>({...zone,debugNo:index+1}));
const mayuSprite=new Image();mayuSprite.src="assets/mayu-game-v1.png";
function enemySurfaceY(enemy,maxRise=Infinity){
  const center=enemy.x+29,surfaces=[];
  grounds.forEach(g=>{if(center>=g.x&&center<=g.x+g.w)surfaces.push(groundY)});
  sandZones.forEach(g=>{if(center>=g.x&&center<=g.x+g.w)surfaces.push(groundY)});
  ledges.forEach(p=>{if(center>=p.x&&center<=p.x+p.w)surfaces.push(p.y)});
  stairs.forEach(p=>{if(center>=p.x&&center<=p.x+p.w)surfaces.push(p.y)});
  const feet=enemy.y+105,reachable=surfaces.filter(y=>y>=feet-maxRise);
  return (reachable.length?Math.min(...reachable):groundY)-105;
}

function reset(){
  gameOverTimers.forEach(clearTimeout);gameOverTimers=[];gameOverSequence=false;$("#gameOverOverlay").classList.add("hidden");$("#biteEffect").classList.add("hidden");
  clearTimeout(messageTimer);actionMessage="";actionMessageUntil=0;$("#message").classList.add("hidden");
  paused=false;pauseStarted=0;$("#pauseOverlay").classList.add("hidden");const pauseButton=$("#pauseBtn");pauseButton.innerHTML="<span>Ⅱ</span> ポーズ";pauseButton.setAttribute("aria-label","一時停止");
  $("#perfectCelebration").classList.add("hidden");$("#highScoreCelebration").classList.add("hidden");
  camera=0;lives=5;score=0;timeLeft=RUN_TIME*10;endTime=performance.now()+RUN_TIME*1000;won=false;chase=0;chaseRetreat=0;boneRetreating=false;goldPower=0;mayuPowerFx=0;tarutoHappy=0;tarutoStun=0;bites=0;defeated=0;duckJumps=0;duckScoreTotal=0;duckSpawnTimer=25;actionMistakes=0;projectiles=[];musicNotes=[];barkWaves=[];thrownBones=[];splashes=[];sandPuffs=[];duckHearts=[];jumpHeld=false;jumpHold=0;lastBarkCycle=-1;
  rainbowBerry={x:15910,y:260,taken:false,phase:0};
  player={x:510,y:groundY-105,w:58,h:105,vx:4.8,vy:0,onGround:false,onSand:false,inv:0,attack:0,cool:0,throwAnim:0,lastGoldPower:0};
  items=[
    [720,520,"chocolate"],[1097,350,"chocolate",49],[1267,435,"chocolate",50],[1570,520,"chocolate"],[1980,520,"strawberry"],
    [2380,300,"chocolate"],[3090,520,"strawberry"],[3260,520,"chocolate"],[3520,315,"strawberry"],
    [4080,520,"chocolate"],[4490,520,"strawberry"],[4780,300,"chocolate"],[5350,520,"strawberry"],
    [6030,300,"chocolate"],[6250,235,"strawberry"],[7390,455,"strawberry"],[7740,360,"chocolate"],
    [8090,285,"strawberry"],[8500,445,"chocolate"],[8750,355,"strawberry"],[9050,340,"chocolate"],
    [9390,245,"strawberry"],[9730,520,"chocolate"],[10040,350,"strawberry"],[10310,235,"chocolate"],
    [1430,520,"bone"],[3400,520,"bone"],[3780,415,"bone"],[5260,520,"bone"],[7120,520,"bone"],[8840,355,"bone"],[10720,520,"bone"],[12150,500,"bone"],[13150,345,"bone"],
    [4050,520,"goldStrawberry"],[10800,520,"goldStrawberry"],
    [10980,435,"chocolate"],[11300,335,"strawberry"],[11820,520,"bone"],[12380,370,"chocolate"],
    [12800,275,"strawberry"],[13400,520,"chocolate"],[14080,335,"bone"],[14400,245,"strawberry"],
    [14800,395,"chocolate"],[15200,245,"strawberry"],[15820,235,"chocolate"],
    [2660,520,"strawberry",51],[3900,520,"chocolate",52],[7000,360,"strawberry",53],
    [8360,520,"chocolate",54],[11560,520,"strawberry",55],[12500,365,"chocolate",56],[13700,520,"strawberry",57]
  ].map(([x,y,type,debugNo])=>({x,y,type,debugNo,taken:false,bob:Math.random()*6}));
  enemies=[
    {type:"drunk",x:2050,y:groundY-76,min:1930,max:2180,v:1.15,alive:true,throw:75},
    {type:"drunk",x:3250,y:groundY-76,min:3140,max:3350,v:1.2,alive:true,throw:110},
    {type:"drunk",x:4450,y:groundY-76,min:4340,max:4590,v:1.2,alive:true,throw:65},
    {type:"drunk",x:5660,y:groundY-76,min:5550,max:5740,v:1.1,alive:true,throw:90},
    {type:"drunk",x:7210,y:groundY-76,min:7080,max:7440,v:1.2,alive:true,throw:80},
    {type:"drunk",x:8580,y:groundY-76,min:8440,max:8820,v:1.25,alive:true,throw:105},
    {type:"drunk",x:9700,y:groundY-76,min:9620,max:9770,v:1.1,alive:true,throw:75},
    {type:"drunk",x:11280,y:groundY-76,min:11140,max:11460,v:1.15,alive:true,throw:80},
  ];
  const extraDrunkXs=[4200,5000,5450,6000,6800,7500,8400,9400,10850,11450,11750,12250,13350,14500,14700,15300];
  enemies.push(...extraDrunkXs.map((x,index)=>({type:"drunk",x,y:groundY-76,min:x-85,max:x+95,v:1.05+(index%4)*.08,alive:true,throw:68+(index*17)%65})));
  enemies.push(
    {type:"drunk",x:1775,y:groundY-76,min:1748,max:1832,v:1.08,alive:true,throw:72,debugNo:33},
    {type:"drunk",x:5605,y:groundY-76,min:5578,max:5654,v:1.12,alive:true,throw:91,debugNo:34},
    {type:"drunk",x:7985,y:groundY-76,min:7958,max:8040,v:1.1,alive:true,throw:68,debugNo:35},
    {type:"drunk",x:10985,y:groundY-76,min:10958,max:11035,v:1.15,alive:true,throw:86,debugNo:36},
    {type:"drunk",x:12445,y:groundY-76,min:12418,max:12496,v:1.07,alive:true,throw:76,debugNo:37},
    {type:"drunk",x:14925,y:groundY-76,min:14908,max:14952,v:1.1,alive:true,throw:82,debugNo:38}
  );
  enemies.forEach(enemy=>{if(enemy.type==="drunk"){enemy.y-=29;enemy.throw*=.5;enemy.y=enemySurfaceY(enemy)}});
  [...items,rainbowBerry].sort((a,b)=>a.x-b.x||(a===rainbowBerry?1:-1)).forEach((item,index)=>item.debugNo=index+1);
  enemies.filter(e=>e.type==="drunk").sort((a,b)=>a.x-b.x).forEach((enemy,index)=>enemy.debugNo=index+1);
  ledges.slice().sort((a,b)=>a.x-b.x).forEach((ledge,index)=>ledge.debugNo=index+1);
  ducks=[];
  updateHud();
}
function loadHighScore(){try{return Math.max(0,Number(localStorage.getItem(MAYU_HIGH_SCORE_KEY))||0)}catch(_){return 0}}
function saveHighScore(value){try{localStorage.setItem(MAYU_HIGH_SCORE_KEY,String(value))}catch(_){}}
function updateHud(){
  $("#lives").textContent="♥ ".repeat(lives).trim();$("#score").textContent=score.toLocaleString("ja-JP");$("#time").textContent=(timeLeft/10).toFixed(1);
  $("#distance").textContent=Math.max(0,Math.round(player.x-(camera+55+chase)));$("#mayuBest").textContent=highScore.toLocaleString("ja-JP");$("#powerBadge").classList.toggle("hidden",goldPower<=0);$("#powerBadge").textContent=goldPower===1?"⭐ 音符3方向":"🌈 音符6方向";
}
function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function ellipseHitsRect(cx,cy,rx,ry,r){const nx=Math.max(r.x,Math.min(cx,r.x+r.w)),ny=Math.max(r.y,Math.min(cy,r.y+r.h)),dx=(nx-cx)/rx,dy=(ny-cy)/ry;return dx*dx+dy*dy<=1}
function barkWaveHits(w,r){return overlap({x:w.x,y:w.y,w:w.w,h:w.h},r)}
function playerRightLimit(){const endStretch=Math.max(0,Math.min(650,camera-(worldW-W-650)));return camera+620+endStretch}
function playerCenterTarget(){const endStretch=Math.max(0,Math.min(650,camera-(worldW-W-650)));return camera+510+endStretch}
function audioReady(){if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==="suspended")audioCtx.resume();return audioCtx}
function blip(freq,duration=.12,type="sine",endFreq=freq,volume=.12,delay=0){const ac=audioReady(),t=ac.currentTime+delay,o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(30,endFreq),t+duration);g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(volume,t+.012);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g).connect(ac.destination);o.start(t);o.stop(t+duration+.02)}
function noise(duration=.14,volume=.08){const ac=audioReady(),n=Math.ceil(ac.sampleRate*duration),b=ac.createBuffer(1,n,ac.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);const s=ac.createBufferSource(),g=ac.createGain();s.buffer=b;g.gain.value=volume;s.connect(g).connect(ac.destination);s.start()}
function sfx(name){
  if(name==="jump")blip(280,.18,"square",620,.075);
  else if(name==="swing"){noise(.13,.055);blip(190,.16,"sawtooth",75,.055)}
  else if(name==="item"){blip(660,.1,"square",880,.07);blip(880,.12,"square",1180,.065,.08)}
  else if(name==="strawberry"){blip(520,.1,"triangle",780,.08);blip(780,.16,"triangle",1320,.08,.08)}
  else if(name==="stomp"){blip(150,.09,"square",75,.1);blip(420,.1,"triangle",620,.07,.06)}
  else if(name==="defeat"){noise(.1,.08);blip(240,.16,"square",90,.09)}
  else if(name==="duck"){blip(360,.1,"square",520,.07);blip(520,.16,"triangle",900,.08,.07)}
  else if(name==="bark"){noise(.11,.09);blip(235,.18,"sawtooth",125,.12);blip(310,.13,"square",180,.09,.035);blip(205,.17,"sawtooth",105,.095,.17)}
  else if(name==="note"){blip(740,.16,"sine",980,.085);blip(1100,.12,"triangle",880,.055,.045)}
  else if(name==="clarinet"){blip(587,.2,"triangle",622,.07);blip(880,.16,"sine",784,.035,.025)}
  else if(name==="land")blip(105,.07,"sine",65,.045);
  else if(name==="hurt"){noise(.18,.1);blip(180,.28,"sawtooth",65,.09)}
  else if(name==="splash"){noise(.34,.13);blip(120,.22,"sine",55,.07)}
  else if(name==="clear"){[523,659,784,1047].forEach((f,i)=>blip(f,.24,"triangle",f*1.03,.085,i*.1))}
}
function playBgm(){const bgm=$("#bgm");bgm.volume=.28;bgm.currentTime=0;bgm.play().catch(()=>{})}
function showMessage(text,duration=850){actionMessage=text;actionMessageUntil=performance.now()+duration;const el=$("#message");el.classList.add("hidden");clearTimeout(messageTimer);messageTimer=setTimeout(()=>{actionMessage="";actionMessageUntil=0},duration)}
async function fullscreen(){try{if(!document.fullscreenElement&&document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen({navigationUI:"hide"})}catch(_){}try{if(screen.orientation&&screen.orientation.lock)await screen.orientation.lock("landscape")}catch(_){}}
function showStory(){fullscreen();$("#titleScreen").classList.add("hidden");const story=$("#storyScreen");story.classList.remove("hidden","story-playing");void story.offsetWidth;story.classList.add("story-playing")}
function startMapDebug(){fullscreen();mapDebugMode=true;mapDebugPan=0;mapDebugDragX=null;running=false;paused=false;camera=0;$("#titleScreen").classList.add("hidden");$("#storyScreen").classList.add("hidden");$("#resultScreen").classList.add("hidden");$("#hud").classList.add("hidden");$("#mobileControls").classList.add("hidden");$("#mapDebugControls").classList.remove("hidden");updateMapDebugPosition()}
function stopMapDebug(){mapDebugMode=false;mapDebugPan=0;mapDebugDragX=null;$("#mapDebugControls").classList.add("hidden");$("#titleScreen").classList.remove("hidden")}
function updateMapDebugPosition(){const el=$("#mapDebugPosition");if(el)el.textContent=`${Math.round(camera/(worldW-W)*100)}%　X:${Math.round(camera)}`}
function moveMapDebug(delta){camera=Math.max(0,Math.min(worldW-W,camera+delta));updateMapDebugPosition()}
function start(){fullscreen();reset();running=true;playBgm();$("#titleScreen").classList.add("hidden");$("#storyScreen").classList.add("hidden");$("#resultScreen").classList.add("hidden");$("#hud").classList.remove("hidden");$("#mobileControls").classList.remove("hidden");showMessage("たるとが追いかけてきた！ 逃げて、まゆ！",1300)}
function togglePause(){if(!running||won)return;const bgm=$("#bgm"),btn=$("#pauseBtn");paused=!paused;if(paused){pauseStarted=performance.now();jumpHeld=false;jumpHold=0;bgm.pause();$("#pauseOverlay").classList.remove("hidden");btn.innerHTML="<span>▶</span> 再開";btn.setAttribute("aria-label","ゲームを再開")}else{endTime+=performance.now()-pauseStarted;pauseStarted=0;bgm.play().catch(()=>{});$("#pauseOverlay").classList.add("hidden");btn.innerHTML="<span>Ⅱ</span> ポーズ";btn.setAttribute("aria-label","一時停止");last=performance.now()}}
function jump(){if(paused)return;jumpHeld=true;if(running&&player.onGround){player.vy=-13.4;player.onGround=false;jumpHold=23;sfx("jump")}}
function releaseJump(){jumpHeld=false;jumpHold=0}
function attack(){if(!running||paused)return;const angles=goldPower===0?[0]:goldPower===1?[-.34,0,.34]:[-.34,0,.34,Math.PI-.34,Math.PI,Math.PI+.34];player.attack=20;player.cool=4;for(const angle of angles){const speed=11.5;musicNotes.push({x:player.x+(Math.cos(angle)>=0?62:-10),y:player.y+43,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:115,symbol:Math.random()>.5?"♪":"♫"})}const maxNotes=96;if(musicNotes.length>maxNotes)musicNotes.splice(0,musicNotes.length-maxNotes);sfx("clarinet")}
function emitSplash(x){for(let i=0;i<20;i++)splashes.push({x:x+(Math.random()-.5)*50,y:groundY+17,vx:(Math.random()-.5)*9,vy:-3-Math.random()*8,r:3+Math.random()*5,life:32})}
function startGameOverCountdown(delay=0){if(gameOverSequence)return;gameOverSequence=true;running=false;jumpHeld=false;jumpHold=0;$("#bgm").pause();$("#mobileControls").classList.add("hidden");const begin=()=>{const overlay=$("#gameOverOverlay"),count=$("#restartCount");overlay.classList.remove("hidden");const showCount=n=>{count.textContent=n;count.style.animation="none";void count.offsetWidth;count.style.animation=""};showCount(3);gameOverTimers.push(setTimeout(()=>showCount(2),1000),setTimeout(()=>showCount(1),2000),setTimeout(()=>{reset();running=true;playBgm();$("#mobileControls").classList.remove("hidden");showMessage("もう一度、逃げ切ろう！",1100)},3000))};if(delay>0)gameOverTimers.push(setTimeout(begin,delay));else begin()}
function bite(){
  if(gameOverSequence)return;lives=0;bites++;actionMistakes++;score-=50;player.inv=999;sfx("hurt");updateHud();const fx=$("#biteEffect");fx.classList.remove("hidden");fx.style.animation="none";void fx.offsetWidth;fx.style.animation="";startGameOverCountdown(800)
}
function fall(edge){emitSplash(player.x+player.w/2);sfx("splash");lives--;actionMistakes++;score-=50;chase=Math.max(0,chase-70);updateHud();if(lives<=0){startGameOverCountdown()}else{const safeX=Math.max(80,edge.x-280);camera=Math.max(0,safeX-420);player.x=safeX;player.y=groundY-player.h;player.vx=4.85;player.vy=0;player.inv=90;showMessage("コースから落ちちゃった！ 手前から再開 −50",1000)}}
const mayuEndingMessages={
  perfect:["おおおお。。","ついに無傷で完璧に逃げ切ったね","こんなことに時間使わず、大学の勉強がんばろう","まゆとたるとの戦いはまだまだ続く。。"],
  great:["ほぼ完璧！すばらしい。でもあと一歩です。","でも逃げないでたるとを可愛がってください。","まゆとたるとの戦いはまだまだ続く。。"],
  good:["なかなかやりますね。","まだまだ上をめざしましょう。","まゆとたるとの戦いはまだまだ続く。。"],
  try:["いちおうクリアできましたね","でもミスだらけです。傷だらけです。","まゆとたるとの戦いはまだまだ続く。。"]
};
function setMayuEndingMessages(rank){const roll=$("#mayuCreditsRoll");roll.innerHTML="";mayuEndingMessages[rank].forEach(message=>{const line=document.createElement("p");line.textContent=message;roll.appendChild(line)});roll.style.animation="none";void roll.offsetWidth;roll.style.animation=""}
function finish(){
  won=true;running=false;sfx("clear");$("#bgm").pause();const bonus=timeLeft,total=score+bonus,isNewBest=total>highScore;if(isNewBest){highScore=total;saveHighScore(highScore)}$("#actionScore").textContent=score.toLocaleString("ja-JP");$("#timeBonus").textContent=bonus.toLocaleString("ja-JP");$("#totalScore").textContent=total.toLocaleString("ja-JP");$("#resultBest").textContent=highScore.toLocaleString("ja-JP");$("#newBestLabel").classList.toggle("hidden",!isNewBest);
  const strawberryTotal=items.filter(i=>i.type==="strawberry").length,strawberryGot=items.filter(i=>i.type==="strawberry"&&i.taken).length;
  const chocolateTotal=items.filter(i=>i.type==="chocolate").length,chocolateGot=items.filter(i=>i.type==="chocolate"&&i.taken).length;
  const boneTotal=items.filter(i=>i.type==="bone").length,boneGot=items.filter(i=>i.type==="bone"&&i.taken).length;
  const goldTotal=items.filter(i=>i.type==="goldStrawberry").length,goldGot=items.filter(i=>i.type==="goldStrawberry"&&i.taken).length;
  const rainbowGot=rainbowBerry.taken?1:0,itemMisses=strawberryTotal-strawberryGot+chocolateTotal-chocolateGot+boneTotal-boneGot+goldTotal-goldGot+(1-rainbowGot),enemyMisses=enemies.filter(e=>e.alive).length,duckMisses=0;
  const totalMisses=itemMisses+enemyMisses+duckMisses+actionMistakes;
  const grade=totalMisses===0?"PERFECT":totalMisses<=4?"GREAT":totalMisses<=11?"GOOD":"がんばって";
  const reason=totalMisses===0?"ノーミス達成！":totalMisses<=4?"トータルミス4回以内！":totalMisses<=11?"トータルミス11回以内！":"次はミス11回以内を目指そう！";
  setMayuEndingMessages(grade==="PERFECT"?"perfect":grade==="GREAT"?"great":grade==="GOOD"?"good":"try");
  $("#resultGrade").textContent=grade;$("#resultGrade").dataset.grade=grade;$("#resultScreen").dataset.grade=grade;$("#missTotal").textContent=totalMisses;
  $("#strawberryResult").textContent=`${strawberryGot}/${strawberryTotal}個 ×100`;$("#strawberryScore").textContent=(strawberryGot*100).toLocaleString("ja-JP");
  $("#chocolateResult").textContent=`${chocolateGot}/${chocolateTotal}房 ×50`;$("#chocolateScore").textContent=(chocolateGot*50).toLocaleString("ja-JP");
  $("#boneResult").textContent=`${boneGot}/${boneTotal}個 ×50`;$("#boneScore").textContent=(boneGot*50).toLocaleString("ja-JP");
  $("#goldResult").textContent=`${goldGot}/${goldTotal}個 ×300`;$("#goldScore").textContent=(goldGot*300).toLocaleString("ja-JP");
  $("#rainbowResult").textContent=`${rainbowGot}/1個 ×1500`;$("#rainbowScore").textContent=(rainbowGot*1500).toLocaleString("ja-JP");
  $("#enemyResult").textContent=`${defeated}/${enemies.length}人 ×100`;$("#enemyScore").textContent=(defeated*100).toLocaleString("ja-JP");
  $("#duckResult").textContent=`${duckJumps}羽`;$("#duckScore").textContent=duckScoreTotal.toLocaleString("ja-JP");
  $("#damageResult").textContent=`${actionMistakes}回 ×-50`;$("#damageScore").textContent=(actionMistakes*-50).toLocaleString("ja-JP");
  $("#hud").classList.add("hidden");$("#mobileControls").classList.add("hidden");$("#resultScreen").classList.remove("hidden");const gradePanel=$(".grade-panel");gradePanel.style.animation="none";void gradePanel.offsetWidth;gradePanel.style.animation="gradeEntrance .7s cubic-bezier(.2,1.5,.4,1)";const perfectFx=$("#perfectCelebration"),bestFx=$("#highScoreCelebration");perfectFx.classList.toggle("hidden",totalMisses!==0);bestFx.classList.toggle("hidden",!isNewBest);if(totalMisses===0){perfectFx.style.animation="none";void perfectFx.offsetWidth;perfectFx.style.animation=""}if(isNewBest){bestFx.style.animation="none";void bestFx.offsetWidth;bestFx.style.animation=""}
}
function hurt(text){if(player.inv>0||gameOverSequence)return false;lives--;actionMistakes++;score-=50;chase=Math.min(MAX_CHASE,chase+55);player.inv=95;player.vy=-9;player.x=playerCenterTarget();sfx("hurt");updateHud();showMessage(text+" −50");if(lives<=0)startGameOverCountdown();return true}
function update(step){
  if(goldPower>player.lastGoldPower){player.lastGoldPower=goldPower;mayuPowerFx=110}
  const next=Math.max(0,Math.ceil((endTime-performance.now())/100));if(next!==timeLeft){timeLeft=next;updateHud()}if(timeLeft<=0&&!gameOverSequence){lives=0;updateHud();showMessage("タイムアップ！",900);startGameOverCountdown();return}
  const barkEnabled=camera>worldW*.5,barkCycle=Math.floor(performance.now()/6500);
  if(!barkEnabled)lastBarkCycle=barkCycle;
  else if(barkCycle!==lastBarkCycle){const tarutoLift=Math.max(-330,Math.min(0,(player.y-(groundY-player.h))*.55)),tarutoMouthY=groundY-83+tarutoLift+35;lastBarkCycle=barkCycle;sfx("bark");barkWaves.push({x:camera+120+chase,y:tarutoMouthY-34,w:72,h:68,life:210,hit:false})}
  const inSand=player.onGround&&player.onSand,runSpeed=inSand?3.05:4.85;
  camera=Math.min(worldW-W,camera+runSpeed*step);
  const courseProgress=player.x/worldW,chaseMultiplier=courseProgress>=2/3?3:courseProgress>=1/3?1.5:1;if(!boneRetreating)chase=Math.min(MAX_CHASE,chase+(inSand?.9:.24)*chaseMultiplier*1.5*step);if(chaseRetreat>0){const back=Math.min(chaseRetreat,chase,(boneRetreating?7.5:2.2)*step);chase-=back;chaseRetreat-=back;if(boneRetreating&&(chase<=0||chaseRetreat<=0)){chase=0;chaseRetreat=0;boneRetreating=false}}else if(boneRetreating){chase=0;boneRetreating=false}
  // Mayu stays near the screen center; Taruto closes the distance instead.
  const centerX=playerCenterTarget();player.vx+=(runSpeed-player.vx)*.16*step;
  if(jumpHeld&&jumpHold>0&&player.vy<0){player.vy-=.47*step;jumpHold-=step}else jumpHold=0;
  player.vy=Math.min(18,player.vy+.72*step);
  const oldX=player.x,oldY=player.y;player.x+=player.vx*step;player.y+=player.vy*step;
  // Keep Mayu visible and close to the center instead of letting her run off-screen.
  player.x+=Math.max(-3.5,Math.min(3.5,(centerX-player.x)*.055))*step;player.x=Math.max(camera+95,Math.min(playerRightLimit(),player.x));
  const solids=grounds.map(g=>({x:g.x,y:groundY,w:g.w,h:130,ground:true,sand:false})).concat(sandZones.map(g=>({x:g.x,y:groundY,w:g.w,h:130,ground:true,sand:true})),ledges,stairs);
  for(const p of stairs){const vertical=player.y+player.h>p.y+5&&player.y<p.y+p.h;if(vertical&&oldX+player.w<=p.x+5&&player.x+player.w>p.x){player.x=p.x-player.w;player.vx=0}}
  player.onGround=false;player.onSand=false;for(const p of solids)if(player.x+player.w>p.x&&player.x<p.x+p.w&&oldY+player.h<=p.y+4&&player.y+player.h>=p.y&&player.vy>=0){if(player.vy>5)sfx("land");player.y=p.y-player.h;player.vy=0;player.onGround=true;player.onSand=p.sand===true}
  for(const s of slopes){const center=player.x+player.w*.5;if(center>=s.x&&center<=s.x+s.w){const surface=groundY-s.rise*((center-s.x)/s.w),feet=player.y+player.h;if(player.vy>=0&&feet>=surface-12&&feet<=surface+48){player.y=surface-player.h;player.vy=0;player.onGround=true;player.onSand=false;player.vx=Math.min(player.vx,2.8)}}}
  if(player.x>4050&&(duckSpawnTimer-=step)<=0&&ducks.length<20){const fromBehind=player.x>10800&&Math.random()<.42;ducks.push({x:fromBehind?camera-85:camera+W+85,y:185+Math.random()*330,vx:fromBehind?7.2:-5.8,phase:Math.random()*6,life:260});duckSpawnTimer=28+Math.random()*28}
  const sandNow=player.onGround&&player.onSand;if(sandNow&&Math.random()<.32*step)sandPuffs.push({x:player.x+10+Math.random()*32,y:groundY-3,vx:-1.5-Math.random()*2.2,vy:-.6-Math.random()*1.8,r:4+Math.random()*7,life:28});
  items.forEach(i=>{i.bob+=.05*step;const itemHitSize=i.type==="goldStrawberry"?69:46;if(!i.taken&&overlap(player,{x:i.x-itemHitSize/2,y:i.y-itemHitSize/2,w:itemHitSize,h:itemHitSize})){i.taken=true;if(i.type==="strawberry"){score+=100;lives=Math.min(5,lives+1);sfx("strawberry");showMessage("いちご！ ライフ回復 ＋100",1000)}else if(i.type==="goldStrawberry"){score+=300;goldPower=Math.min(2,goldPower+1);sfx("strawberry");showMessage(goldPower===1?"金のいちご！ 音符が前方3方向に！ ＋300":"金のいちご！ 音符が前後6方向に！ ＋300",1400)}else if(i.type==="bone"){score+=50;player.throwAnim=28;thrownBones.push({x:player.x+5,y:player.y+35,vx:-8.5,vy:-5.5,spin:0,life:100,claimed:false});sfx("item");showMessage("ホネッコを後ろへポイッ！ ＋50",1100)}else{score+=50;sfx("item");showMessage("ぶどう！ ＋50")}updateHud()}});
  rainbowBerry.phase+=.055*step;rainbowBerry.y=290+Math.sin(rainbowBerry.phase)*205;if(!rainbowBerry.taken&&overlap(player,{x:rainbowBerry.x-32,y:rainbowBerry.y-32,w:64,h:64})){rainbowBerry.taken=true;score+=1500;sfx("strawberry");showMessage("虹色のいちごをゲット！ ＋1500",1500)}
  musicNotes.forEach(n=>{n.x+=n.vx*step;n.y+=n.vy*step;n.life-=step;n.phase=(n.phase||0)+.18*step});
  const tarutoLiftNow=Math.max(-330,Math.min(0,(player.y-(groundY-player.h))*.55)),tarutoHit={x:camera+45+chase,y:groundY-92+tarutoLiftNow,w:90,h:100};let tarutoStomped=false;
  const crossedTaruto=player.vy>0&&oldY+player.h<=tarutoHit.y+15&&player.y+player.h>=tarutoHit.y,overTaruto=player.x+player.w>tarutoHit.x+8&&player.x<tarutoHit.x+tarutoHit.w-8;if(crossedTaruto&&overTaruto){tarutoStomped=true;player.y=tarutoHit.y-player.h;player.vy=-10.5;tarutoStun=55;chaseRetreat+=96;sfx("stomp");showMessage("たるとを踏んだ！ 大きくひるんで後退！",850)}
  for(const n of musicNotes)if(!n.dead&&n.vx<0&&overlap({x:n.x-27,y:n.y-27,w:54,h:54},tarutoHit)){n.dead=true;if(tarutoHappy<=0){tarutoHappy=70;chaseRetreat+=14;sfx("item");showMessage("音符がたるとに届いた！ うれしくて少し後退♪",900)}}
  ducks.forEach(d=>{d.x+=d.vx*step;d.phase+=.13*step;d.life-=step;const dy=d.y+Math.sin(d.phase)*13,target={x:d.x-36,y:dy-25,w:72,h:50},crossedTop=player.vy>0&&oldY+player.h<=target.y+9&&player.y+player.h>=target.y,overDuck=player.x+player.w>target.x+7&&player.x<target.x+target.w-7;if(crossedTop&&overDuck){d.life=0;player.y=target.y-player.h;player.vy=-10.5;duckJumps++;duckScoreTotal+=100;score+=100;sfx("stomp");showMessage("カモさんを踏んで退散！ ＋100",650);return}const note=musicNotes.find(n=>!n.dead&&overlap({x:n.x-27,y:n.y-27,w:54,h:54},target));if(note){note.dead=true;d.life=0;duckJumps++;duckScoreTotal+=150;score+=150;for(let i=0;i<7;i++)duckHearts.push({x:d.x+(Math.random()-.5)*35,y:dy+(Math.random()-.5)*18,vx:(Math.random()-.5)*3,vy:-1.4-Math.random()*2.8,life:35+Math.random()*16,size:4+Math.random()*5});sfx("duck");showMessage("カモさんに音符が届いた！ 喜んで退散♪ ＋150",700);return}if(overlap(player,target)){d.life=0;hurt("飛んできたカモさんにぶつかった！")}});ducks=ducks.filter(d=>d.life>0&&d.x>camera-150&&d.x<camera+W+150);
  enemies.forEach(e=>{
    if(!e.alive)return;
    if(e.type==="gal"&&Math.abs(e.x-player.x)<430&&e.x>player.x&&e.charge<=0){e.charge=48;showMessage("自撮りギャルが突進してきた！",650)}
    if(e.charge>0){e.x-=5.3*step;e.charge-=step}else{e.x+=e.v*step;if(e.x<e.min||e.x>e.max)e.v*=-1}
    e.y=enemySurfaceY(e,75);
    if(e.type==="drunk"&&(e.throw-=step)<=0&&e.x>player.x&&e.x-player.x<650){projectiles.push({x:e.x,y:e.y+49,vx:-6.4,vy:-3,spin:0,type:"mug"});e.throw=52.5+Math.random()*27.5}
    const target={x:e.x,y:e.y,w:58,h:e.type==="gal"?92:105},note=musicNotes.find(n=>!n.dead&&overlap({x:n.x-27,y:n.y-27,w:54,h:54},target));
    if(note){note.dead=true;if(e.type==="drunk"){e.noteHits=(e.noteHits||0)+1;if(e.noteHits<3){sfx("item");showMessage(`酔っぱらいに音符命中！ あと${3-e.noteHits}発`,650);return}}e.alive=false;defeated++;score+=e.type==="gal"?200:100;sfx("defeat");showMessage(e.type==="gal"?"音符でギャルを撃退！ ＋200":"音符を3回当てて酔っぱらいを撃退！ ＋100");return}
    const crossedTop=player.vy>0&&oldY+player.h<=e.y+15&&player.y+player.h>=e.y;
    const overEnemy=player.x+player.w>e.x+5&&player.x<e.x+target.w-5;
    if(crossedTop&&overEnemy){e.alive=false;defeated++;score+=e.type==="gal"?200:100;player.y=e.y-player.h;player.vy=-11.5;sfx("stomp");showMessage(e.type==="gal"?"ギャルを踏んで撃退！ ＋200":"酔っ払いを踏んで撃退！ ＋100");return}
    if(overlap(player,target))hurt(e.type==="gal"?"ギャルの突進にぶつかった！":"酔っぱらいにぶつかった！")
  });
  musicNotes=musicNotes.filter(n=>!n.dead&&n.life>0&&n.x<camera+W+80&&n.x>camera-80&&n.y>-60&&n.y<H+60);
  projectiles.forEach(p=>{p.x+=p.vx*step;p.y+=p.vy*step;p.vy+=.24*step;p.spin+=.18*step;if(overlap(player,{x:p.x-14,y:p.y-14,w:28,h:28})){p.dead=true;hurt("ビールジョッキに当たった！")}});projectiles=projectiles.filter(p=>!p.dead&&p.x>camera-80&&p.y<H+50);
  barkWaves.forEach(w=>{w.x+=7.25*step;w.w=Math.min(165,w.w+1.15*step);w.life-=step;if(!w.hit&&barkWaveHits(w,player)&&hurt("たるとの大声が直撃した！"))w.hit=true});barkWaves=barkWaves.filter(w=>w.life>0&&w.x<camera+W+180);
  thrownBones.forEach(b=>{b.x+=b.vx*step;b.y+=b.vy*step;b.vy+=.34*step;b.spin-=.2*step;b.life-=step;const tarutoX=camera+55+chase;if(!b.claimed&&b.x<=tarutoX+75){b.claimed=true;b.life=Math.min(b.life,14);chaseRetreat=Math.max(chaseRetreat,chase);boneRetreating=true;sfx("item");showMessage("たるとがホネッコを追って画面の左端まで後退！",1200)}});thrownBones=thrownBones.filter(b=>b.life>0);
  sandPuffs.forEach(p=>{p.x+=p.vx*step;p.y+=p.vy*step;p.vy-=.015*step;p.r+=.12*step;p.life-=step});sandPuffs=sandPuffs.filter(p=>p.life>0);
  duckHearts.forEach(h=>{h.x+=h.vx*step;h.y+=h.vy*step;h.vy-=.015*step;h.life-=step});duckHearts=duckHearts.filter(h=>h.life>0);
  splashes.forEach(s=>{s.x+=s.vx*step;s.y+=s.vy*step;s.vy+=.4*step;s.life-=step;s.r*=.985});splashes=splashes.filter(s=>s.life>0);
  if(player.inv>0)player.inv-=step;if(player.attack>0)player.attack-=step;if(player.cool>0)player.cool-=step;if(player.throwAnim>0)player.throwAnim-=step;if(mayuPowerFx>0)mayuPowerFx-=step;if(tarutoHappy>0)tarutoHappy-=step;if(tarutoStun>0)tarutoStun-=step;
  // Collisions can move Mayu after the earlier clamp. Enforce visibility last too.
  if(!Number.isFinite(player.x)||!Number.isFinite(player.y)){player.x=playerCenterTarget();player.y=groundY-player.h;player.vx=4.85;player.vy=0}
  player.x=Math.max(camera+95,Math.min(playerRightLimit(),player.x));
  player.y=Math.max(18,player.y);
  const tarutoSpriteCenterX=camera+55+chase+34,mayuSpriteCenterX=player.x+29,tarutoPassedMayu=tarutoSpriteCenterX>=mayuSpriteCenterX;if(!tarutoStomped&&tarutoPassedMayu&&player.y+player.h>tarutoHit.y+12&&player.y<tarutoHit.y+tarutoHit.h)bite();if(player.y>H+80)fall({x:Math.max(0,player.x-100)});if(player.x>goalX&&player.onGround&&player.y+player.h>=groundY-20)finish();updateHud();
}

function rounded(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function drawBackground(){
  const p=camera/(worldW-W),sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,p<.55?"#b7c7e7":"#aab2d2");sky.addColorStop(.5,"#f0c9d8");sky.addColorStop(1,"#ffe4bd");ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  ctx.fillStyle="#fff3ce";ctx.beginPath();ctx.arc(1030-camera*.025,145,55,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.14;ctx.fillStyle="#fff";for(let i=0;i<38;i++){ctx.beginPath();ctx.arc((i*181-camera*.045)%1390,38+(i*71)%260,1.5+(i%3),0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;
  ctx.globalAlpha=.32;ctx.fillStyle="#fff8fb";for(let i=0;i<5;i++){const cx=(i*330-camera*.08)%1650-100,cy=105+(i%3)*72;ctx.beginPath();ctx.ellipse(cx,cy,78,18,0,0,Math.PI*2);ctx.ellipse(cx+55,cy-10,48,21,0,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;
  ctx.fillStyle="#aebdca";ctx.beginPath();ctx.moveTo(0,475);for(let x=0;x<=W;x+=80)ctx.lineTo(x,420+Math.sin((x+camera*.12)/170)*34);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
}
function drawHouse(x,v){const widths=[205,235,190],heights=[145,175,132],walls=["#aebfca","#c4afbd","#b5c5b9"],roofs=["#8499aa","#9d879b","#8da091"],w=widths[v],h=heights[v],top=groundY-h;ctx.fillStyle=walls[v];ctx.fillRect(x,top,w,h);ctx.fillStyle=roofs[v];ctx.beginPath();if(v===1){ctx.moveTo(x-8,top);ctx.lineTo(x+w*.28,top-62);ctx.lineTo(x+w*.58,top-18);ctx.lineTo(x+w+8,top-18);ctx.lineTo(x+w+8,top)}else{ctx.moveTo(x-14,top);ctx.lineTo(x+w*.5,top-(v===2?48:74));ctx.lineTo(x+w+14,top)}ctx.fill();ctx.fillStyle="#fff0bd";const cols=v===1?3:2;for(let row=0;row<2;row++)for(let col=0;col<cols;col++){const ww=v===2?32:27,wx=x+24+col*((w-48)/(cols-1||1))-ww/2,wy=top+35+row*57;ctx.fillRect(wx,wy,ww,30)}if(v===2){ctx.fillStyle="#8496a3";ctx.fillRect(x+w*.5-17,groundY-57,34,57)}}
function drawTower(x,v){const widths=[205,235,180],heights=[285,355,315],walls=["#91a4b7","#929bb4","#a3a9b7"],w=widths[v],h=heights[v],top=groundY-h;ctx.fillStyle=walls[v];ctx.fillRect(x,top,w,h);if(v===1){ctx.fillStyle="#7b8aa3";ctx.fillRect(x+w*.2,top-28,w*.6,28);ctx.fillRect(x+w*.48,top-62,7,34)}else if(v===2){ctx.fillStyle="#8291a2";ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x+w*.5,top-45);ctx.lineTo(x+w,top);ctx.fill()}for(let wy=top+22;wy<groundY-24;wy+=v===1?34:40)for(let wx=16;wx<w-12;wx+=v===2?38:44){ctx.fillStyle=((wx+wy+v*3)%5)?["#fff0bd","#d8f0f2","#ffdfb8"][v]:"#7b899c";ctx.fillRect(x+wx,wy,v===2?18:21,16)}if(v===0){ctx.fillStyle="#8192a3";for(let y=top+50;y<groundY-40;y+=78)ctx.fillRect(x-10,y,w+20,7)}}
function drawCity(){
  ctx.save();ctx.globalAlpha=.62;for(let x=100,index=0;x<worldW;x+=990,index++){const progress=x/worldW;if(progress<.42||(progress<.62&&index%3===0))drawHouse(x,index%3);if(progress>.14){const towerX=x+240,towerVariant=(index+1)%3;drawTower(towerX,towerVariant)}}ctx.restore();
  ctx.strokeStyle="#29445f";ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(0,315);ctx.lineTo(worldW,315);ctx.stroke();const trainX=(performance.now()/18+camera*.35)%(worldW+900)-450;ctx.fillStyle="#f3f1e9";rounded(trainX,267,420,66,12);ctx.fill();ctx.fillStyle="#ed6c76";ctx.fillRect(trainX,313,420,12);ctx.fillStyle="#547695";for(let x=25;x<390;x+=55)ctx.fillRect(trainX+x,280,34,22);
}
function drawSandZone(s){const sand=ctx.createLinearGradient(0,groundY,0,H);sand.addColorStop(0,"#f4d58d");sand.addColorStop(1,"#c99b58");ctx.fillStyle=sand;ctx.fillRect(s.x,groundY,s.w,130);ctx.fillStyle="#ffe7a8";ctx.fillRect(s.x,groundY,s.w,8);ctx.fillStyle="#b98750";ctx.globalAlpha=.55;for(let x=s.x+15;x<s.x+s.w;x+=31){ctx.beginPath();ctx.arc(x,groundY+17+(x%4)*7,2+(x%3),0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1}
function drawWorld(){
  ctx.save();ctx.translate(-camera,0);drawCity();
  grounds.forEach(g=>{ctx.fillStyle="#26384c";ctx.fillRect(g.x,groundY,g.w,130);ctx.fillStyle="#73a66b";ctx.fillRect(g.x,groundY,g.w,17);ctx.fillStyle="#a9d07c";ctx.fillRect(g.x,groundY,g.w,5)});sandZones.forEach(drawSandZone);slopes.forEach(s=>{ctx.fillStyle="#4b654e";ctx.beginPath();ctx.moveTo(s.x,groundY);ctx.lineTo(s.x+s.w,groundY-s.rise);ctx.lineTo(s.x+s.w,groundY);ctx.closePath();ctx.fill();ctx.strokeStyle="#a9d07c";ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(s.x,groundY);ctx.lineTo(s.x+s.w,groundY-s.rise);ctx.stroke();ctx.strokeStyle="#68885e";ctx.lineWidth=3;for(let i=80;i<s.w;i+=90){const px=s.x+i,py=groundY-s.rise*(i/s.w);ctx.beginPath();ctx.moveTo(px-20,py+19);ctx.lineTo(px+14,py+4);ctx.stroke()}});ledges.forEach(p=>{ctx.fillStyle="#e0a64f";ctx.strokeStyle="#704c39";ctx.lineWidth=4;rounded(p.x,p.y,p.w,p.h,8);ctx.fill();ctx.stroke();ctx.fillStyle="#ffd477";ctx.fillRect(p.x+7,p.y+4,p.w-14,5)});stairs.forEach(p=>{ctx.fillStyle="#b9604f";ctx.strokeStyle="#60384a";ctx.lineWidth=4;rounded(p.x,p.y,p.w,p.h,6);ctx.fill();ctx.stroke();ctx.fillStyle="#ef9b69";ctx.fillRect(p.x+3,p.y+3,p.w-6,10);ctx.strokeStyle="#8b443f";ctx.lineWidth=2;for(let yy=p.y+30;yy<p.y+p.h;yy+=28){ctx.beginPath();ctx.moveTo(p.x+3,yy);ctx.lineTo(p.x+p.w-3,yy);ctx.stroke()}});
  items.forEach(i=>{if(i.taken)return;ctx.save();ctx.translate(i.x,i.y+Math.sin(i.bob)*5);i.type==="strawberry"?drawStrawberry():i.type==="goldStrawberry"?drawGoldenStrawberry():i.type==="bone"?drawBone():drawGrape();ctx.restore()});if(!rainbowBerry.taken){ctx.save();ctx.translate(rainbowBerry.x,rainbowBerry.y);drawRainbowStrawberry();ctx.restore()}ducks.forEach(drawDuck);enemies.forEach(e=>{if(e.alive)(e.type==="gal"?drawGal:drawDrunk)(e.x,e.y,e.charge>0)});projectiles.forEach(drawMug);musicNotes.forEach(drawMusicNote);barkWaves.forEach(drawBarkWave);thrownBones.forEach(b=>{ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.spin);drawBone();ctx.restore()});sandPuffs.forEach(p=>{ctx.globalAlpha=p.life/28*.6;ctx.fillStyle="#f6d99a";ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill()});splashes.forEach(s=>{ctx.globalAlpha=s.life/32;ctx.fillStyle="#e5fbff";ctx.beginPath();ctx.ellipse(s.x,s.y,s.r*.7,s.r*1.4,0,0,7);ctx.fill()});ctx.globalAlpha=1;
  duckHearts.forEach(drawHeartParticle);
  drawGoal();
  if(mapDebugMode){drawDebugMarkers();drawTerrainDebugMarkers()}
  const mayuHeight=player.y-(groundY-player.h),tarutoLift=Math.max(-330,Math.min(0,mayuHeight*.55));
  if(!mapDebugMode){drawTaruto(camera+55+chase,groundY-83+tarutoLift);drawMayu()}ctx.restore();
}
function drawMayu(){
  ctx.save();if(player.inv)ctx.globalAlpha=Math.floor(player.inv/6)%2?.42:.82;ctx.translate(player.x+29,player.y+51);
  const attacking=player.attack>0;
  const runBob=Math.sin(performance.now()/65)*1.8;
  if(mayuPowerFx>0){const t=performance.now()/90,pulse=1+Math.sin(t)*.12;ctx.save();ctx.scale(pulse,pulse);const glow=ctx.createRadialGradient(0,-5,15,0,-5,75);glow.addColorStop(0,"#fffbd8cc");glow.addColorStop(.45,"#ffd84c88");glow.addColorStop(1,"#9b55ff00");ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,-5,75,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#fff4a8";ctx.lineWidth=4;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(0,-5,48+i*11,t+i*2,t+1.15+i*2);ctx.stroke()}ctx.fillStyle="#ffdf55";ctx.strokeStyle="#9b4e6e";ctx.lineWidth=3;ctx.font="900 18px 'M PLUS Rounded 1c'";ctx.textAlign="center";ctx.strokeText("POWER UP!",0,-79);ctx.fillText("POWER UP!",0,-79);ctx.font="900 20px serif";for(let i=0;i<6;i++){const a=t*.45+i*Math.PI/3,r=58;ctx.fillText("★",Math.cos(a)*r,Math.sin(a)*38-5)}ctx.restore()}

  // The gameplay sprite uses the same soft illustrated look as Mayu's title art.
  if(mayuSprite.complete&&mayuSprite.naturalWidth){
    ctx.drawImage(mayuSprite,-42,-67+runBob,91,136);
  }else{
    ctx.fillStyle="#25202b";ctx.beginPath();ctx.arc(0,-26,25,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#eee1cf";rounded(-20,-5,42,65,12);ctx.fill();
  }

  if(player.throwAnim>0){const t=1-player.throwAnim/28;ctx.save();ctx.globalAlpha=Math.min(1,player.throwAnim/7);ctx.strokeStyle="#fff4dc";ctx.lineWidth=4;ctx.lineCap="round";ctx.beginPath();ctx.arc(-20,-2,30,-1.7,-3.8,true);ctx.stroke();ctx.fillStyle="#ffdf55";ctx.font="900 13px 'M PLUS Rounded 1c'";ctx.textAlign="center";ctx.fillText("ポイッ！",-42,-29-t*7);ctx.restore()}

  if(attacking){ctx.save();ctx.translate(69,-4);ctx.fillStyle="#ffdf55";ctx.font="900 19px serif";ctx.textAlign="center";ctx.fillText("♪",0,0);ctx.globalAlpha=.65;ctx.strokeStyle="#8ee7f2";ctx.lineWidth=3;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(0,4,12+i*8,-.8,.8);ctx.stroke()}ctx.restore()}
  // Mayu plays the clarinet forward; notes become the projectile attack.
  ctx.save();ctx.translate(32,4);ctx.rotate(.15);ctx.scale(.48,.48);drawClarinet();ctx.restore();

  ctx.fillStyle="#fff4dc";ctx.font="900 12px 'M PLUS Rounded 1c'";ctx.textAlign="center";ctx.fillText("まゆ",0,-63);ctx.restore();
}
function drawClarinet(){
  ctx.save();ctx.lineCap="round";ctx.lineJoin="round";
  ctx.fillStyle="#17151d";ctx.beginPath();ctx.moveTo(-3,-48);ctx.lineTo(3,-48);ctx.lineTo(5,-35);ctx.lineTo(-5,-35);ctx.closePath();ctx.fill();
  ctx.strokeStyle="#211e28";ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(0,-35);ctx.lineTo(0,31);ctx.stroke();
  ctx.strokeStyle="#d8d4c9";ctx.lineWidth=2;for(let y=-27;y<=24;y+=13){ctx.beginPath();ctx.moveTo(-6,y);ctx.lineTo(6,y);ctx.stroke()}
  ctx.fillStyle="#e2ded0";for(const [x,y]of[[7,-22],[-7,-8],[7,6],[-7,20]]){ctx.beginPath();ctx.arc(x,y,3.5,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#aaa59b";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x>0?2:-2,y);ctx.lineTo(x,y);ctx.stroke()}
  ctx.fillStyle="#17151d";ctx.beginPath();ctx.moveTo(-6,29);ctx.lineTo(6,29);ctx.lineTo(15,47);ctx.quadraticCurveTo(0,54,-15,47);ctx.closePath();ctx.fill();
  ctx.strokeStyle="#d8d4c9";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-13,45);ctx.quadraticCurveTo(0,50,13,45);ctx.stroke();ctx.restore();
}
function drawBarkWave(w){ctx.save();const fade=Math.min(1,w.life/18);ctx.globalAlpha=fade*.82;ctx.translate(w.x,w.y+w.h*.5);const pulse=1+Math.sin(performance.now()/55)*.08;ctx.scale(pulse,1);const grad=ctx.createLinearGradient(0,0,w.w,0);grad.addColorStop(0,"#fff8dcdd");grad.addColorStop(.55,"#ffd15cbb");grad.addColorStop(1,"#e4536200");ctx.strokeStyle=grad;ctx.lineWidth=9;ctx.lineCap="round";for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(0,i*19);ctx.bezierCurveTo(w.w*.28,i*26,w.w*.66,i*26,w.w,i*32);ctx.stroke()}ctx.fillStyle="#fff8dc";ctx.strokeStyle="#d9364c";ctx.lineWidth=3;ctx.font="900 21px 'M PLUS Rounded 1c'";ctx.textAlign="center";ctx.strokeText("ワン!!",w.w*.43,7);ctx.fillText("ワン!!",w.w*.43,7);ctx.restore()}
function drawTaruto(x,y){
  ctx.save();ctx.translate(x+34,y+42);const now=performance.now(),happy=tarutoHappy>0,stunned=tarutoStun>0,bark=now%6500,barking=!happy&&!stunned&&camera>worldW*.5&&bark<700,punch=barking?Math.sin(bark/700*Math.PI):0,bob=Math.sin(now/55)*(happy?6:3);ctx.translate((stunned?Math.sin(now/22)*6:0)-punch*7,bob+punch*2);ctx.rotate((stunned?Math.sin(now/28)*.09:0)-punch*.055+(happy?Math.sin(now/70)*.035:0));
  ctx.fillStyle="#f0ddb8";ctx.strokeStyle="#fffdf3";ctx.lineWidth=8;ctx.beginPath();ctx.arc(-28,0,24,0,Math.PI*2);ctx.fillStyle="#fffdf3";ctx.fill();ctx.stroke();
  ctx.fillStyle="#f0ddb8";ctx.beginPath();ctx.ellipse(0,15,36,29,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(23,-15,32,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle="#d4ae7b";ctx.beginPath();ctx.moveTo(4,-36);ctx.lineTo(12,-59);ctx.lineTo(26,-43);ctx.moveTo(34,-43);ctx.lineTo(51,-58);ctx.lineTo(50,-31);ctx.fill();
  ctx.fillStyle="#211d29";ctx.beginPath();ctx.arc(14,-20,4,0,Math.PI*2);ctx.arc(38,-20,4,0,Math.PI*2);ctx.arc(28,-7,5,0,Math.PI*2);ctx.fill();
  if(barking){ctx.fillStyle="#251722";ctx.beginPath();ctx.ellipse(32,5,12+punch*4,10+punch*5,.08,0,Math.PI*2);ctx.fill();ctx.fillStyle="#ef7180";ctx.beginPath();ctx.ellipse(34,11,7,6,.08,0,Math.PI*2);ctx.fill()}else{ctx.fillStyle="#ef7180";ctx.beginPath();ctx.ellipse(30,2,8,12,.2,0,Math.PI*2);ctx.fill()}
  ctx.fillStyle="#fff4dc";ctx.font="900 11px 'M PLUS Rounded 1c'";ctx.textAlign="center";ctx.fillText("たると",10,-59);

  if(happy){ctx.save();ctx.fillStyle="#ff6f91";ctx.strokeStyle="#fff4dc";ctx.lineWidth=2;for(let i=0;i<3;i++){const hx=-13+i*25,hy=-73-Math.sin(now/120+i)*7,sz=7+i%2*2;ctx.beginPath();ctx.moveTo(hx,hy+sz);ctx.bezierCurveTo(hx-sz*1.5,hy,hx-sz,hy-sz,hx,hy-sz*.25);ctx.bezierCurveTo(hx+sz,hy-sz,hx+sz*1.5,hy,hx,hy+sz);ctx.fill();ctx.stroke()}ctx.fillStyle="#fff4dc";ctx.font="900 12px 'M PLUS Rounded 1c'";ctx.fillText("うれしい♪",12,-82);ctx.restore()}

  // Taruto barks repeatedly while chasing Mayu.
  if(barking){const pop=Math.sin(bark/700*Math.PI),bx=78,by=-45;ctx.save();ctx.globalAlpha=Math.min(1,pop*2.8);ctx.translate(bx,by);ctx.scale(.82+pop*.55,.82+pop*.55);ctx.fillStyle="#fff8dc";ctx.strokeStyle="#d9364c";ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(0,0,39,25,0,0,Math.PI*2);ctx.moveTo(-27,13);ctx.lineTo(-44,25);ctx.lineTo(-19,20);ctx.fill();ctx.stroke();ctx.fillStyle="#d9364c";ctx.font="900 18px 'M PLUS Rounded 1c'";ctx.fillText("ワン!!",0,6);ctx.strokeStyle="#fff8dc";ctx.lineWidth=5;for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(45,0,11+i*11,-.72,.72);ctx.stroke()}ctx.strokeStyle="#ffd15c";ctx.lineWidth=4;for(let i=0;i<3;i++){const a=-.55+i*.55;ctx.beginPath();ctx.moveTo(48+Math.cos(a)*42,Math.sin(a)*42);ctx.lineTo(55+Math.cos(a)*54,Math.sin(a)*54);ctx.stroke()}ctx.restore()}
  ctx.restore();
}
function drawDrunk(x,y){ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(performance.now()/240+x)*.1);ctx.fillStyle="#e7b18e";ctx.beginPath();ctx.arc(28,16,17,0,7);ctx.fill();ctx.fillStyle="#3c3032";ctx.beginPath();ctx.arc(28,10,18,Math.PI,0);ctx.fill();ctx.fillStyle="#826178";rounded(4,34,48,45,13);ctx.fill();ctx.strokeStyle="#34313c";ctx.lineWidth=11;ctx.beginPath();ctx.moveTo(15,75);ctx.lineTo(7,105);ctx.moveTo(40,75);ctx.lineTo(49,105);ctx.stroke();ctx.fillStyle="#f6c55d";rounded(48,42,21,27,4);ctx.fill();ctx.restore()}
function drawGal(x,y,charge){ctx.save();ctx.translate(x,y);if(charge)ctx.rotate(-.16);ctx.fillStyle="#e9b18d";ctx.beginPath();ctx.arc(28,17,17,0,7);ctx.fill();ctx.fillStyle="#c7864d";ctx.beginPath();ctx.arc(28,10,19,Math.PI,0);ctx.lineTo(50,31);ctx.lineTo(7,31);ctx.fill();ctx.fillStyle="#e35f91";rounded(4,36,48,49,12);ctx.fill();ctx.strokeStyle="#38303c";ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(16,82);ctx.lineTo(10,112);ctx.moveTo(40,82);ctx.lineTo(47,112);ctx.stroke();ctx.fillStyle="#252336";rounded(47,23,18,30,3);ctx.fill();ctx.fillStyle="#9ee4ef";ctx.fillRect(50,27,12,19);ctx.fillStyle="#fff4dc";ctx.font="900 9px sans-serif";ctx.fillText("盛",18,64);ctx.restore()}
function drawMug(p){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.spin);ctx.fillStyle="#f1c057";ctx.strokeStyle="#fff4dc";ctx.lineWidth=3;rounded(-11,-13,21,27,3);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(12,0,8,-1.4,1.4);ctx.stroke();ctx.fillStyle="#fff";ctx.globalAlpha=.7;ctx.fillRect(-8,-10,15,5);ctx.restore()}
function drawStrawberry(){ctx.fillStyle="#e94661";ctx.strokeStyle="#a72d47";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,25);ctx.bezierCurveTo(-30,3,-21,-22,0,-16);ctx.bezierCurveTo(22,-22,29,4,0,25);ctx.fill();ctx.stroke();ctx.fillStyle="#ffe98a";for(const [x,y]of[[-9,-4],[8,-6],[-4,8],[10,8]]){ctx.beginPath();ctx.arc(x,y,2,0,7);ctx.fill()}ctx.fillStyle="#5c913e";ctx.beginPath();ctx.moveTo(-18,-14);ctx.lineTo(-5,-12);ctx.lineTo(0,-27);ctx.lineTo(6,-12);ctx.lineTo(19,-15);ctx.lineTo(8,-5);ctx.lineTo(-9,-5);ctx.fill()}
function drawGoldenStrawberry(){ctx.save();ctx.scale(1.5,1.5);ctx.shadowColor="#fff2a6";ctx.shadowBlur=18;ctx.fillStyle="#ffd22e";ctx.strokeStyle="#fff4b0";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,27);ctx.bezierCurveTo(-31,3,-22,-23,0,-17);ctx.bezierCurveTo(23,-23,30,4,0,27);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle="#fff7bc";for(const [x,y]of[[-9,-4],[8,-6],[-4,8],[10,8]]){ctx.beginPath();ctx.arc(x,y,2.5,0,7);ctx.fill()}ctx.fillStyle="#74b84f";ctx.beginPath();ctx.moveTo(-18,-14);ctx.lineTo(-5,-12);ctx.lineTo(0,-28);ctx.lineTo(6,-12);ctx.lineTo(19,-15);ctx.lineTo(8,-5);ctx.lineTo(-9,-5);ctx.fill();ctx.restore()}
function drawRainbowStrawberry(){ctx.save();ctx.scale(1.2,1.2);ctx.shadowColor="#fff";ctx.shadowBlur=22;const rainbow=ctx.createLinearGradient(-25,-20,25,25);rainbow.addColorStop(0,"#ff4f72");rainbow.addColorStop(.2,"#ffad33");rainbow.addColorStop(.4,"#fff25a");rainbow.addColorStop(.6,"#45df83");rainbow.addColorStop(.8,"#4ba8ff");rainbow.addColorStop(1,"#c45cff");ctx.fillStyle=rainbow;ctx.strokeStyle="#fff";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,27);ctx.bezierCurveTo(-31,3,-22,-23,0,-17);ctx.bezierCurveTo(23,-23,30,4,0,27);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle="#fff";for(const [x,y]of[[-9,-4],[8,-6],[-4,8],[10,8]]){ctx.beginPath();ctx.arc(x,y,2.5,0,7);ctx.fill()}ctx.fillStyle="#71d56a";ctx.beginPath();ctx.moveTo(-18,-14);ctx.lineTo(-5,-12);ctx.lineTo(0,-28);ctx.lineTo(6,-12);ctx.lineTo(19,-15);ctx.lineTo(8,-5);ctx.lineTo(-9,-5);ctx.fill();ctx.restore()}
function drawGrape(){ctx.save();ctx.strokeStyle="#fff4dc";ctx.lineWidth=3;ctx.fillStyle="#7651a8";const berries=[[-10,-10],[1,-12],[12,-8],[-15,1],[-3,0],[9,2],[-10,12],[2,12],[-4,23]];for(const [x,y]of berries){ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.fill();ctx.stroke()}ctx.fillStyle="#70a95b";ctx.beginPath();ctx.moveTo(-4,-17);ctx.quadraticCurveTo(5,-34,22,-26);ctx.quadraticCurveTo(13,-14,-4,-17);ctx.fill();ctx.stroke();ctx.strokeStyle="#6e774d";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,-17);ctx.quadraticCurveTo(2,-27,8,-32);ctx.stroke();ctx.restore()}
function drawBone(){ctx.save();ctx.fillStyle="#fff4dc";ctx.strokeStyle="#8d796c";ctx.lineWidth=3;ctx.beginPath();ctx.arc(-19,-8,9,0,Math.PI*2);ctx.arc(-19,8,9,0,Math.PI*2);ctx.arc(19,-8,9,0,Math.PI*2);ctx.arc(19,8,9,0,Math.PI*2);ctx.fill();ctx.stroke();rounded(-20,-9,40,18,8);ctx.fill();ctx.stroke();ctx.restore()}
function drawMusicNote(n){ctx.save();ctx.translate(n.x,n.y+Math.sin(n.phase||0)*6);ctx.rotate(Math.sin(n.phase||0)*.12);const pulse=1+Math.sin((n.phase||0)*1.7)*.12,glow=ctx.createRadialGradient(0,0,4,0,0,38);ctx.scale(pulse,pulse);glow.addColorStop(0,"#ffffff");glow.addColorStop(.28,"#fff05aee");glow.addColorStop(.58,"#59e8ffee");glow.addColorStop(1,"#c957ff00");ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,38,0,Math.PI*2);ctx.fill();ctx.fillStyle="#15131b";ctx.strokeStyle="#fff";ctx.lineWidth=4;ctx.shadowColor="#8ee7f2";ctx.shadowBlur=13;ctx.font="900 48px serif";ctx.textAlign="center";ctx.strokeText(n.symbol,0,15);ctx.fillText(n.symbol,0,15);ctx.restore()}
function drawDuck(d){const y=d.y+Math.sin(d.phase)*13,flap=Math.sin(d.phase*2.3)*.5;ctx.save();ctx.translate(d.x,y);if(d.vx<0)ctx.scale(-1,1);ctx.rotate(flap*.08);ctx.fillStyle="#96623f";ctx.strokeStyle="#fff4d5";ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,5,34,18,0,0,7);ctx.fill();ctx.stroke();ctx.fillStyle="#25715d";ctx.beginPath();ctx.ellipse(-5,2,23,12,flap,0,7);ctx.fill();ctx.fillStyle="#584536";ctx.beginPath();ctx.arc(24,-8,16,0,7);ctx.fill();ctx.fillStyle="#dda33f";ctx.beginPath();ctx.moveTo(38,-7);ctx.lineTo(57,-1);ctx.lineTo(38,3);ctx.fill();if(d.happy){ctx.fillStyle="#ff6f91";ctx.strokeStyle="#fff";ctx.lineWidth=1.5;for(let i=0;i<3;i++){const hx=-20+i*20,hy=-34-(i%2)*8,s=5;ctx.beginPath();ctx.moveTo(hx,hy+s);ctx.bezierCurveTo(hx-s*1.4,hy,hx-s,hy-s,hx,hy-s*.2);ctx.bezierCurveTo(hx+s,hy-s,hx+s*1.4,hy,hx,hy+s);ctx.fill();ctx.stroke()}}ctx.restore()}
function drawGoal(){const x=goalX+30;ctx.fillStyle="#fff4dc";rounded(x,groundY-190,250,190,18);ctx.fill();ctx.fillStyle="#e45362";ctx.font="900 26px 'M PLUS Rounded 1c'";ctx.fillText("GOAL",x+82,groundY-145);const person=(px,color,label)=>{ctx.fillStyle="#efbd99";ctx.beginPath();ctx.arc(x+px,groundY-102,17,0,7);ctx.fill();ctx.fillStyle=color;rounded(x+px-21,groundY-82,42,57,14);ctx.fill();ctx.fillStyle="#34283d";ctx.font="900 11px 'M PLUS Rounded 1c'";ctx.textAlign="center";ctx.fillText(label,x+px,groundY-116)};person(80,"#50847d","とーちゃん");person(155,"#eb7b72","かーちゃん")}
// These renderers deliberately use the same rectangles as their collision checks.
// Keeping the artwork inside those bounds makes attacks readable on a small screen.
function drawBarkWave(w){ctx.save();const fade=Math.min(1,w.life/18),cy=w.y+w.h*.5,grad=ctx.createLinearGradient(w.x,w.y,w.x+w.w,w.y);ctx.globalAlpha=fade*.92;grad.addColorStop(0,"#fff8dcee");grad.addColorStop(.55,"#ffd15cdd");grad.addColorStop(1,"#ee6a73dd");ctx.fillStyle=grad;ctx.strokeStyle="#fff8dc";ctx.lineWidth=3;const puff=(cx,py,rx,ry)=>{ctx.beginPath();ctx.ellipse(cx,py,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.stroke()};puff(w.x+w.w*.3,cy,w.w*.3,w.h*.18);puff(w.x+w.w*.6,cy,w.w*.27,w.h*.32);puff(w.x+w.w*.81,w.y+w.h*.31,w.w*.19,w.h*.27);puff(w.x+w.w*.81,w.y+w.h*.69,w.w*.19,w.h*.27);ctx.fillStyle="#fff24f";ctx.strokeStyle="#74163e";ctx.lineWidth=6;ctx.shadowColor="#fff";ctx.shadowBlur=8;ctx.font="900 27px 'M PLUS Rounded 1c'";ctx.textAlign="center";ctx.textBaseline="middle";ctx.strokeText("ワン!!",w.x+w.w*.62,cy);ctx.fillText("ワン!!",w.x+w.w*.62,cy);ctx.restore()}
function drawHeartParticle(h){ctx.save();ctx.globalAlpha=Math.min(1,h.life/15);ctx.translate(h.x,h.y);ctx.fillStyle="#ff6f91";ctx.strokeStyle="#fff";ctx.lineWidth=1.5;const s=h.size;ctx.beginPath();ctx.moveTo(0,s);ctx.bezierCurveTo(-s*1.5,0,-s,-s,0,-s*.2);ctx.bezierCurveTo(s,-s,s*1.5,0,0,s);ctx.fill();ctx.stroke();ctx.restore()}
function drawDuck(d){const y=d.y+Math.sin(d.phase)*13,flap=Math.sin(d.phase*2.3)*.5;ctx.save();ctx.translate(d.x,y);if(d.vx>0)ctx.scale(-1,1);ctx.rotate(flap*.08);ctx.fillStyle="#96623f";ctx.strokeStyle="#fff4d5";ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,5,34,18,0,0,7);ctx.fill();ctx.stroke();ctx.fillStyle="#25715d";ctx.beginPath();ctx.ellipse(5,2,23,12,-flap,0,7);ctx.fill();ctx.fillStyle="#584536";ctx.beginPath();ctx.arc(-24,-8,16,0,7);ctx.fill();ctx.fillStyle="#dda33f";ctx.beginPath();ctx.moveTo(-38,-7);ctx.lineTo(-57,-1);ctx.lineTo(-38,3);ctx.fill();ctx.restore()}
function drawGoal(){const x=goalX+30;ctx.fillStyle="#fff4dc";rounded(x,groundY-170,250,170,18);ctx.fill();ctx.fillStyle="#e45362";ctx.font="900 26px 'M PLUS Rounded 1c'";ctx.fillText("GOAL",x+82,groundY-125);const person=(px,color,label)=>{ctx.fillStyle="#efbd99";ctx.beginPath();ctx.arc(x+px,groundY-102,17,0,7);ctx.fill();ctx.fillStyle=color;rounded(x+px-21,groundY-82,42,57,14);ctx.fill();ctx.fillStyle="#34283d";ctx.font="900 11px 'M PLUS Rounded 1c'";ctx.textAlign="center";ctx.fillText(label,x+px,groundY-116)};person(80,"#50847d","とーちゃん");person(155,"#eb7b72","かーちゃん")}
function drawDebugTag(x,y,text,color){ctx.save();ctx.font="900 18px 'M PLUS Rounded 1c'";ctx.textAlign="center";ctx.textBaseline="middle";const w=Math.max(70,ctx.measureText(text).width+20);ctx.fillStyle="#20182df2";ctx.strokeStyle=color;ctx.lineWidth=3;rounded(x-w/2,y-16,w,32,10);ctx.fill();ctx.stroke();ctx.fillStyle="#fff";ctx.shadowColor="#000";ctx.shadowBlur=3;ctx.fillText(text,x,y+1);ctx.restore()}
function drawDebugMarkers(){ledges.forEach(p=>drawDebugTag(p.x+p.w/2,p.y-14,`F-${String(p.debugNo).padStart(2,"0")}`,"#62d9ef"));items.forEach(i=>{if(!i.taken)drawDebugTag(i.x,i.y-(i.type==="goldStrawberry"?58:42),`I-${String(i.debugNo).padStart(2,"0")}`,"#ffd15c")});if(!rainbowBerry.taken)drawDebugTag(rainbowBerry.x,rainbowBerry.y-48,`I-${String(rainbowBerry.debugNo).padStart(2,"0")}`,"#ffd15c");enemies.forEach(e=>{if(e.type==="drunk"&&e.alive)drawDebugTag(e.x+28,e.y-15,`O-${String(e.debugNo).padStart(2,"0")}`,"#ff8d82")})}
function drawTerrainDebugMarkers(){sandZones.forEach(s=>drawDebugTag(s.x+s.w/2,groundY-27,`S-${String(s.debugNo).padStart(2,"0")}`,"#f4c768"));cliffZones.forEach(c=>drawDebugTag(c.x+c.w/2,groundY-27,`C-${String(c.debugNo).padStart(2,"0")}`,"#ff657d"))}
function drawActionMessage(){if(!actionMessage||performance.now()>=actionMessageUntil)return;ctx.save();ctx.font="900 22px 'M PLUS Rounded 1c', sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";const maxWidth=W*.68,textWidth=Math.min(maxWidth,ctx.measureText(actionMessage).width),boxWidth=textWidth+46,boxX=(W-boxWidth)/2,boxY=61;ctx.fillStyle="#34283dc7";ctx.strokeStyle="#fff4dc";ctx.lineWidth=3;rounded(boxX,boxY,boxWidth,46,23);ctx.fill();ctx.stroke();ctx.strokeStyle="#34283d";ctx.lineWidth=5;ctx.strokeText(actionMessage,W/2,boxY+23,maxWidth);ctx.fillStyle="#fff4dc";ctx.lineWidth=1;ctx.fillText(actionMessage,W/2,boxY+23,maxWidth);ctx.restore()}
function draw(){ctx.clearRect(0,0,W,H);drawBackground();drawActionMessage();drawWorld()}
function loop(now){const step=Math.max(.35,Math.min(2,(now-last)/16.67||1));last=now;if(mapDebugMode&&mapDebugPan){camera=Math.max(0,Math.min(worldW-W,camera+mapDebugPan*15*step));updateMapDebugPosition()}else if(running&&!paused)update(step);if(!paused)draw();requestAnimationFrame(loop)}

$("#startBtn span").textContent="ゲームスタート";$("#storyBtn").onclick=showStory;$("#mapDebugBtn").onclick=startMapDebug;$("#startBtn").onclick=start;$("#againBtn").onclick=start;$("#retryBtn").onclick=start;$("#pauseBtn").onclick=togglePause;$("#homeBtn").onclick=()=>location.href="index.html";
const debugLeft=$("#mapDebugLeft"),debugRight=$("#mapDebugRight");debugLeft.onpointerdown=e=>{e.preventDefault();mapDebugPan=-1};debugRight.onpointerdown=e=>{e.preventDefault();mapDebugPan=1};for(const button of[debugLeft,debugRight]){button.onpointerup=button.onpointercancel=button.onpointerleave=()=>mapDebugPan=0}$("#mapDebugExit").onclick=stopMapDebug;
canvas.addEventListener("pointerdown",e=>{if(!mapDebugMode)return;mapDebugDragX=e.clientX;if(canvas.setPointerCapture)canvas.setPointerCapture(e.pointerId);e.preventDefault()});canvas.addEventListener("pointermove",e=>{if(!mapDebugMode||mapDebugDragX===null)return;moveMapDebug((mapDebugDragX-e.clientX)*2.2);mapDebugDragX=e.clientX;e.preventDefault()});const endMapDrag=()=>mapDebugDragX=null;canvas.addEventListener("pointerup",endMapDrag);canvas.addEventListener("pointercancel",endMapDrag);canvas.addEventListener("wheel",e=>{if(!mapDebugMode)return;moveMapDebug((Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY)*1.5);e.preventDefault()},{passive:false});
const jumpBtn=$("#jumpBtn");jumpBtn.onpointerdown=e=>{e.preventDefault();if(jumpBtn.setPointerCapture)jumpBtn.setPointerCapture(e.pointerId);jump()};jumpBtn.onpointerup=releaseJump;jumpBtn.onpointercancel=releaseJump;
const attackBtn=$("#attackBtn");attackBtn.onpointerdown=e=>{e.preventDefault();if(attackBtn.setPointerCapture)attackBtn.setPointerCapture(e.pointerId);if(!paused)attack()};
for(const eventName of["contextmenu","selectstart","dragstart"]){document.addEventListener(eventName,e=>{if(e.target&&e.target.closest&&e.target.closest(".run-shell"))e.preventDefault()},{capture:true,passive:false})}
addEventListener("keydown",e=>{if(mapDebugMode&&["ArrowLeft","ArrowRight"].includes(e.key)){mapDebugPan=e.key==="ArrowLeft"?-1:1;e.preventDefault();return}if(["p","P","Escape"].includes(e.key)){togglePause();e.preventDefault();return}if([" ","ArrowUp","w","W"].includes(e.key)){jump();e.preventDefault()}if(!paused&&["x","X","k","K"].includes(e.key))attack()});
addEventListener("keyup",e=>{if(mapDebugMode&&["ArrowLeft","ArrowRight"].includes(e.key)){mapDebugPan=0;e.preventDefault()}if([" ","ArrowUp","w","W"].includes(e.key))releaseJump()});addEventListener("blur",()=>{releaseJump();mapDebugPan=0});
reset();last=performance.now();requestAnimationFrame(loop);
const localPreview=(location.hostname==="localhost"||location.hostname==="127.0.0.1")&&new URLSearchParams(location.search).has("play");
if(localPreview)setTimeout(start,80);
