import test from "node:test";
import assert from "node:assert/strict";
import {
  newGame,
  newPlayer,
  addPlayer,
  apply,
  view,
  newDeck,
  cardCatalog,
  citySize,
  score,
  type Game,
  type Card,
} from "../lib/game.ts";
function game(n = 2) {
  const g = newGame("ABCDEFGH", newPlayer("p0", "secret0", "小林"));
  for (let i = 1; i < n; i++)
    addPlayer(g, newPlayer(`p${i}`, `secret${i}`, `朋友${i}`));
  g.players.forEach((p) => apply(g, p.id, { type: "ready" }));
  apply(g, "p0", { type: "start" });
  return g;
}
function card(key: string): Card {
  return { ...cardCatalog.find((c) => c.key === key)!, id: `${key}-0` };
}
function turn(role: number, n = 2) {
  const g = game(n);
  g.phase = "turn";
  g.role = role;
  g.active = "p0";
  g.players.forEach((p) => {
    p.roles = [];
    p.revealed = [];
    p.hand = [];
    p.city = [];
  });
  g.players[0].roles = [role];
  g.players[0].revealed = [role];
  g.players[0].gold = 20;
  return g;
}
function run(g: Game, a: Parameters<typeof apply>[2]) {
  apply(g, g.active, a);
}
function conserve(g: Game) {
  const cards = [
    ...g.deck,
    ...g.turn.choices,
    ...g.players.flatMap((p) => [...p.hand, ...p.city, ...p.city.flatMap((c) => c.stored || [])]),
  ];
  assert.equal(cards.length, 68);
  assert.equal(new Set(cards.map((c) => c.id)).size, 68);
  g.players.forEach((p) => assert.ok(p.gold >= 0));
}
test("68-card starting deck and exact distributions", () => {
  const cards = newDeck();
  assert.equal(cards.length, 68);
  assert.equal(cards.filter((c) => c.color === "unique").length, 14);
  assert.equal(cards.filter((c) => c.key === "manor").length, 5);
});
test("two-player draft has explicit discard after second and third picks", () => {
  const g = game();
  const seen: number[] = [];
  while (g.phase === "draft") {
    seen.push(g.available.length);
    run(g, {
      type: g.discardPending ? "discardRole" : "pick",
      slot: 0,
    });
  }
  assert.deepEqual(seen, [7, 6, 5, 4, 3, 2]);
  assert.deepEqual(
    g.players.map((p) => p.roles.length),
    [2, 2],
  );
  assert.equal(g.target, 8);
});
test("three-player draft has a random discard after the third selection", () => {
  const g = game(3);
  const seen: number[] = [];
  while (g.phase === "draft") {
    seen.push(g.available.length);
    assert.equal(g.discardPending, false);
    run(g, { type: "pick", slot: 0 });
  }
  assert.deepEqual(seen, [8, 7, 6, 4, 3, 2]);
  assert.deepEqual(
    g.players.map((p) => p.roles.length),
    [2, 2, 2],
  );
  assert.equal(g.roleCount, 9);
});
test("4–8 player draft rules, king never face-up, final seat gets dark card", () => {
  for (let n = 4; n <= 8; n++) {
    for (let repeat = 0; repeat < 20; repeat++) {
      const g = game(n);
      assert.ok(!g.faceup.includes(4));
      assert.equal(g.faceup.length, Math.max(0, g.roleCount - n - 2));
      while (g.phase === "draft") {
        if (n >= 7 && g.draftIndex === n - 1)
          assert.equal(g.available.length, 2);
        run(g, { type: "pick", slot: 0 });
      }
      assert.ok(g.players.every((p) => p.roles.length === 1));
      assert.equal(g.target, 7);
    }
  }
});
test("unauthorized player cannot act or see secrets", () => {
  const g = game();
  const other = g.players.find((p) => p.id !== g.active)!;
  assert.throws(
    () => apply(g, other.id, { type: "pick", slot: 0 }),
    /等待/,
  );
  const v = view(g, other.id);
  assert.deepEqual(v.draftSlots, []);
  assert.deepEqual(v.players.find((p) => p.id !== other.id)!.hand, []);
  const text = JSON.stringify(v);
  assert.ok(!text.includes('"secret":'));
  for (const player of g.players) assert.ok(!text.includes(player.secret));
  assert.ok(!("deck" in v));
  assert.throws(() => view(g, "outsider"));
});
test("blind draft exposes only positions, reveals a picked role only to its owner", () => {
  const g = game();
  const id = g.active;
  const other = g.players.find((p) => p.id !== id)!;
  const before = view(g, id);
  assert.deepEqual(before.draftSlots, g.available.map((_, i) => i));
  assert.ok(!("available" in before));
  assert.ok(!("facedown" in before));
  // Changing every position's identity cannot change the client's view.
  g.available.reverse();
  assert.deepEqual(view(g, id), before);
  assert.deepEqual(view(JSON.parse(JSON.stringify(g)), id), before);
  const chosen = g.available[2];
  apply(g, id, { type: "pick", slot: 2 });
  assert.deepEqual(view(g, id).players.find((p) => p.id === id)!.roles, [chosen]);
  assert.deepEqual(view(g, other.id).players.find((p) => p.id === id)!.roles, []);
  assert.ok(!g.available.includes(chosen));
});

