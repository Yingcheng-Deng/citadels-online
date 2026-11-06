import test from "node:test";
import assert from "node:assert/strict";
import {newGame,newPlayer,addPlayer,apply,view,cardCatalog,roles,roleAt,type Card,type Game,type Action} from "../lib/game.ts";
import {nextAction} from "./test-player.ts";
const card=(key:string,id=key):Card=>({...cardCatalog.find(c=>c.key===key)!,id});
function game(n=5,mode:"classic"|"advanced"="advanced",cast?:number[]) {
  const g=newGame("ABCDEFGH",newPlayer("p0","s0","玩家0"),mode);
  for(let i=1;i<n;i++)addPlayer(g,newPlayer(`p${i}`,`s${i}`,`玩家${i}`));
  if(cast)apply(g,"p0",{type:"configure",mode,cast});
  g.players.forEach(p=>apply(g,p.id,{type:"ready"}));apply(g,"p0",{type:"start"});return g;
}
function turn(id:number,n=5) {
  const cast=Array.from({length:9},(_,i)=>i+1);const rank=roles[id-1].rank;cast[rank-1]=id;
  const g=game(n,"advanced",cast);g.phase="turn";g.role=rank;g.active="p0";
  g.players.forEach(p=>{p.roles=[];p.revealed=[];p.city=[];p.hand=[];p.gold=10;});
  g.players[0].roles=[rank];g.players[0].revealed=[rank];g.turn={gathered:false,built:0,used:[],choices:[],decorated:[]};return g;
}
const run=(g:Game,a:Action)=>apply(g,g.active,a);
const hasUsed=(g:Game,key:string)=>g.turn.used.includes(key);

