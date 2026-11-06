import { roleAt, buildLimit, freeOfLimit, taxColor } from "../lib/roles.ts";
import type { GameView, Action } from "../lib/game.ts";
// A deterministic player using only the same private view available to a browser.
export function nextAction(v:GameView):Action {
  const p = v.players.find(p=>p.id===v.me)!, other = v.players.find(p=>p.id!==v.me)!;
  if (v.phase==="draft") return v.theaterPending ? {type:"skipTheater"} : {type:v.discardPending?"discardRole":"pick",slot:0};
  if (v.pending) {
    if (v.pending.kind==="warrant") return {type:v.warrants?.signed===v.role && !p.city.some(c=>c.key===v.pending!.card!.key)?"confiscate":"passReaction"};
    if (v.pending.kind==="bribe") return {type:"refuse"};
    if (v.pending.kind==="blackmail") return {type:"revealThreat"};
    return {type:"crown",target:v.players.find(x=>x.id!==v.me && x.id!==v.crown)!.id};
  }
  const t = v.turn!, rid = roleAt(v,v.role).id;
  if (t.choices.length) return {type:"chooseCard",card:t.choices[0].id};
  if (t.owed?.length) return {type:"seerGive",target:t.owed[0],card:p.hand[0].id};
  if (t.inspected?.kind==="wizard") return {type:"wizardTake",card:t.inspected.cards[0].id};
  if (!t.gathered) {
    const useful = p.hand.some(c=>c.key!=="secretvault" && (c.key!=="monument" || p.city.length<5) && !p.city.some(x=>x.key===c.key));
    return {type:useful && p.gold<12 ? "gold":"cards"};
  }
  if (rid===10) return {type:"bewitch",role:4};
  if ([11,13].includes(rid) && !t.used.includes("power")) {
    const ranks = Array.from({length:v.roleCount},(_,i)=>i+1).filter(r=>r>1 && r!==v.role && (rid===11 || (r!==v.killed && r!==v.bewitched))).slice(0,rid===11?3:2);
    return {type:rid===11?"warrants":"threats",ranks,role:ranks[0]};
  }
  if ([12,14,15].includes(rid) && !t.used.includes("power")) return {type:rid===12?"spy":rid===14?"wizard":"seer",target:other.id,color:"trade"};
  if (rid===16 && !t.used.includes("crown")) {
    const target=v.players.find(x=>x.id!==p.id && x.id!==v.crown)!;
    return {type:"crown",target:target.id,choice:target.gold || !target.handCount ? "gold":"card"};
  }
  if (taxColor(rid) && !t.used.includes("tax")) return {type:"tax"};
  if ([6,7,22,23].includes(rid) && !t.used.includes("bonus")) return {type:rid===22?"navigator":rid===23?"scholar":"bonus",choice:p.hand.length<4?"cards":"gold"};
  if (rid===27 && !t.used.includes("collect")) return {type:"collect"};
  const c = p.hand.find(c=>rid!==22 && c.key!=="secretvault" && (c.key!=="monument" || p.city.length<5) && Math.max(0,c.cost-(c.color==="unique" && p.city.some(x=>x.key==="factory")?1:0))<=p.gold && (rid===14 || p.city.some(x=>x.key==="quarry") || !p.city.some(x=>x.key===c.key)) && (freeOfLimit(rid,c) || t.built<buildLimit(rid)));
  return c ? {type:"build",card:c.id} : {type:"end"};
}