test("blind draft rejects role identities and invalid positions without changing state", () => {
  const g = game();
  for (const slot of [undefined, -1, 0.5, NaN, Infinity, g.available.length, "0", null]) {
    const before = JSON.stringify(g);
    assert.throws(() => run(g, { type: "pick", slot: slot as number }), /有效/);
    assert.equal(JSON.stringify(g), before);
  }
  const before = JSON.stringify(g);
  assert.throws(() => run(g, { type: "pick", role: g.available[0] }), /刷新/);
  assert.throws(() => run(g, { type: "pick", role: g.available[0], slot: 0 }), /刷新/);
  assert.equal(JSON.stringify(g), before);
});

test("blind discard removes a position without revealing or assigning its role", () => {
  const g = game();
  run(g, { type: "pick", slot: 0 });
  run(g, { type: "pick", slot: 0 });
  assert.equal(g.discardPending, true);
  const discarded = g.available[1];
  const assigned = g.players.map((p) => [...p.roles]);
  const log = [...g.log];
  run(g, { type: "discardRole", slot: 1 });
  assert.ok(!g.available.includes(discarded));
  assert.deepEqual(g.players.map((p) => p.roles), assigned);
  assert.deepEqual(g.log, log);
  for (const p of g.players)
    assert.ok(view(g, p.id).players.every((other) => !other.roles.includes(discarded)));
});

test("hand views group colors, costs and matching buildings without changing card identity or game order", () => {
  const g = game();
  const p = g.players[0];
  const market1 = { ...card("market"), id: "market-1" };
  const market2 = { ...card("market"), id: "market-2" };
  const tradingPost = newDeck().find((c) => c.color === "trade" && c.cost === 2 && c.key !== "market")!;
  p.hand = [card("library"), market2, card("palace"), tradingPost, card("temple"), card("manor"), market1];
  const original = structuredClone(p.hand);
  const hand = view(g, p.id).players[0].hand;
  assert.deepEqual(hand.map((c) => c.color), ["noble", "noble", "religious", "trade", "trade", "trade", "unique"]);
  assert.deepEqual(hand.slice(0, 2).map((c) => c.key), ["manor", "palace"]);
  const markets = hand.flatMap((c, i) => c.key === "market" ? [i] : []);
  assert.equal(markets[1] - markets[0], 1);
  assert.deepEqual(new Set(hand.map((c) => c.id)), new Set(original.map((c) => c.id)));
  assert.deepEqual(p.hand, original);
  assert.deepEqual(view(g, g.players[1].id).players[0].hand, []);
  p.hand.push(card("church"));
  const refreshed = view(g, p.id).players[0].hand;
  assert.deepEqual(refreshed.filter((c) => c.color === "religious").map((c) => c.key), ["temple", "church"]);
  p.hand = [market2, card("manor")];
  assert.deepEqual(view(g, p.id).players[0].hand.map((c) => c.key), ["manor", "market"]);
});

