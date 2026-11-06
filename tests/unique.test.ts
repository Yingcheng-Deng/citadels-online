import test from "node:test";
import assert from "node:assert/strict";
import { newGame, newPlayer, addPlayer, apply, view, newDeck, cardCatalog, citySize, score, type Card, type Game } from "../lib/game.ts";
const card = (key: string): Card => ({ ...cardCatalog.find((c) => c.key === key)!, id: `${key}-0` });
function game(n = 4) {
  const g = newGame("ABCDEFGH", newPlayer("p0", "token-0", "甲"));
  for (let i = 1; i < n; i++) addPlayer(g, newPlayer(`p${i}`, `token-${i}`, `朋友${i}`));
  for (const p of g.players) apply(g, p.id, { type: "ready" });
  apply(g, "p0", { type: "start" });
  return g;
}
function turn(role = 6) {
  const g = game();
  g.phase = "turn"; g.active = "p0"; g.role = role;
  for (const p of g.players) { p.hand = []; p.city = []; p.roles = []; p.revealed = []; }
  g.players[0].roles = [role]; g.players[0].gold = 20;
  return g;
}
const run = (g: Game, action: Parameters<typeof apply>[2]) => apply(g, g.active, action);
const build = (g: Game, key: string, sacrifice?: string) => run(g, { type: "build", card: `${key}-0`, sacrifice });

test("all 30 unique districts are eligible; each new game selects 14 without replacement and retains 54 basics", () => {
  assert.equal(cardCatalog.filter((c) => c.color === "unique").length, 30);
  const union = new Set<string>();
  const combinations = new Set<string>();
  for (let i = 0; i < 60; i++) {
    const g = game(4 + i % 5);
    const cards = [...g.deck, ...g.players.flatMap((p) => p.hand)];
    const unique = cards.filter((c) => c.color === "unique");
    assert.equal(cards.length, 68); assert.equal(unique.length, 14);
    assert.equal(new Set(unique.map((c) => c.key)).size, 14);
    assert.equal(cards.filter((c) => c.color !== "unique").length, 54);
    assert.ok(unique.some((c) => c.cost <= 3)); assert.ok(unique.some((c) => c.cost === 4)); assert.ok(unique.some((c) => c.cost >= 5));
    assert.deepEqual(g.uniqueKeys, unique.map((c) => c.key).sort());
    assert.deepEqual(view(g, g.players[1].id).uniqueKeys, g.uniqueKeys);
    unique.forEach((c) => union.add(c.key)); combinations.add(g.uniqueKeys!.join(","));
    const restored = JSON.parse(JSON.stringify(g));
    assert.deepEqual(view(restored, "p0").uniqueKeys, g.uniqueKeys);
  }
  assert.equal(union.size, 30); assert.ok(combinations.size > 1);
  assert.throws(() => newDeck(["dragon"]), /14/);
  assert.throws(() => newDeck(Array(14).fill("dragon")), /14/);
});

test("new games reset the catalog selection; existing snapshots load without new fields", () => {
  const g = game();
  g.phase = "finished";
  apply(g, "p0", {type:"rematch"});
  for (const p of g.players) apply(g,p.id,{type:"ready"});
  apply(g,"p0",{type:"start"});
  assert.equal(g.uniqueKeys?.length,14);
  const legacy = structuredClone(g); delete legacy.uniqueKeys; delete legacy.theaterPending;
  assert.deepEqual(view(legacy,"p0").uniqueKeys, g.uniqueKeys);
});

test("Gold Mine and Observatory modify gathering, Library keeps every drawn card", () => {
  const g = turn(); const p = g.players[0]; p.city = [card("goldmine")]; p.gold = 0;
  run(g,{type:"gold"}); assert.equal(p.gold,3); assert.throws(() => run(g,{type:"gold"}), /已采集/);
  const h = turn(); h.players[0].city = [card("observatory")];
  run(h,{type:"cards"}); assert.equal(h.turn.choices.length,3);
  assert.equal(view(h,"p1").turn,null);
  run(h,{type:"chooseCard",card:h.turn.choices[1].id}); assert.equal(h.players[0].hand.length,1);
  const k = turn(); k.players[0].city = [card("observatory"),card("library")];
  run(k,{type:"cards"}); assert.equal(k.players[0].hand.length,3); assert.equal(k.turn.choices.length,0);
});

