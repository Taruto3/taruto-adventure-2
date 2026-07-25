const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const $ = s => document.querySelector(s);
const bg = new Image(); bg.src = "assets/tart-adventure-bg.png";

const W = 1280, H = 720, worldW = 4200, groundY = 590, goalX = 3870;
const riverZones=[{x:700,w:500},{x:1700,w:550},{x:2600,w:900}];
let running=false, won=false, last=0, camera=0, carrots=0, bones=0, lives=3, sound=true, toastTimer;
const keys={jump:false,attack:false};
let player={x:150,y:groundY-92,w:80,h:92,vx:0,vy:0,onGround:false,inv:0,dir:1,attack:0,cooldown:0,attackDir:1};
const platforms=[
  {x:0,y:590,w:700,h:130},{x:1200,y:590,w:500,h:130},{x:2250,y:590,w:350,h:130},
  {x:3500,y:590,w:700,h:130},
  {x:620,y:470,w:250,h:28},{x:900,y:380,w:250,h:28},{x:1140,y:470,w:150,h:28},
  {x:1620,y:460,w:250,h:28},{x:1900,y:350,w:250,h:28},{x:2140,y:455,w:160,h:28},
  {x:2520,y:470,w:240,h:28},{x:2780,y:385,w:240,h:28},{x:3040,y:300,w:240,h:28},{x:3300,y:410,w:240,h:28}
];
let items=[], enemies=[], ducks=[];

function reset(){
  player={x:190,y:groundY-92,w:80,h:92,vx:0,vy:0,onGround:false,inv:0,dir:1,attack:0,cooldown:0,attackDir:1};
  camera=0; carrots=0; bones=0; lives=3; won=false;
  items=[[720,415,"carrot"],[995,325,"bone"],[1320,535,"carrot"],[1740,405,"carrot"],[2010,295,"bone"],[2360,535,"carrot"],[2810,330,"bone"],[3070,245,"carrot"]].map(([x,y,type])=>({x,y,type,taken:false,bob:Math.random()*6}));
  enemies=[
    {type:"cat",x:540,y:535,min:420,max:650,v:1.25,alive:true},
    {type:"crow",x:1040,y:315,min:900,max:1130,v:1.7,alive:true,phase:0},
    {type:"cat",x:1510,y:535,min:1300,max:1640,v:1.15,alive:true},
    {type:"crow",x:2040,y:285,min:1910,max:2130,v:1.8,alive:true,phase:2},
    {type:"cat",x:2470,y:535,min:2340,max:2560,v:1.25,alive:true},
    {type:"crow",x:3100,y:275,min:2970,max:3190,v:1.75,alive:true,phase:4}
  ];
  ducks=[{x:950,y:574,phase:0,bounce:0},{x:1975,y:574,phase:2,bounce:0},{x:3170,y:574,phase:4,bounce:0},{x:3420,y:574,phase:1,bounce:0}];
  updateHud();
}
function updateHud(){
  $("#carrotScore").textContent=carrots;
  $("#boneScore").textContent=bones;
  $("#lives").textContent="♥ ".repeat(lives).trim();
}
async function enterGameMode(){
  const root=document.documentElement;
  try{
    if(!document.fullscreenElement){
      if(root.requestFullscreen)await root.requestFullscreen({navigationUI:"hide"});
      else if(root.webkitRequestFullscreen)root.webkitRequestFullscreen();
    }
  }catch(_){}
  try{
    if(screen.orientation&&screen.orientation.lock)await screen.orientation.lock("landscape");
  }catch(_){}
  setTimeout(()=>window.scrollTo(0,1),120);
}
function start(){
  enterGameMode();
  reset(); running=true;
  $("#startScreen").classList.add("hidden");$("#storyScreen").classList.add("hidden");$("#endScreen").classList.add("hidden");$("#hud").classList.remove("hidden");
  beep(440,.08,"sine");
  setTimeout(()=>toast("KICKで必殺・くるん回し蹴り！"),450);
}
function showStory(){
  enterGameMode();
  $("#startScreen").classList.add("hidden");
  $("#storyScreen").classList.remove("hidden");
  beep(440,.08,"sine");
}
$("#startBtn").onclick=showStory;$("#storyBtn").onclick=start;$("#retryBtn").onclick=start;
$("#soundBtn").onclick=()=>{sound=!sound;$("#soundBtn").classList.toggle("off",!sound)};