test("assassination skips a role without revealing its holder", () => {
  const g = turn(1);
  g.players[1].roles = [4, 6];
  run(g, { type: "kill", role: 4 });
  run(g, { type: "gold" });
  run(g, { type: "end" });
  assert.equal(g.role, 6);
  assert.deepEqual(g.players[1].revealed, [6]);
  g.firstComplete = "p0";
  run(g, { type: "gold" });
  run(g, { type: "end" });
  assert.equal(g.crown, "p1");
  assert.ok(g.players[1].revealed.includes(4));
});
test("thief transfers gold before target gathers resources", () => {
  const g = turn(2);
  g.players[1].roles = [6];
  g.players[1].gold = 7;
  run(g, { type: "rob", role: 6 });
  run(g, { type: "gold" });
  run(g, { type: "end" });
  assert.equal(g.players[1].gold, 0);
  assert.equal(g.players[0].gold, 29);
  run(g, { type: "gold" });
  assert.equal(g.players[1].gold, 2);
});
test("thief cannot select assassin or assassinated character", () => {
  let g = turn(2);
  assert.throws(() => run(g, { type: "rob", role: 1 }));
  g.killed = 4;
  assert.throws(() => run(g, { type: "rob", role: 4 }));
});
test("resource selection hides pending cards and returns rejected card to bottom", () => {
  const g = turn(6);
  const before = g.deck.length;
  run(g, { type: "cards" });
  assert.equal(g.turn.choices.length, 2);
  assert.equal(view(g, "p1").turn, null);
  const rejected = g.turn.choices[1];
  run(g, { type: "chooseCard", card: g.turn.choices[0].id });
  assert.equal(g.deck.at(-1)!.id, rejected.id);
  assert.equal(g.deck.length, before - 1);
  assert.throws(() => run(g, { type: "gold" }));
});
test("library retains both gathered cards", () => {
  const g = turn(6);
  g.players[0].city = [card("library")];
  run(g, { type: "cards" });
  assert.equal(g.players[0].hand.length, 2);
  assert.equal(g.turn.choices.length, 0);
});
test("tax may be taken after construction, school counts, tax once", () => {
  const g = turn(4);
  g.players[0].city = [card("school")];
  g.players[0].hand = [card("manor")];
  run(g, { type: "gold" });
  run(g, { type: "build", card: g.players[0].hand[0].id });
  const before = g.players[0].gold;
  run(g, { type: "tax" });
  assert.equal(g.players[0].gold, before + 2);
  assert.throws(() => run(g, { type: "tax" }));
});
test("architect builds three; duplicate restriction and quarry", () => {
  const g = turn(7);
  g.players[0].hand = [
    card("temple"),
    card("manor"),
    card("castle"),
    card("church"),
  ];
  run(g, { type: "gold" });
  for (const c of [...g.players[0].hand].slice(0, 3))
    run(g, { type: "build", card: c.id });
  assert.throws(
    () => run(g, { type: "build", card: g.players[0].hand[0].id }),
    /次数/,
  );
  const h = turn(7);
  h.players[0].city = [card("manor")];
  h.players[0].hand = [{ ...card("manor"), id: "manor-1" }];
  run(h, { type: "gold" });
  assert.throws(() => run(h, { type: "build", card: "manor-1" }), /同名/);
  h.players[0].city.push(card("quarry"));
  run(h, { type: "build", card: "manor-1" });
  assert.equal(h.players[0].city.length, 3);
});
test("magician swaps all cards, including empty hand", () => {
  const g = turn(3);
  g.players[1].hand = [card("temple")];
  run(g, { type: "swap", target: "p1" });
  assert.equal(g.players[0].hand.length, 1);
  assert.equal(g.players[1].hand.length, 0);
});
test("magician discards to bottom before gaining replacement cards", () => {
  const g = turn(3);
  g.players[0].hand = [card("temple")];
  g.deck = [card("manor")];
  run(g, { type: "redraw", cards: [g.players[0].hand[0].id] });
  assert.equal(g.players[0].hand[0].key, "manor");
  assert.equal(g.deck.at(-1)!.key, "temple");
});
test("warlord cannot attack bishop, completed city, or keep; can destroy own", () => {
  const g = turn(8);
  g.players[1].roles = [5];
  g.players[1].city = [card("manor")];
  assert.throws(
    () =>
      run(g, { type: "destroy", target: "p1", card: g.players[1].city[0].id }),
    /主教/,
  );
  g.killed = 5;
  g.players[1].city = [card("keep")];
  assert.throws(
    () =>
      run(g, { type: "destroy", target: "p1", card: g.players[1].city[0].id }),
    /堡垒/,
  );
  g.players[1].city = Array.from({ length: 8 }, () => card("manor"));
  assert.throws(
    () =>
      run(g, { type: "destroy", target: "p1", card: g.players[1].city[0].id }),
    /完工/,
  );
  g.players[0].city = [card("temple")];
  run(g, { type: "destroy", target: "p0", card: g.players[0].city[0].id });
  assert.equal(g.players[0].city.length, 0);
});
test("artist decorates at most two different buildings; cost updates", () => {
  const g = turn(9, 3);
  g.players[0].city = [card("manor"), card("castle"), card("palace")];
  run(g, { type: "decorate", card: g.players[0].city[0].id });
  assert.throws(() =>
    run(g, { type: "decorate", card: g.players[0].city[0].id }),
  );
  run(g, { type: "decorate", card: g.players[0].city[1].id });
  assert.throws(() =>
    run(g, { type: "decorate", card: g.players[0].city[2].id }),
  );
  assert.equal(score(g, g.players[0]).buildings, 14);
});
test("factory discount and den card payments; no overspend or duplicate payment", () => {
  const g = turn(7);
  g.players[0].city = [card("factory")];
  g.players[0].hand = [card("den"), card("temple"), card("manor")];
  g.players[0].gold = 1;
  run(g, { type: "gold" });
  run(g, { type: "build", card: "den-0", cards: ["temple-0", "manor-0"] });
  assert.equal(g.players[0].gold, 0);
  assert.equal(g.players[0].hand.length, 0);
});
test("laboratory and smithy have separate once-per-character abilities", () => {
  const g = turn(3);
  g.players[0].city = [card("laboratory"), card("smithy")];
  g.players[0].hand = [card("temple")];
  run(g, { type: "laboratory", card: "temple-0" });
  assert.equal(g.players[0].gold, 22);
  run(g, { type: "smithy" });
  assert.equal(g.players[0].gold, 20);
  assert.equal(g.players[0].hand.length, 3);
  assert.throws(() => run(g, { type: "smithy" }));
});
test("haunted quarter needs another purple for five colors; well includes self", () => {
  const g = turn(4);
  const p = g.players[0];
  p.city = ["manor", "temple", "tavern", "haunted"].map(card);
  assert.equal(score(g, p).variety, 0);
  p.city.push(card("well"));
  assert.equal(score(g, p).variety, 3);
  assert.equal(score(g, p).special, 1);
});
test("endgame scoring uses revealed rank, never unrevealed assassinated role", () => {
  const g = turn(4);
  const p = g.players[0];
  p.roles = [4, 8];
  p.revealed = [4];
  p.city = ["dragon", "treasury", "maproom", "statue", "well"].map(card);
  p.hand = [card("temple")];
  p.gold = 3;
  g.crown = p.id;
  assert.equal(score(g, p).special, 16);
  assert.equal(score(g, p).highestRole, 4);
});
test("full 2–8 player games finish, conserve cards and reset turn limits", () => {
  for (const n of [2, 3, 4, 5, 6, 7, 8]) {
    for (let repeat = 0; repeat < 5; repeat++) {
      const g = game(n);
      let steps = 0;
      while (g.phase !== "finished" && steps++ < 6000) {
        conserve(g);
        if (g.phase === "draft") {
          if (g.theaterPending) { run(g, { type: "skipTheater" }); continue; }
          run(g, {
            type: g.discardPending ? "discardRole" : "pick",
            slot: 0,
          });
          continue;
        }
        const p = g.players.find((p) => p.id === g.active)!;
        if (g.turn.choices.length) {
          run(g, { type: "chooseCard", card: g.turn.choices[0].id });
          continue;
        }
        if (!g.turn.gathered) {
          const useful = p.hand.filter(
            (c) => !p.city.some((x) => x.key === c.key),
          );
          run(g, { type: useful.length && p.gold < 10 ? "gold" : "cards" });
          continue;
        }
        if ([4, 5, 6, 8].includes(g.role) && !g.turn.used.includes("tax")) {
          run(g, { type: "tax" });
          continue;
        }
        if ([6, 7].includes(g.role) && !g.turn.used.includes("bonus")) {
          run(g, { type: "bonus" });
          continue;
        }
        const c = p.hand.find(
          (c) => c.key !== "secretvault" && (c.key !== "monument" || p.city.length < 5) && c.cost <= p.gold && !p.city.some((x) => x.key === c.key),
        );
        if (c && g.turn.built < (g.role === 7 ? 3 : 1)) {
          run(g, { type: "build", card: c.id });
          continue;
        }
        run(g, { type: "end" });
      }
      assert.equal(g.phase, "finished", `n=${n}, round=${g.round}`);
      assert.ok(g.scores.length === n);
      conserve(g);
    }
  }
});
