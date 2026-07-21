// ---------------------------------------------------------------------------
// SECTION 10 — GAMEPLAY ACTIONS
// ---------------------------------------------------------------------------
function addPopup(text,color,life){
  const t = (life===undefined||life===null) ? 1.0 : life;
  game.popups.push({x:innerWidth/2, y:innerHeight/2-52, vy:-22, life:t, text, color:color||'#ffd24a'});
}
function tickPickups(){
  for(const c of game.pickups){
    if(c.taken) continue;
    const dx=c.x-player.x, dy=c.y-player.y;
    if(dx*dx+dy*dy<0.18){
      if(player.cans<player.maxCans){
        const space=player.maxCans-player.cans;
        const take=Math.min(c.amt,space);
        player.cans+=take; c.amt-=take;
        crTriggerSoundCue('canCollect');
        if(take > 1) addPopup('+'+take+' CANS','#ffd24a', 0.65);
        game.flash=0.5;
        game.run.cansCollected += take;
        SAVE.save();
        if(c.amt<=0) c.taken=true;
      }
    }
  }
}
function giveCan(){
  if(player.giveCD>0){ return; }
  const best=game.aimNpc;
  if(!best){ setMsg('no one nearby'); crTriggerSoundCue('giveUnavailable'); return; }
  const los = interactionLineClear(player.x, player.y, best.x, best.y);
  if(!los.clear){
    setMsg('blocked'); crTriggerSoundCue('giveBlocked'); return;
  }
  if(player.cans<best.need){
    setMsg('need '+best.need+' (have '+player.cans+')');
    addPopup('NOT ENOUGH CANS','#ff7a6a');
    crTriggerSoundCue('giveNeedCans'); return;
  }
  player.cans-=best.need; best.helped=true; game.helped++; game.delivered+=best.need;
  const mech = npcMechanicKind(best.kind);
  game.run.helpedByKind[mech] = (game.run.helpedByKind[mech]||0)+1;
  game.run.cansDelivered += best.need;
  SAVE.save();
  player.giveCD = player.baseGiveCD / (1 + player.handoffBonus*0.5);
  crTriggerSoundCue('giveSuccess');
  game.handoffFx=0.8;
  const perGive = (best.need*25 + 100) * game.scoreMult;
  if(mech==='elder'){ player.speedBoostT=5; setMsg('Elder blessed you — SPEED!'); }
  else if(mech==='volunteer'){ game.revealT=8; setMsg('Volunteer — cans/people revealed!'); }
  else setMsg('Helped! ('+best.need+')');
  addPopup('+'+Math.round(perGive)+' pts','#9fffb6');
  if(game.run.customLevel==='hall_of_servants'){
    addPopup(pickHallThankLine(best), '#e8d4b0', 1.35);
  }
  if(game.helped>game.quota){
    const bonus = Math.round(150*game.scoreMult);
    game.totalScore += bonus;
    addPopup('BONUS +'+bonus,'#ffe066');
  }
  if(game.helped>=game.quota && !game.exit.active){
    game.exit.active=true; setMsg('QUOTA MET — EXIT OPEN!');
    crTriggerSoundCue('quotaExitReady');
  }
}
function tickExit(){
  if(!game.exit || !game.exit.active) return;
  const dx=game.exit.x-player.x, dy=game.exit.y-player.y;
  if(dx*dx+dy*dy<0.6) completeDistrict();
}
function completeDistrict(){
  if(game.run.customLevel){
    const timeBonus=Math.floor(game.timeLeft)*5;
    const leftover=player.cans*10;
    game.totalScore += Math.round((game.helped*100 + game.delivered*25 + leftover + timeBonus + 250)*game.scoreMult);
    setMsg('Hall Of Servants — mutual aid complete.');
    crTriggerSoundCue('districtComplete');
    completeRun();
    return;
  }
  const timeBonus=Math.floor(game.timeLeft)*5;
  const distBonus=game.district*200;
  const leftover=player.cans*10;
  game.totalScore += Math.round((game.helped*100 + game.delivered*25 + leftover + timeBonus + distBonus)*game.scoreMult);
  crTriggerSoundCue('districtComplete');
  state=STATE.UPGRADE;
  window._offered = rollUpgrades();
}

const ALL_UPGRADES=[
  {id:'pack',  name:'BIGGER BACKPACK', desc:'+6 can capacity'},
  {id:'sprint',name:'SPRINT CHARGE',    desc:'+1 block, faster recharge, longer burst'},
  {id:'hand',  name:'FASTER HANDOFF',   desc:'+range, +1 bonus, shorter cooldown'},
  {id:'map',   name:'BETTER MINIMAP',   desc:'reveal more info; size stays capped'},
  {id:'radar', name:'CAN RADAR PULSE',  desc:'periodic can ping on map'},
];
function rollUpgrades(){
  const pool=ALL_UPGRADES.slice(); const out=[];
  for(let i=0;i<3 && pool.length;i++){ out.push(pool.splice((RNG()*pool.length)|0,1)[0]); }
  return out;
}
function applyUpgrade(id){
  player.upgrades[id]=(player.upgrades[id]||0)+1;
  if(id==='pack') player.maxCans+=6;
  else if(id==='sprint'){ player.maxStamina+=mobileSprintCost(); player.stamina=player.maxStamina; player.regenBonus+=6; }
  else if(id==='hand'){ player.giveRange+=0.45; player.handoffBonus+=1; }
  else if(id==='map') player.minimapLevel=Math.min(3, player.minimapLevel+1);
  else if(id==='radar') player.radar=true;
}
function updateAim(){
  let best=null, bd=player.giveRange*player.giveRange;
  for(const n of game.npcs){
    if(n.helped) continue;
    const dx=n.x-player.x, dy=n.y-player.y, d=dx*dx+dy*dy;
    if(d<bd){
      if(!interactionLineClear(player.x, player.y, n.x, n.y).clear) continue;
      bd=d; best=n;
    }
  }
  game.aimNpc=best;
}