test("Park and Poor House trigger at the end of each role turn only when empty", () => {
  const g = turn(); const p = g.players[0]; p.city = [card("park"),card("poorhouse")]; p.gold = 0; g.turn.gathered = true;
  run(g,{type:"end"}); assert.equal(p.hand.length,2); assert.equal(p.gold,1);
  const h = turn(); const q = h.players[0]; q.city = [card("park"),card("poorhouse")]; q.gold = 2; q.hand = [card("manor")]; h.turn.gathered = true;
  run(h,{type:"end"}); assert.equal(q.hand.length,1); assert.equal(q.gold,2);
});

test("Stables can be built after normal build limit and Secret Vault cannot be built", () => {
  const g = turn(); const p = g.players[0]; p.hand = [card("temple"),card("stables"),card("secretvault")]; g.turn.gathered=true;
  build(g,"temple"); build(g,"stables"); assert.equal(g.turn.built,1); assert.equal(p.city.length,2);
  assert.throws(() => build(g,"secretvault"),/不能建造/);
  assert.equal(score(g,p).special,3);
});

test("Monument limits actual city size but adds two toward completion and protection", () => {
  const g = turn(7); const p = g.players[0]; p.city = ["manor","temple","tavern","watchtower"].map(card); p.hand = [card("monument"),card("church")]; g.turn.gathered=true;
  build(g,"monument"); assert.equal(citySize(p),6); assert.equal(g.firstComplete,"");
  build(g,"church"); assert.equal(citySize(p),7); assert.equal(g.firstComplete,p.id); assert.equal(score(g,p).completion,4);
  assert.equal(view(g,p.id).players[0].cityCount,7);
  const h = turn(); h.players[0].city = ["manor","temple","tavern","watchtower","church"].map(card); h.players[0].hand=[card("monument")];h.turn.gathered=true;
  assert.throws(() => build(h,"monument"),/5/);
  g.role=8; g.active="p1"; g.players[1].gold=20;
  assert.throws(() => run(g,{type:"destroy",target:p.id,card:"temple-0"}),/完工/);
});

test("Framework and Necropolis sacrifice a district instead of paying, still using build limit", () => {
  const g=turn();const p=g.players[0];p.city=[card("framework")];p.hand=[card("palace")];p.gold=0;g.turn.gathered=true;
  build(g,"palace","framework-0"); assert.equal(p.gold,0);assert.deepEqual(p.city.map((c)=>c.key),["palace"]);assert.equal(g.turn.built,1);assert.equal(g.deck.at(-1)?.key,"framework");
  const h=turn();const q=h.players[0];q.city=[card("museum")];q.city[0].stored=[card("church")];q.hand=[card("necropolis")];q.gold=0;h.turn.gathered=true;
  build(h,"necropolis","museum-0");assert.deepEqual(q.city.map((c)=>c.key),["necropolis"]);assert.deepEqual(h.deck.slice(-2).map((c)=>c.key),["museum","church"]);
  const k=turn();k.players[0].city=[card("temple")];k.players[0].hand=[card("palace")];k.turn.gathered=true;
  assert.throws(()=>build(k,"palace","temple-0"),/只能/);
});

test("Great Wall adds a coin only for other districts and beauty remains part of cost", () => {
  const g=turn(8);const p=g.players[0];const q=g.players[1];q.city=[card("greatwall"),{...card("temple"),decorated:true}];p.gold=2;
  run(g,{type:"destroy",target:q.id,card:"temple-0"});assert.equal(p.gold,0);
  const h=turn(8);h.players[1].city=[card("greatwall")];h.players[0].gold=5;
  run(h,{type:"destroy",target:"p1",card:"greatwall-0"});assert.equal(h.players[0].gold,0);
});