addEventListener("keydown",e=>{
  if([" ","ArrowUp","w","W"].includes(e.key)){keys.jump=true;e.preventDefault()}
  if(["x","X","k","K"].includes(e.key)){keys.attack=true;e.preventDefault()}
});
addEventListener("keyup",e=>{
  if([" ","ArrowUp","w","W"].includes(e.key))keys.jump=false;
  if(["x","X","k","K"].includes(e.key))keys.attack=false;
});
document.querySelectorAll("[data-key]").forEach(b=>{
  const k=b.dataset.key;
  ["pointerdown","touchstart"].forEach(ev=>b.addEventListener(ev,e=>{e.preventDefault();keys[k]=true}));
  ["pointerup","pointercancel","touchend"].forEach(ev=>b.addEventListener(ev,e=>{e.preventDefault();keys[k]=false}));
});

let audio;
function beep(freq,dur,type="sine"){
  if(!sound)return;
  if(!audio) audio = new (window.AudioContext||window.webkitAudioContext)();
  const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.06,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+dur);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+dur);
}
function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function toast(text){const el=$("#toast");el.textContent=text;el.classList.remove("hidden");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.add("hidden"),1100)}
function hurt(){
  if(player.inv>0)return;
  lives--;updateHud();beep(130,.3,"sawtooth");
  player.inv=120; player.vy=-11; player.vx=-player.dir*8;
  if(lives<=0){lives=3;player.x=Math.max(120,camera+100);player.y=200;updateHud();toast("たると、もういちど！")}
}
function update(){
  const runSpeed=player.attack>0?3.7:5.6;
  player.vx+=(runSpeed-player.vx)*.2;
  player.dir=1;
  if(keys.jump&&player.onGround){player.vy=-14.5;player.onGround=false;beep(520,.12,"triangle")}
  if(keys.attack&&player.cooldown<=0){
    player.attack=46;player.cooldown=62;player.attackDir=player.dir;player.vx*=.35;
    beep(180,.08,"sawtooth");setTimeout(()=>beep(110,.09,"square"),55);
  }
  player.vy+=.72; player.vy=Math.min(18,player.vy);
  let oldY=player.y;player.x+=player.vx;player.y+=player.vy;player.x=Math.max(0,Math.min(worldW-player.w,player.x));
  player.onGround=false;
  for(const p of platforms){
    if(player.x+player.w>p.x&&player.x<p.x+p.w&&oldY+player.h<=p.y+3&&player.y+player.h>=p.y&&player.vy>=0){
      player.y=p.y-player.h;player.vy=0;player.onGround=true;
    }
  }
  ducks.forEach(d=>{
    const dy=d.y+Math.sin(performance.now()/380+d.phase)*4;
    const top=dy-14;
    if(d.bounce>0)d.bounce--;
    if(player.vy>=0&&player.x+player.w>d.x-40&&player.x<d.x+40&&oldY+player.h<=top+7&&player.y+player.h>=top){
      player.y=top-player.h;player.vy=-19;player.onGround=false;d.bounce=12;
      beep(340,.08,"square");setTimeout(()=>beep(720,.16,"triangle"),70);toast("カモさんジャンプ！");
    }
  });
  const river=riverZones.find(r=>player.x+player.w*.75>r.x&&player.x+player.w*.25<r.x+r.w&&player.y+player.h>groundY+42);
  if(river){
    lives--;beep(110,.35,"sawtooth");
    if(lives<=0)lives=3;
    updateHud();
    player.x=Math.max(40,river.x-125);player.y=groundY-player.h;player.vx=0;player.vy=0;player.inv=75;
    toast("川に落ちちゃった！ ジャンプしよう");
  }
  if(player.y>H+100){player.y=80;player.x=Math.max(60,player.x-260);player.vy=0;hurt()}
  items.forEach(b=>{
    b.bob+=.05;
    if(!b.taken&&overlap(player,{x:b.x-24,y:b.y-24,w:48,h:48})){b.taken=true;b.type==="carrot"?carrots++:bones++;updateHud();beep(760,.1,"triangle");setTimeout(()=>beep(980,.12,"triangle"),70);toast(b.type==="carrot"?"にんじんトイ ゲット！ ＋1":"骨をみつけた！ ＋1")}
  });
  enemies.forEach(e=>{
    if(!e.alive)return;
    if(e.defeated>0){e.defeated--;if(e.defeated===0)e.alive=false;return}
    e.x+=e.v;if(e.x<e.min||e.x>e.max)e.v*=-1;
    if(e.type==="crow")e.y+=Math.sin(performance.now()/260+e.phase)*.7;
    const target={x:e.x,y:e.y,w:e.type==="cat"?66:58,h:e.type==="cat"?55:42};
    const kick={x:player.attackDir===1?player.x+player.w-8:player.x-72,y:player.y-30,w:80,h:114};
    if(player.attack>=9&&player.attack<=38&&overlap(kick,target)){
      e.alive=false;beep(240,.08,"square");setTimeout(()=>beep(420,.12,"triangle"),60);toast("くるん回し蹴り！ やった！");
      return;
    }
    if(overlap(player,target)){
      if(player.vy>2&&player.y+player.h<e.y+24){
        e.defeated=22;player.vy=-10;beep(170,.1,"square");setTimeout(()=>beep(300,.08,"triangle"),60);toast("ふみつぶした！");
      }
      else hurt();
    }
  });
  if(player.inv>0)player.inv--;
  if(player.attack>0)player.attack--;
  if(player.cooldown>0)player.cooldown--;
  if(player.x>goalX-70&&!won){
    won=true;running=false;beep(620,.15);setTimeout(()=>beep(780,.15),140);setTimeout(()=>beep(1040,.4),280);
    $("#endMessage").innerHTML=carrots===5&&bones===3?"とーちゃんとかーちゃんのところへ帰ってきたよ！<br><strong>ぜんぶ見つけてパーフェクト！</strong>":"とーちゃんとかーちゃんが待ってたよ！<br>にんじんトイ <strong>"+carrots+" / 5</strong>　骨 <strong>"+bones+" / 3</strong>";
    $("#endScreen").classList.remove("hidden");$("#hud").classList.add("hidden");
  }
  camera+=(Math.max(0,Math.min(worldW-W,player.x-W*.36))-camera)*.08;
}
function roundedRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function drawBackground(){
  if(bg.complete)ctx.drawImage(bg,0,0,bg.width,bg.height,0,0,W,H);
  else {ctx.fillStyle="#ffca91";ctx.fillRect(0,0,W,H)}
  ctx.fillStyle="#ffffff45";ctx.fillRect(0,0,W,H);
  // parallax hills
  ctx.fillStyle="#68bfa5";ctx.beginPath();ctx.moveTo(0,490);for(let x=0;x<=W;x+=80)ctx.lineTo(x,420+Math.sin((x+camera*.12)/180)*55);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
}
function drawWorld(){
  ctx.save();ctx.translate(-camera,0);
  // rivers between the hills
  riverZones.forEach(r=>{
    ctx.fillStyle="#55bdda";ctx.fillRect(r.x,groundY,r.w,H-groundY);
    ctx.strokeStyle="#bff4ef";ctx.lineWidth=5;
    for(let x=r.x+8;x<r.x+r.w;x+=28){ctx.beginPath();ctx.arc(x,groundY+13,13,Math.PI,0);ctx.stroke()}
  });
  // ground and floating flower platforms
  platforms.forEach((p,i)=>{
    ctx.fillStyle=i<4?"#216d57":"#fff1ba";roundedRect(p.x,p.y,p.w,p.h,i<4?18:14);ctx.fill();
    ctx.fillStyle=i<4?"#65b95d":"#e7ad52";roundedRect(p.x,p.y,p.w,Math.min(24,p.h),14);ctx.fill();
    if(i<4){ctx.fillStyle="#8bd26d";for(let x=p.x+12;x<p.x+p.w;x+=34){ctx.beginPath();ctx.arc(x,p.y+5,14,0,Math.PI*2);ctx.fill()}}
  });
  // flowers
  for(let x=230;x<worldW;x+=370){const y=groundAt(x)-15;ctx.strokeStyle="#226c56";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-32);ctx.stroke();ctx.fillStyle=x%2?"#ff795f":"#ffc34c";for(let a=0;a<6;a++){ctx.beginPath();ctx.arc(x+Math.cos(a)*11,y-38+Math.sin(a)*11,9,0,7);ctx.fill()}ctx.fillStyle="#fff1a2";ctx.beginPath();ctx.arc(x,y-38,7,0,7);ctx.fill()}
  items.forEach(b=>{if(b.taken)return;const y=b.y+Math.sin(b.bob)*6;ctx.save();ctx.translate(b.x,y);ctx.rotate(Math.sin(b.bob*.7)*.08);b.type==="carrot"?drawCarrot():drawBone();ctx.restore()});
  ducks.forEach(d=>drawDuck(d.x,d.y+Math.sin(performance.now()/380+d.phase)*4,d.bounce));
  enemies.forEach(e=>{if(e.alive)(e.type==="cat"?drawCat:drawCrow)(e.x,e.y,e.v,e.defeated>0)});
  drawHome(25,groundY-160);
  drawParents(goalX-130,groundY-142);
  drawTart(player.x,player.y);
  ctx.restore();
}
function groundAt(x){const p=platforms.find(p=>x>=p.x&&x<=p.x+p.w&&p.y===groundY);return p?groundY:H+50}
function drawCat(x,y,v,squashed=false){ctx.save();ctx.translate(x,y+(squashed?38:0));ctx.scale(v<0?-1:1,squashed?.28:1);ctx.fillStyle="#687574";ctx.strokeStyle="#fff5d8";ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(31,30,31,22,0,0,7);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(53,14,21,0,7);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(38,0);ctx.lineTo(42,-20);ctx.lineTo(53,0);ctx.moveTo(55,0);ctx.lineTo(69,-18);ctx.lineTo(72,5);ctx.fill();ctx.fillStyle="#ffc34c";ctx.beginPath();ctx.arc(48,12,3,0,7);ctx.arc(62,12,3,0,7);ctx.fill();ctx.strokeStyle="#687574";ctx.lineWidth=8;ctx.beginPath();ctx.arc(4,22,24,1.6,4.8);ctx.stroke();ctx.restore()}
function drawCrow(x,y,v,squashed=false){ctx.save();ctx.translate(x,y+(squashed?30:0));ctx.scale(v<0?-1:1,squashed?.3:1);const flap=Math.sin(performance.now()/95)*12;ctx.fillStyle="#263d48";ctx.beginPath();ctx.ellipse(27,20,27,18,0,0,7);ctx.fill();ctx.beginPath();ctx.arc(48,12,16,0,7);ctx.fill();ctx.fillStyle="#101d24";ctx.beginPath();ctx.moveTo(18,19);ctx.lineTo(-15,flap);ctx.lineTo(12,30);ctx.fill();ctx.fillStyle="#e0a33b";ctx.beginPath();ctx.moveTo(62,9);ctx.lineTo(82,15);ctx.lineTo(62,18);ctx.fill();ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(53,8,4,0,7);ctx.fill();ctx.fillStyle="#182b31";ctx.beginPath();ctx.arc(54,8,2,0,7);ctx.fill();ctx.restore()}
function drawDuck(x,y,bounce=0){
  ctx.save();ctx.translate(x,y);ctx.scale(1+bounce*.015,1-bounce*.02);
  ctx.strokeStyle="#fff4d5";ctx.lineWidth=4;
  ctx.fillStyle="#9a633f";ctx.beginPath();ctx.ellipse(0,8,37,19,0,0,7);ctx.fill();ctx.stroke();
  ctx.fillStyle="#24735f";ctx.beginPath();ctx.ellipse(-7,5,25,13,-.15,0,7);ctx.fill();
  ctx.strokeStyle="#69a98a";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-27,5);ctx.quadraticCurveTo(-7,-5,14,6);ctx.stroke();
  ctx.fillStyle="#5e4937";ctx.strokeStyle="#fff4d5";ctx.lineWidth=4;ctx.beginPath();ctx.arc(23,-9,17,0,7);ctx.fill();ctx.stroke();
  ctx.strokeStyle="#f4e2b8";ctx.lineWidth=4;ctx.beginPath();ctx.arc(21,-7,17,.25,1.4);ctx.stroke();
  ctx.fillStyle="#d9a044";ctx.beginPath();ctx.moveTo(36,-8);ctx.lineTo(57,-2);ctx.lineTo(36,2);ctx.fill();
  ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(28,-13,4,0,7);ctx.fill();ctx.fillStyle="#183b3a";ctx.beginPath();ctx.arc(29,-13,2,0,7);ctx.fill();
  ctx.fillStyle="#71d0dc";ctx.globalAlpha=.45;ctx.beginPath();ctx.ellipse(0,27,47,7,0,0,7);ctx.fill();
  ctx.restore();
}
function drawCarrot(){
  ctx.save();ctx.rotate(-.12);
  ctx.fillStyle="#ef812e";ctx.strokeStyle="#bf5b24";ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(-18,-12);ctx.quadraticCurveTo(17,-19,13,3);ctx.quadraticCurveTo(9,23,-4,31);ctx.quadraticCurveTo(-7,14,-18,-12);ctx.fill();ctx.stroke();
  ctx.strokeStyle="#ffb45d";ctx.lineWidth=2;
  for(let y=-7;y<19;y+=7){ctx.beginPath();ctx.moveTo(-9,y);ctx.lineTo(7,y+3);ctx.stroke()}
  ctx.strokeStyle="#668b3d";ctx.lineWidth=8;ctx.lineCap="round";
  [-.5,0,.5].forEach(a=>{ctx.beginPath();ctx.moveTo(-10,-9);ctx.lineTo(-18+Math.sin(a)*15,-29+Math.cos(a)*4);ctx.stroke()});
  ctx.strokeStyle="#a94d20";ctx.lineWidth=1.5;ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(-15,-9);ctx.quadraticCurveTo(13,-14,9,4);ctx.stroke();ctx.setLineDash([]);
  ctx.restore();
}
function drawBone(){ctx.fillStyle="#fff5d8";ctx.strokeStyle="#c99860";ctx.lineWidth=4;ctx.beginPath();ctx.arc(-17,-8,10,0,7);ctx.arc(-17,8,10,0,7);ctx.arc(17,-8,10,0,7);ctx.arc(17,8,10,0,7);ctx.fill();ctx.stroke();ctx.fillStyle="#fff5d8";ctx.fillRect(-17,-10,34,20)}
function drawHome(x,y){ctx.fillStyle="#fff2ce";roundedRect(x,y,150,160,25);ctx.fill();ctx.fillStyle="#e96850";ctx.beginPath();ctx.moveTo(x-20,y+30);ctx.lineTo(x+75,y-45);ctx.lineTo(x+170,y+30);ctx.closePath();ctx.fill();ctx.fillStyle="#1d8177";roundedRect(x+53,y+85,46,75,20);ctx.fill();ctx.fillStyle="#ffc34c";ctx.beginPath();ctx.arc(x+88,y+120,4,0,7);ctx.fill();ctx.fillStyle="#183b3a";ctx.font="900 20px 'M PLUS Rounded 1c'";ctx.fillText("おうち",x+45,y+58)}
function drawParents(x,y){
  const person=(px,shirt,hair,label,wave)=>{
    ctx.save();ctx.translate(x+px,y);
    ctx.fillStyle="#f3c6a4";ctx.beginPath();ctx.arc(0,18,18,0,7);ctx.fill();
    ctx.fillStyle=hair;ctx.beginPath();ctx.arc(0,12,19,Math.PI,0);ctx.lineTo(18,20);ctx.lineTo(-18,20);ctx.fill();
    ctx.fillStyle=shirt;ctx.beginPath();ctx.roundRect(-24,38,48,66,18);ctx.fill();
    ctx.strokeStyle="#f3c6a4";ctx.lineWidth=12;ctx.lineCap="round";
    ctx.beginPath();ctx.moveTo(-18,48);ctx.lineTo(-34,wave?18:77);ctx.stroke();
    ctx.beginPath();ctx.moveTo(18,48);ctx.lineTo(37,wave?8:77);ctx.stroke();
    ctx.strokeStyle="#334f4d";ctx.lineWidth=13;ctx.beginPath();ctx.moveTo(-12,98);ctx.lineTo(-14,139);ctx.moveTo(12,98);ctx.lineTo(14,139);ctx.stroke();
    ctx.fillStyle="#183b3a";ctx.font="900 14px 'M PLUS Rounded 1c'";ctx.textAlign="center";ctx.fillText(label,0,-14);ctx.restore();
  };
  person(0,"#4a8c80","#49372e","とーちゃん",true);
  person(72,"#ef826b","#5a3c30","かーちゃん",true);
  ctx.fillStyle="#fff8e9";ctx.strokeStyle="#ff795f";ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(x-42,y-54,154,30,15);ctx.fill();ctx.stroke();
  ctx.fillStyle="#c74e3b";ctx.font="900 15px 'M PLUS Rounded 1c'";ctx.textAlign="center";ctx.fillText("たると、おかえり！",x+35,y-34);
}
function drawTart(x,y){
  if(player.inv&&Math.floor(player.inv/6)%2)return;
  ctx.save();ctx.translate(x+40,y+46);
  let facing=player.dir;
  if(player.attack>0){
    if(player.attack>38){
      const turn=(46-player.attack)/8;
      facing=player.attackDir*(1-turn*2);
    }else if(player.attack<9){
      const turnBack=(9-player.attack)/8;
      facing=-player.attackDir*(1-turnBack*2);
    }else{
      facing=-player.attackDir;
    }
  }
  ctx.scale(facing,1);
  const bounce=player.onGround&&Math.abs(player.vx)>1?Math.sin(performance.now()/70)*3:0;ctx.translate(0,bounce);
  ctx.fillStyle="#f3dfb9";ctx.strokeStyle="#fffdf4";ctx.lineWidth=9;
  ctx.beginPath();ctx.arc(-34,-1,27,0,7);ctx.fillStyle="#fffdf3";ctx.fill();ctx.stroke();
  ctx.fillStyle="#f3dfb9";ctx.beginPath();ctx.ellipse(0,15,39,32,0,0,7);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.arc(25,-16,36,0,7);ctx.fill();ctx.stroke();
  ctx.fillStyle="#d7b486";ctx.beginPath();ctx.moveTo(6,-39);ctx.lineTo(14,-65);ctx.lineTo(28,-47);ctx.fill();ctx.beginPath();ctx.moveTo(35,-47);ctx.lineTo(55,-63);ctx.lineTo(54,-34);ctx.fill();
  ctx.fillStyle="#fff5dc";ctx.beginPath();ctx.ellipse(30,-7,21,19,0,0,7);ctx.fill();
  ctx.fillStyle="#183b3a";ctx.beginPath();ctx.arc(17,-22,4,0,7);ctx.arc(42,-22,4,0,7);ctx.fill();ctx.beginPath();ctx.arc(31,-8,6,0,7);ctx.fill();
  ctx.fillStyle="#fff3d4";
  if(player.attack>=9&&player.attack<=38){
    ctx.save();ctx.translate(-18,12);ctx.rotate(.68);ctx.fillStyle="#f3dfb9";ctx.strokeStyle="#fffdf4";ctx.lineWidth=8;ctx.beginPath();ctx.roundRect(-78,-10,78,20,10);ctx.fill();ctx.stroke();ctx.fillStyle="#fffdf3";ctx.beginPath();ctx.ellipse(-81,0,17,12,0,0,7);ctx.fill();ctx.restore();
    ctx.beginPath();ctx.ellipse(17,43,13,10,0,0,7);ctx.fill();
    ctx.strokeStyle="#ffc34c";ctx.lineWidth=5;for(let a=-1;a<=1;a++){ctx.beginPath();ctx.moveTo(-69+a*3,-38+a*15);ctx.lineTo(-94+a*7,-55+a*20);ctx.stroke()}
  }else{
    for(const lx of[-14,17]){ctx.beginPath();ctx.ellipse(lx,43,13,10,0,0,7);ctx.fill()}
  }
  ctx.restore();
}
function draw(){
  ctx.clearRect(0,0,W,H);drawBackground();drawWorld();
  if(running){ctx.fillStyle="#fff";ctx.globalAlpha=.12;for(let i=0;i<12;i++){ctx.beginPath();ctx.arc((i*137-camera*.2)%1400,90+(i%4)*55,3+(i%3),0,7);ctx.fill()}ctx.globalAlpha=1}
}
function loop(t){if(running&&t-last>12){update();last=t}draw();requestAnimationFrame(loop)}
reset();requestAnimationFrame(loop);
