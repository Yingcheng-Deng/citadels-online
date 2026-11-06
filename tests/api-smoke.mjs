import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:5173";
async function post(body, token) {
  const r = await fetch(`${base}/api/room`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: r.status, ...(await r.json()) };
}
async function read(code, token) {
  const r = await fetch(`${base}/api/room?code=${code}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { status: r.status, ...(await r.json()) };
}
for (const n of [2, 3]) {
  const host = await post({ type: "create", name: "测试房主" });
  assert.equal(host.status, 200, JSON.stringify(host));
  const code = host.state.code;
  const seats = [{ id: host.state.me, token: host.token }];
  for (let i = 1; i < n; i++) {
    const r = await post({ type: "join", code, name: `测试朋友${i}` });
    assert.equal(r.status, 200);
    seats.push({ id: r.state.me, token: r.token });
  }
  const before = await read(code, seats[0].token);
  const parallel = await Promise.all(
    seats
      .slice(0, 2)
      .map((s) =>
        post(
          { code, revision: before.revision, action: { type: "ready" } },
          s.token,
        ),
      ),
  );
  assert.deepEqual(parallel.map((r) => r.status).sort(), [200, 409]);
  for (const s of seats) {
    const r = await read(code, s.token);
    if (!r.state.players.find((p) => p.id === s.id).ready)
      assert.equal(
        (
          await post(
            { code, revision: r.revision, action: { type: "ready" } },
            s.token,
          )
        ).status,
        200,
      );
  }
  let r = await read(code, seats[0].token);
  r = await post(
    { code, revision: r.revision, action: { type: "start" } },
    seats[0].token,
  );
  assert.equal(r.status, 200);
  assert.equal((await read(code, "wrong-token")).status, 400);
  assert.equal(
    (await post({ type: "join", code, name: "迟到者" })).status,
    400,
  );
  let steps = 0;
  while (r.state.phase === "draft" && steps++ < 12) {
    const s = seats.find((s) => s.id === r.state.active);
    const mine = await read(code, s.token);
    assert.ok(!("available" in mine.state));
    assert.deepEqual(mine.state.draftSlots, mine.state.draftSlots.map((_, i) => i));
    assert.deepEqual((await read(code, s.token)).state.draftSlots, mine.state.draftSlots);
    const invalidPick = await post(
      { code, revision: mine.revision, action: { type: mine.state.discardPending ? "discardRole" : "pick", role: 1 } },
      s.token,
    );
    assert.equal(invalidPick.status, 400);
    assert.equal((await read(code, s.token)).revision, mine.revision);
    const other = seats.find((x) => x.id !== s.id);
    const hidden = await read(code, other.token);
    assert.deepEqual(hidden.state.draftSlots, []);
    assert.ok(!JSON.stringify(hidden).includes(s.token));
    assert.equal(
      hidden.state.players.find((p) => p.id === s.id).hand.length,
      0,
    );
    r = await post(
      {
        code,
        revision: mine.revision,
        action: {
          type: mine.state.discardPending ? "discardRole" : "pick",
          slot: mine.state.draftSlots[0],
        },
      },
      s.token,
    );
    assert.equal(r.status, 200, JSON.stringify(r));
  }
  assert.equal(r.state.phase, "turn");
  const s = seats.find((s) => s.id === r.state.active);
  r = await read(code, s.token);
  const beforeGold = r.state.players.find((p) => p.id === s.id).gold;
  r = await post(
    { code, revision: r.revision, action: { type: "gold" } },
    s.token,
  );
  assert.equal(r.status, 200);
  const reconnect = await read(code, s.token);
  assert.equal(
    reconnect.state.players.find((p) => p.id === s.id).gold,
    beforeGold + 2,
  );
  const denied = await post(
    { code, revision: r.revision, action: { type: "gold" } },
    s.token,
  );
  assert.equal(denied.status, 400);
  const unchanged = await read(code, s.token);
  assert.equal(unchanged.revision, r.revision);
  console.log(
    `${n}-player API: joins, concurrent CAS, private drafts, authentication, reconnect, rejected actions PASS`,
  );
}