test("Armory can destroy Keep and Bishop districts but not completed cities", () => {
  const g=turn();g.players[0].city=[card("armory")];g.players[1].city=[card("keep")];g.players[1].roles=[5];
  run(g,{type:"armory",target:"p1",card:"keep-0"});assert.equal(g.players[0].city.length,0);assert.equal(g.players[1].city.length,0);
  const h=turn();h.players[0].city=[card("armory")];h.players[1].city=["manor","temple","tavern","watchtower","church","monument"].map(card);
  assert.throws(()=>run(h,{type:"armory",target:"p1",card:"temple-0"}),/完工/);assert.equal(h.players[0].city.length,1);
});

test("Museum hides stored identities, limits deposits per turn, scores and returns them on destruction", () => {
  const g=turn();const p=g.players[0];p.city=[card("museum")];p.hand=[card("secretvault"),card("manor")];
  run(g,{type:"museum",card:"secretvault-0"});assert.equal(p.hand.length,1);assert.equal(score(g,p).special,1);
  assert.throws(()=>run(g,{type:"museum",card:"manor-0"}),/已使用/);
  const publicMuseum=view(g,"p1").players[0].city[0];assert.equal(publicMuseum.storedCount,1);assert.ok(!("stored" in publicMuseum));assert.ok(!JSON.stringify(publicMuseum).includes("secretvault"));
  g.role=8;g.active="p1";g.players[1].gold=20;
  run(g,{type:"destroy",target:p.id,card:"museum-0"});assert.deepEqual(g.deck.slice(-2).map((c)=>c.key),["museum","secretvault"]);assert.equal(g.deck.at(-2)?.stored,undefined);
});

test("Basilica, Capitol, Ivory Tower, Vault and Haunted Quarter score their interactions", () => {
  const g=turn();const p=g.players[0];p.city=[card("basilica"),card("manor"),{...card("temple"),decorated:true}];assert.equal(score(g,p).special,1);
  p.city=[card("capitol"),card("manor"),card("castle"),card("palace"),card("tavern"),card("market"),card("trading")];assert.equal(score(g,p).special,3);
  p.city=[card("ivorytower"),card("haunted")];assert.equal(score(g,p).special,5);assert.notEqual(score(g,p).hauntedType,"unique");
  p.city=[card("manor"),card("temple"),card("tavern"),card("haunted"),card("well")];assert.equal(score(g,p).variety,3);assert.equal(score(g,p).special,1);
  p.city=[card("ivorytower"),card("manor"),card("temple"),card("tavern"),card("haunted")];p.hand=[card("secretvault")];assert.equal(score(g,p).special,8);assert.equal(score(g,p).variety,3);
});

test("Theater pauses before roles are called and privately swaps exactly one role for 2–8 players", () => {
  for(const n of [2,3,4,5,6,7,8]) {
    const g=game(n);g.players[0].city=[card("theater")];
    while(g.phase==="draft" && !g.theaterPending)run(g,{type:g.discardPending?"discardRole":"pick",slot:0});
    assert.equal(g.active,"p0");assert.equal(g.role,0);assert.equal(g.theaterPending,"p0");
    assert.ok(g.players.every((p)=>p.revealed.length===0));
    const own=[...g.players[0].roles],other=[...g.players[1].roles];
    assert.throws(()=>apply(g,"p1",{type:"theater",role:other[0],target:"p0"}),/等待/);
    assert.throws(()=>run(g,{type:"theater",role:99,target:"p1"}),/自己/);
    run(g,{type:"theater",role:own[0],target:"p1"});
    assert.equal(g.phase,"turn");assert.equal(g.theaterPending,"");
    assert.ok(g.players[1].roles.includes(own[0]));assert.ok(g.players[0].roles.some((r)=>other.includes(r)));
    assert.equal(g.players[0].roles.length,n<=3?2:1);
    for(const p of view(g,"p2" in Object.fromEntries(g.players.map((p)=>[p.id,true]))?"p2":"p1").players) {
      if(p.id!== (n>=3?"p2":"p1")) assert.deepEqual(p.roles,p.revealed);
    }
  }
});

test("Theater can be skipped without altering selected roles", () => {
  const g=game();g.players[0].city=[card("theater")];
  while(!g.theaterPending)run(g,{type:"pick",slot:0});
  const before=g.players.map((p)=>[...p.roles]);run(g,{type:"skipTheater"});assert.deepEqual(g.players.map((p)=>p.roles),before);assert.equal(g.phase,"turn");
});