test("classic preserves original cast and 3/8 Artist; advanced validates every rank and player restriction",()=>{
  for(let n=2;n<=8;n++){
    const classic=game(n,"classic");assert.deepEqual(classic.cast,Array.from({length:n===3||n===8?9:8},(_,i)=>i+1));
    for(let i=0;i<30;i++){
      const g=game(n);assert.equal(g.cast!.length,n===2?8:9);
      g.cast!.forEach((id,index)=>assert.equal(roles[id-1].rank,index+1));
      if(n===2)assert.ok(!g.cast!.includes(16));if(n<5)assert.ok(!g.cast!.includes(26));
    }
  }
  assert.throws(()=>game(2,"advanced",[1,2,3,16]),/人数/);
  assert.throws(()=>game(4,"advanced",[1,2,3,4,5,6,7,8,26]),/人数/);
});
test("first player manually discards before the first pick every two-player round without revealing identity",()=>{
  const g=game(2,"classic"),id=g.active,discard=g.available[2];
  assert.equal(g.available.length,8);assert.equal(g.initialDiscard,true);assert.equal(g.facedown,0);
  assert.throws(()=>run(g,{type:"pick",slot:0}),/步骤/);
  run(g,{type:"discardRole",slot:2});assert.equal(g.active,id);assert.equal(g.facedown,discard);assert.equal(g.available.length,7);
  assert.equal(g.players.reduce((n,p)=>n+p.roles.length,0),0);assert.ok(!JSON.stringify(view(g,id)).includes('"facedown"'));
  assert.equal(g.initialDiscard,false);run(g,{type:"pick",slot:0});assert.equal(g.players.find(p=>p.id===id)!.roles.length,1);
});
test("Merchant taxes after building a green district, once only; may also tax before gathering",()=>{
  const g=turn(6),p=g.players[0];p.city=[card("market")];p.hand=[card("tavern")];
  run(g,{type:"gold"});run(g,{type:"build",card:"tavern"});const before=p.gold;run(g,{type:"tax"});assert.equal(p.gold,before+2);assert.throws(()=>run(g,{type:"tax"}),/已使用/);
  const h=turn(6);h.players[0].city=[card("market")];run(h,{type:"tax"});assert.equal(h.players[0].gold,11);assert.equal(h.turn.gathered,false);
});
test("Witch gathers then suspends, victim only gathers, Witch resumes with own city and King's crown stays with victim",()=>{
  const g=turn(10);g.players[1].roles=[4];g.crown="p2";g.players[0].city=[card("castle")];
  assert.throws(()=>run(g,{type:"end"}),/采集/);run(g,{type:"gold"});run(g,{type:"bewitch",role:4});
  assert.equal(g.active,"p1");assert.equal(g.crown,"p1");assert.throws(()=>run(g,{type:"tax"}),/采集/);
  const gold=g.players[1].gold;run(g,{type:"gold"});assert.equal(g.players[1].gold,gold+2);assert.equal(g.active,"p0");
  run(g,{type:"tax"});assert.equal(g.players[0].gold,13);assert.equal(g.crown,"p1");
});
test("bewitched Bishop protects Witch's city and not victim's; Thief cannot target bewitched role",()=>{
  const g=turn(8);g.players[1].roles=[5];g.players[1].city=[card("temple")];g.players[2].city=[card("church")];
  g.witch={owner:"p2",target:5,turn:g.turn,resumed:true};
  assert.throws(()=>run(g,{type:"destroy",target:"p2",card:"church"}),/主教/);
  run(g,{type:"destroy",target:"p1",card:"temple"});assert.equal(g.players[1].city.length,0);
  const h=turn(2);h.witch={owner:"p2",target:4,turn:h.turn,resumed:false};assert.throws(()=>run(h,{type:"rob",role:4}),/巫术/);
});
test("Magistrate markers stay private, fake and real warrants both pause, refunds money and only first paid build eligible",()=>{
  const g=turn(11);run(g,{type:"warrants",ranks:[3,4,7],role:7});assert.equal(view(g,"p1").warrants!.signed,0);assert.equal(view(g,"p0").warrants!.signed,7);
  g.role=7;g.active="p1";g.turn={gathered:true,built:0,used:[],choices:[],decorated:[]};g.players[1].hand=[card("temple"),card("church")];
  run(g,{type:"build",card:"temple"});assert.equal(g.active,"p0");assert.equal(g.players[1].city.length,0);assert.equal(view(g,"p0").turn,null);
  run(g,{type:"confiscate"});assert.equal(g.active,"p1");assert.equal(g.players[1].gold,10);assert.equal(g.players[0].city[0].key,"temple");assert.equal(g.turn.built,1);
  run(g,{type:"build",card:"church"});assert.equal(g.pending,undefined);
  const h=turn(11);run(h,{type:"warrants",ranks:[3,4,7],role:7});h.role=4;h.active="p1";h.turn.gathered=true;h.players[1].hand=[card("temple")];run(h,{type:"build",card:"temple"});assert.equal(h.pending!.kind,"warrant");assert.throws(()=>run(h,{type:"confiscate"}),/真正/);run(h,{type:"passReaction"});assert.equal(h.players[1].city.length,1);
});
test("free Framework build bypasses warrant, next paid build remains eligible; confiscated Den refunds only gold",()=>{
  const g=turn(7);g.warrants={owner:"p1",marked:[3,6,7],signed:7,used:false};g.turn.gathered=true;
  g.players[0].city=[card("framework")];g.players[0].hand=[card("temple"),card("den"),card("church")];
  run(g,{type:"build",card:"temple",sacrifice:"framework"});assert.equal(g.pending,undefined);
  run(g,{type:"build",card:"den",cards:["church"]});assert.equal(g.pending!.paid,5);run(g,{type:"confiscate"});assert.equal(g.players[0].gold,10);assert.ok(g.deck.some(c=>c.id==="church"));
});
test("Spy sees only chosen hand, gains cards for every match even if victim cannot pay",()=>{
  const g=turn(12);g.players[1].gold=1;g.players[1].hand=[card("tavern"),card("market"),card("temple")];
  run(g,{type:"spy",target:"p1",color:"trade"});assert.equal(g.players[0].gold,11);assert.equal(g.players[0].hand.length,2);assert.equal(g.players[1].gold,0);
  assert.equal(view(g,"p0").turn!.inspected!.cards.length,3);assert.equal(view(g,"p2").turn,null);
});
test("Blackmailer resolves only after gathering; bribes, real and fake refusals, and private target",()=>{
  for(const outcome of ["bribe","real","fake"]){
    const g=turn(13);run(g,{type:"threats",ranks:[3,4],role:3});assert.equal(view(g,"p1").threats!.real,0);
    g.role=outcome==="fake"?4:3;g.active="p1";g.turn={gathered:false,built:0,used:[],choices:[],decorated:[]};
    run(g,{type:"gold"});assert.equal(g.pending!.kind,"bribe");assert.throws(()=>run(g,{type:"end"}),/威胁/);
    if(outcome==="bribe"){run(g,{type:"bribe"});assert.equal(g.players[1].gold,6);}
    else {run(g,{type:"refuse"});assert.equal(g.active,"p0");run(g,{type:"revealThreat"});assert.equal(g.players[1].gold,outcome==="real"?0:12);}
    assert.equal(g.active,"p1");assert.ok(hasUsed(g,"threatResolved"));assert.equal(g.pending,undefined);
  }
});
test("Wizard builds stolen card beyond limit, can build duplicates this turn; Seer returns exactly to affected players",()=>{
  const g=turn(14);g.turn.gathered=true;g.turn.built=1;g.players[0].city=[card("temple","existing")];g.players[1].hand=[card("temple","stolen")];
  run(g,{type:"wizard",target:"p1"});run(g,{type:"wizardBuild",card:"stolen"});assert.equal(g.players[0].city.length,2);assert.equal(g.turn.built,1);assert.equal(g.players[1].hand.length,0);
  const h=turn(15);h.players[1].hand=[card("temple")];h.players[3].hand=[card("church")];run(h,{type:"seer"});assert.deepEqual(h.turn.owed,["p1","p3"]);assert.throws(()=>run(h,{type:"gold"}),/归还/);run(h,{type:"seerGive",target:"p1",card:"church"});run(h,{type:"seerGive",target:"p3",card:"temple"});assert.equal(h.players[1].hand[0].key,"church");assert.deepEqual(h.turn.owed,[]);
});
test("Emperor transfers crown and resource; killed Emperor's end-round handoff charges no resource",()=>{
  const g=turn(16);g.crown="p1";run(g,{type:"crown",target:"p2",choice:"gold"});assert.equal(g.crown,"p2");assert.equal(g.players[2].gold,9);assert.equal(g.players[0].gold,11);
  const h=turn(8);h.cast![3]=16;h.players[1].roles=[4];h.crown="p2";h.killed=4;h.turn.gathered=true;run(h,{type:"end"});assert.equal(h.pending!.kind,"emperor");run(h,{type:"crown",target:"p3"});assert.equal(h.crown,"p3");assert.equal(h.players[3].gold,10);assert.equal(h.phase,"draft");
});
test("Patrician and Cardinal gain cards; Abbot chooses split and richest player only once",()=>{
  for(const [id,key] of [[17,"castle"],[19,"temple"]] as const){const g=turn(id);g.players[0].city=[card(key),card("school")];run(g,{type:"tax"});assert.equal(g.players[0].gold,10);assert.equal(g.players[0].hand.length,2);}
  const g=turn(18);g.players[0].city=[card("temple"),card("school")];run(g,{type:"tax",gold:1});assert.equal(g.players[0].gold,11);assert.equal(g.players[0].hand.length,1);g.players[2].gold=15;run(g,{type:"abbot",target:"p2"});assert.equal(g.players[0].gold,12);assert.throws(()=>run(g,{type:"abbot",target:"p2"}),/已使用/);
});
test("Cardinal exchanges exact shortfall for cards and immediately builds; cannot borrow unnecessary gold",()=>{
  const g=turn(19);g.turn.gathered=true;g.players[0].gold=1;g.players[0].hand=[card("manor"),card("temple"),card("church")];
  run(g,{type:"build",card:"manor",target:"p1",cards:["temple","church"]});assert.equal(g.players[0].gold,0);assert.equal(g.players[1].gold,8);assert.equal(g.players[1].hand.length,2);assert.equal(g.players[0].city[0].key,"manor");
});
test("Alchemist refunds building only, after Poor House; Trader's greens do not consume limit",()=>{
  const g=turn(20);g.turn.gathered=true;g.players[0].gold=1;g.players[0].city=[card("poorhouse")];g.players[0].hand=[card("temple")];run(g,{type:"build",card:"temple"});run(g,{type:"end"});assert.equal(g.players[0].gold,2);
  const h=turn(21);h.turn.gathered=true;h.players[0].hand=[card("temple"),card("tavern"),card("market")];for(const c of [...h.players[0].hand])run(h,{type:"build",card:c.id});assert.equal(h.players[0].city.length,3);assert.equal(h.turn.built,1);
});
test("Navigator never builds even Stables; Scholar chooses one and shuffles remainder, building limit two",()=>{
  const g=turn(22);g.turn.gathered=true;g.players[0].hand=[card("stables")];run(g,{type:"navigator",choice:"gold"});assert.equal(g.players[0].gold,14);assert.throws(()=>run(g,{type:"build",card:"stables"}),/禁止/);
  const h=turn(23);const before=h.deck.length;run(h,{type:"scholar"});assert.equal(h.turn.choices.length,7);run(h,{type:"chooseCard",card:h.turn.choices[0].id});assert.equal(h.players[0].hand.length,1);assert.equal(h.deck.length,before-1);assert.equal(h.turn.choiceKind,undefined);
});
test("Diplomat swaps decorated Museum with contents and pays difference plus Wall; Marshal respects cost and defenses",()=>{
  const g=turn(24);g.players[0].city=[card("temple")];g.players[1].city=[{...card("museum"),decorated:true,stored:[card("castle")]},card("greatwall")];
  run(g,{type:"exchangeDistrict",target:"p1",card:"museum",sacrifice:"temple"});assert.equal(g.players[0].gold,5);assert.equal(g.players[1].gold,15);assert.equal(g.players[0].city[0].stored!.length,1);assert.equal(g.players[0].city[0].decorated,true);
  const h=turn(25);h.players[1].city=[card("manor"),card("greatwall")];run(h,{type:"seize",target:"p1",card:"manor"});assert.equal(h.players[0].gold,6);assert.equal(h.players[1].gold,14);
  for(const rid of [24,25]){const k=turn(rid);k.players[0].city=[card("temple")];k.players[1].city=[card("keep")];assert.throws(()=>run(k,{type:rid===24?"exchangeDistrict":"seize",target:"p1",card:"keep",sacrifice:"temple"}),/保护/);}
});
test("Queen gains adjacency gold including assassinated rank four at round end",()=>{
  const g=turn(8);g.cast![8]=26;g.players[1].roles=[9];g.players[2].roles=[4];g.players[2].revealed=[4];g.turn.gathered=true;run(g,{type:"end"});assert.equal(g.active,"p1");assert.equal(g.players[1].gold,13);
  const h=turn(8);h.cast![8]=26;h.players[1].roles=[9];h.players[2].roles=[4];h.killed=4;h.turn.gathered=true;run(h,{type:"end"});assert.equal(h.players[1].gold,10);run(h,{type:"gold"});run(h,{type:"end"});assert.equal(h.players[1].gold,15);
});
test("Tax Collector charges every building when possible, carries pool, exempts only own role and taxes confiscator",()=>{
  const g=turn(7);g.cast![8]=27;g.turn.gathered=true;g.players[0].hand=[card("temple"),card("church")];run(g,{type:"build",card:"temple"});assert.equal(g.taxPool,1);assert.equal(g.players[0].gold,8);g.players[0].gold=2;run(g,{type:"build",card:"church"});assert.equal(g.taxPool,1);run(g,{type:"end"});assert.equal(g.taxPool,1);
  const h=turn(27);h.taxPool=5;run(h,{type:"collect"});assert.equal(h.players[0].gold,15);h.turn.gathered=true;h.players[0].hand=[card("temple")];run(h,{type:"build",card:"temple"});assert.equal(h.taxPool,0);
});
test("advanced full games 2–8 players use private views, conserve cards across reactions, and finish",()=>{
  const seen=new Set<number>();
  for(let n=2;n<=8;n++)for(let variant=0;variant<4;variant++){
    const cast=variant<3?Array.from({length:n===2?8:9},(_,i)=>roles.filter(r=>r.rank===i+1 && !(n===2&&r.id===16) && !(n<5&&r.id===26))[variant%roles.filter(r=>r.rank===i+1 && !(n===2&&r.id===16) && !(n<5&&r.id===26)).length].id):undefined;
    const g=game(n,"advanced",cast);g.cast!.forEach(id=>seen.add(id));
    let steps=0;while(g.phase!=="finished" && steps++<5000){
      const v=view(g,g.active);const a=nextAction(v);
      try{run(g,a);}catch(e){throw new Error(JSON.stringify({n,variant,role:g.role,id:roleAt(g,g.role)?.id,action:a,error:String(e)}));}
      const cards=[...g.deck,...g.turn.choices,...g.players.flatMap(p=>[...p.hand,...p.city,...p.city.flatMap(c=>c.stored || [])]),...(g.pending?.card?[g.pending.card]:[])];
      assert.equal(cards.length,68);assert.equal(new Set(cards.map(c=>c.id)).size,68);assert.ok(g.players.every(p=>p.gold>=0));
    }
    assert.equal(g.phase,"finished",`${n} players, variant ${variant}`);assert.equal(g.scores.length,n);
  }
  assert.equal(seen.size,27);
});
