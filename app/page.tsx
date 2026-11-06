"use client";
import { useEffect, useRef, useState } from "react";
import {
  roles,
  cardCatalog,
  type GameView,
  type Card,
  type Action,
} from "../lib/game";
const colors: Record<string, string> = {
  noble: "贵族",
  religious: "宗教",
  trade: "商业",
  military: "军事",
  unique: "独特",
};
type Session = { code: string; token: string };
function Skyline() {
  return (
    <svg className="skyline" viewBox="0 0 1000 460" aria-hidden="true">
      <defs>
        <linearGradient id="stone" x2="0" y2="1">
          <stop stopColor="#a3b8ab" />
          <stop offset="1" stopColor="#526f63" />
        </linearGradient>
        <linearGradient id="night" x2="0" y2="1">
          <stop stopColor="#25483b" />
          <stop offset="1" stopColor="#14372c" />
        </linearGradient>
      </defs>
      <circle cx="720" cy="105" r="60" fill="#e3d1a3" opacity=".9" />
      <path
        d="M0 380Q300 220 580 330T1000 300V460H0Z"
        fill="#496b5b"
        opacity=".5"
      />
      <g fill="url(#stone)" stroke="#153c30" strokeWidth="3">
        <path d="M170 410V230h78V410M260 410V170h110V410M400 410V230h150V410M555 410V120h80V410M650 410V210h110V410M780 410V275h92V410" />
        <path
          d="M130 235l78-80 80 80ZM238 174l78-110 78 110ZM378 234l98-88 98 88ZM530 124l65-108 65 108ZM622 214l84-98 83 98ZM760 279l65-80 65 80Z"
          fill="#2c5143"
        />
        <path d="M310 64V20l36 14-36 13M595 16V0" fill="#c8a76c" />
        <path d="M90 430V346h820v84" fill="url(#night)" />
        <path
          d="M90 346v-23h30v23h35v-23h30v23h35v-23h30v23h35v-23h30v23h35v-23h30v23h35v-23h30v23h35v-23h30v23h35v-23h30v23h35v-23h30v23h35v-23h30v23h35v-23h30v23h35v-23h30v23"
          fill="#648574"
        />
        <path d="M463 430v-45a38 38 0 0 1 76 0v45" fill="#102e24" />
      </g>
      <g fill="#ead7a2">
        {[192, 218, 288, 330, 423, 465, 507, 580, 607, 679, 721, 808, 842].map(
          (x, i) => (
            <path
              key={x}
              d={`M${x} ${i > 9 ? 300 : i > 6 ? 160 : 260}v20h8v-20a4 4 0 0 0-8 0`}
            />
          ),
        )}
      </g>
      <path d="M0 440Q350 400 500 431T1000 429V460H0Z" fill="#102f26" />
    </svg>
  );
}
function District({
  card,
  children,
}: {
  card: Card;
  children?: React.ReactNode;
}) {
  return (
    <article className={`district ${card.color}`}>
      <div className="card-top">
        <span>{colors[card.color]}</span>
        <b>◉ {card.cost + (card.decorated ? 1 : 0)}</b>
      </div>
      <div className="district-art" aria-hidden="true">
        {card.color === "religious"
          ? "♧"
          : card.color === "military"
            ? "♜"
            : card.color === "noble"
              ? "♛"
              : card.color === "trade"
                ? "⌂"
                : "✧"}
      </div>
      <h4>
        {card.name}
        {card.decorated ? " ✦" : ""}
      </h4>
      <p>{card.text || "建造属于你的城市，获得等同造价的分数。"}</p>
      {children}
    </article>
  );
}
export default function Home() {
  const [state, setState] = useState<GameView | null>(null),
    [session, setSession] = useState<Session | null>(null),
    [revision, setRevision] = useState(0);
  const [name, setName] = useState(""),
    [code, setCode] = useState(""),
    [recovery, setRecovery] = useState(""),
    [tab, setTab] = useState("create");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [connected, setConnected] = useState(true);
  const [help, setHelp] = useState(false),
    [secrets, setSecrets] = useState(false),
    [selected, setSelected] = useState<string[]>([]),
    [confirmEnd, setConfirmEnd] = useState(false);
  const rev = useRef(-1),
    sessionRef = useRef<Session | null>(null),
    inFlight = useRef(false);
  function receive(data: { state: GameView; revision: number }) {
    if (data.revision >= rev.current) {
      rev.current = data.revision;
      setRevision(data.revision);
      setState(data.state);
    }
  }
  function remember(s: Session) {
    sessionRef.current = s;
    setSession(s);
    sessionStorage.setItem("citadels-seat", JSON.stringify(s));
  }
  async function refresh(s: Session) {
    const res = await fetch(`/api/room?code=${s.code}`, {
      headers: { Authorization: `Bearer ${s.token}` },
      cache: "no-store",
    });
    const data = (await res.json()) as {
      state: GameView;
      revision: number;
      token: string;
      error: string;
    };
    if (!res.ok) throw new Error(data.error);
    if (sessionRef.current?.token === s.token) receive(data);
    setConnected(true);
  }
  useEffect(() => {
    const room = new URLSearchParams(location.search).get("room");
    if (room) {
      setCode(room);
      setTab("join");
    }
    try {
      const s = JSON.parse(sessionStorage.getItem("citadels-seat") || "null");
      if (s) {
        remember(s);
        refresh(s).catch((e) => {
          setError(e.message);
          setConnected(false);
        });
      }
    } catch {}
  }, []);
  useEffect(() => {
    if (!session) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        await refresh(session);
      } catch {
        setConnected(false);
      }
      if (!stopped) timer = setTimeout(poll, 1800);
    };
    timer = setTimeout(poll, 1800);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [session]);
  useEffect(() => {
    setSelected([]);
    setConfirmEnd(false);
  }, [state?.active, state?.role, state?.phase]);
  function reset() {
    sessionRef.current = null;
    setSession(null);
    setState(null);
    sessionStorage.removeItem("citadels-seat");
    rev.current = -1;
    setError("");
  }
  async function enter(type: string) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      if (type === "recover") {
        const s = { code: code.trim().toUpperCase(), token: recovery.trim() };
        rev.current = -1;
        remember(s);
        await refresh(s);
        return;
      }
      const res = await fetch("/api/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, name, code: code.trim().toUpperCase() }),
      });
      const data = (await res.json()) as {
        state: GameView;
        revision: number;
        token: string;
        error: string;
      };
      if (!res.ok) throw new Error(data.error);
      rev.current = -1;
      remember({ code: data.state.code, token: data.token });
      receive(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function act(action: Action) {
    if (!session || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/room", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ code: session.code, revision, action }),
      });
      const data = (await res.json()) as {
        state: GameView;
        revision: number;
        token: string;
        error: string;
      };
      if (!res.ok) {
        if (res.status === 409) await refresh(session);
        throw new Error(data.error);
      }
      if (!data.state) {
        reset();
        return;
      }
      receive(data);
      setSelected([]);
      setConfirmEnd(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("已复制");
      setTimeout(() => setNotice(""), 2500);
    } catch {
      setNotice("浏览器不允许复制，请手动复制页面上的内容");
    }
  }
  const me = state?.players.find((p) => p.id === state.me),
    mine = state?.active === state?.me,
    t = state?.turn;
  const can = (key: string) =>
    !!t && !t.used.includes(key) && !t.choices.length;
  return (
    <>
      <div className="paper-noise" />
      <header>
        <a href="/" className="brand">
          <span className="brand-mark">♜</span>
          <span>
            CITADELS<small>远方的城</small>
          </span>
        </a>
        <nav>
          <span className="edition">FRIENDS AROUND THE TABLE</span>
          <button className="text-button" onClick={() => setHelp(true)}>
            玩法与规则 ↗
          </button>
        </nav>
      </header>
      {error && (
        <div className="toast error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="关闭错误提示">
            ×
          </button>
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
      {!state ? (
        <main className="landing">
          <section className="hero">
            <div className="eyebrow">
              <span /> THE CITY IS YOURS TO BUILD
            </div>
            <h1>
              相隔千里，
              <br />
              同筑一城<span>。</span>
            </h1>
            <p className="intro">
              选一个身份，藏一点心思。
              <br />
              和远方的朋友，在熟悉的桌游里再聚一次。
            </p>
            <div className="hero-meta">
              <span>2–8 位好友</span>
              <i />
              <span>30–60 分钟</span>
              <i />
              <span>中文联机</span>
            </div>
            <div className="scene">
              <span className="scene-label">每一座城，都有你的故事。</span>
              <Skyline />
            </div>
            <div className="hero-foot">
              <span>01 / 秘密选角</span>
              <span>02 / 收集与建造</span>
              <span>03 / 加冕造城者</span>
            </div>
          </section>
          <section className="welcome">
            <div className="small-label">YOUR SEAT AT THE TABLE</div>
            <h2>圆桌，等你入席。</h2>
            <p>不用注册。一个昵称，就能和朋友开局。</p>
            <div className="tabs" role="tablist" aria-label="进入方式">
              {[
                ["create", "创建房间"],
                ["join", "加入房间"],
                ["recover", "恢复席位"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={tab === key}
                  className={tab === key ? "selected" : ""}
                  onClick={() => setTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                enter(tab);
              }}
            >
              {tab !== "recover" && (
                <label>
                  你的昵称
                  <input
                    maxLength={20}
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="朋友们怎么称呼你？"
                    autoComplete="nickname"
                  />
                </label>
              )}
              {tab !== "create" && (
                <label>
                  房间码
                  <input
                    required
                    maxLength={8}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="输入 8 位房间码"
                    autoCapitalize="characters"
                  />
                </label>
              )}
              {tab === "recover" && (
                <label>
                  你的恢复密钥
                  <input
                    required
                    value={recovery}
                    onChange={(e) => setRecovery(e.target.value)}
                    placeholder="粘贴之前保存的密钥"
                    type="password"
                  />
                </label>
              )}
              <button className="primary full" disabled={busy}>
                {busy
                  ? "正在入席…"
                  : tab === "create"
                    ? "创建一张新圆桌"
                    : tab === "join"
                      ? "加入朋友的房间"
                      : "回到我的席位"}
                <span>→</span>
              </button>
            </form>
            <div className="welcome-note">
              <span>✧</span>
              <div>
                <b>为小聚设计</b>
                <p>
                  2–3 人双角色玩法 · 私密手牌
                  <br />
                  自动保存 · 刷新重连 · 手机也能玩
                </p>
              </div>
            </div>
            <div className="version-note">
              基础角色 + 艺术家 · 14 种独特建筑
              <br />
              基于新版规则的非官方朋友联机项目
            </div>
            {session && (
              <button className="text-button" onClick={reset}>
                清除本页的旧席位凭证
              </button>
            )}
          </section>
        </main>
      ) : (
        <main className="game-shell">
          <div className="room-bar">
            <div>
              <div className="eyebrow">
                {state.phase === "lobby"
                  ? "THE GATHERING"
                  : `ROUND ${String(state.round).padStart(2, "0")}`}
              </div>
              <h1>
                {state.phase === "lobby"
                  ? "好友入席，故事开场。"
                  : state.phase === "finished"
                    ? "这一城，写下了结局。"
                    : state.phase === "draft"
                      ? "你的身份，你的秘密。"
                      : `${roles[state.role - 1]?.name}的时刻。`}
              </h1>
            </div>
            <div className="room-controls">
              <span className={connected ? "connection" : "connection offline"}>
                {connected ? "● 已同步" : "● 重连中"} <small>#{revision}</small>
              </span>
              <button
                className="room-code"
                onClick={() => copy(`${location.origin}/?room=${state.code}`)}
                title="复制邀请链接"
              >
                房间 {state.code} ↗
              </button>
              <button
                className="text-button"
                onClick={() => copy(state.code)}
              >
                复制房间号
              </button>
              <button
                className="text-button"
                onClick={() => setSecrets(!secrets)}
              >
                恢复密钥
              </button>
            </div>
          </div>
          {secrets && (
            <aside className="recovery">
              <b>仅供你本人恢复席位，请私下保存。</b>
              <code>{session?.token}</code>
              <button onClick={() => copy(session?.token || "")}>
                复制密钥
              </button>
            </aside>
          )}
          <div className="game-grid">
            <section className="table-area">
              <div className="seats">
                {state.players.map((p) => (
                  <article
                    className={`seat ${p.id === state.active ? "active" : ""}`}
                    key={p.id}
                  >
                    <span className="avatar">{p.name.slice(0, 1)}</span>
                    <div>
                      <b>
                        {p.name}
                        {p.id === state.me ? " · 你" : ""}{" "}
                        {p.id === state.crown ? "♛" : ""}
                      </b>
                      <small>
                        {state.phase === "lobby"
                          ? p.ready
                            ? "已准备"
                            : "等待准备"
                          : `◉ 金币 ${p.gold} · 手牌 ${p.handCount} · 城市 ${p.city.length}/${state.target}`}
                      </small>
                      <span className="role-chips">
                        {p.roles.map((r) => (
                          <i key={r}>
                            {r} {roles[r - 1].name}
                            {!p.revealed.includes(r) &&
                            state.phase !== "finished"
                              ? " · 暗"
                              : ""}
                          </i>
                        ))}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
              {state.phase === "lobby" ? (
                <section className="lobby-panel">
                  <div className="large-crown">♛</div>
                  <h2>朋友到齐，就开局。</h2>
                  <p>
                    点击右上角房间码复制邀请链接，也可以单独复制房间号。所有人准备后，房主即可开始。
                  </p>
                  <div className="lobby-specs">
                    <span>
                      <b>{state.players.length}</b> / 8 位入席
                    </span>
                    <span>
                      <b>{state.players.length <= 3 ? "双" : "单"}</b>角色模式
                    </span>
                    <span>
                      <b>{state.players.length <= 3 ? 8 : 7}</b>座建筑完城
                    </span>
                  </div>
                  <div className="button-row">
                    <button
                      onClick={() => act({ type: "ready" })}
                      disabled={busy}
                      className="primary"
                    >
                      {me?.ready ? "取消准备" : "我准备好了"}
                    </button>
                    {state.host === state.me && (
                      <button
                        disabled={
                          busy ||
                          state.players.length < 2 ||
                          !state.players.every((p) => p.ready)
                        }
                        onClick={() => act({ type: "start" })}
                      >
                        开始对局 →
                      </button>
                    )}
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() => act({ type: "leave" })}
                    >
                      离开房间
                    </button>
                  </div>
                  <p className="muted">
                    三人及八人局自动加入 9 号艺术家。初始王冠随机分配。
                  </p>
                </section>
              ) : (
                <>
                  {state.phase === "draft" && (
                    <section className="draft-panel">
                      <div className="section-heading">
                        <h2>
                          {mine
                            ? state.discardPending
                              ? "秘密弃掉一个角色"
                              : "盲选你的角色"
                            : `等待 ${state.players.find((p) => p.id === state.active)?.name} 选角`}
                        </h2>
                        <span>
                          {state.players.length <= 3
                            ? "每人两个身份"
                            : "每人一个身份"}
                        </span>
                      </div>
                      <p>
                        {mine
                          ? state.discardPending
                            ? "选择一张牌背暗弃；不会显示身份，也不会传给下一位玩家。"
                            : "角色牌已洗牌，选牌前不显示身份。点击一张牌背，选中后仅你可见。"
                          : "这一刻，最好的策略是让朋友猜不透你。"}
                      </p>
                      {state.faceup.length > 0 && (
                        <p>
                          公开弃置：
                          {state.faceup
                            .map((r) => roles[r - 1].name)
                            .join("、")}
                        </p>
                      )}
                      <div className="role-grid">
                        {mine
                          ? state.draftSlots.map((slot) => (
                              <button
                                key={slot}
                                className="card-back draft-card"
                                disabled={busy}
                                aria-label={`${state.discardPending ? "暗弃" : "盲选"}第 ${slot + 1} 张角色牌`}
                                onClick={() =>
                                  act({
                                    type: state.discardPending
                                      ? "discardRole"
                                      : "pick",
                                    slot,
                                  })
                                }
                              >
                                <span aria-hidden="true">♜</span>
                                <small>CITADELS</small>
                                <b>
                                  {state.discardPending
                                    ? "暗弃这张"
                                    : "盲选这张"}{" "}
                                  →
                                </b>
                              </button>
                            ))
                          : Array.from({ length: 3 }, (_, i) => (
                              <div className="card-back" key={i}>
                                <span>♜</span>
                                <small>CITADELS</small>
                              </div>
                            ))}
                      </div>
                    </section>
                  )}
                  {state.phase === "turn" && (
                    <section className="action-panel">
                      <div className="section-heading">
                        <h2>
                          {mine
                            ? "轮到你行动"
                            : `等待 ${state.players.find((p) => p.id === state.active)?.name} 行动`}
                        </h2>
                        <span>牌库 {state.remaining} 张</span>
                      </div>
                      {state.firstComplete && (
                        <div className="final-round">
                          ♛ 已有城市完工，本轮结束后结算。
                        </div>
                      )}
                      {mine && t ? (
                        <>
                          <p>{roles[state.role - 1]?.text}</p>
                          {t.choices.length ? (
                            <>
                              <h3>选择一张建筑保留</h3>
                              <div className="cards">
                                {t.choices.map((c) => (
                                  <District card={c} key={c.id}>
                                    <button
                                      disabled={busy}
                                      onClick={() =>
                                        act({ type: "chooseCard", card: c.id })
                                      }
                                    >
                                      保留这张
                                    </button>
                                  </District>
                                ))}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="button-row">
                                <button
                                  className="primary"
                                  disabled={busy || t.gathered}
                                  onClick={() => act({ type: "gold" })}
                                >
                                  ◉ 采集 2 金币
                                </button>
                                <button
                                  disabled={busy || t.gathered}
                                  onClick={() => act({ type: "cards" })}
                                >
                                  ▱ 抽取建筑牌
                                </button>
                                {[4, 5, 6, 8].includes(state.role) && (
                                  <button
                                    disabled={busy || !can("tax")}
                                    onClick={() => act({ type: "tax" })}
                                  >
                                    收取建筑税
                                  </button>
                                )}
                                {[6, 7].includes(state.role) && (
                                  <button
                                    disabled={busy || !can("bonus")}
                                    onClick={() => act({ type: "bonus" })}
                                  >
                                    {state.role === 6
                                      ? "商人：额外 1 金币"
                                      : "建筑师：额外 2 张牌"}
                                  </button>
                                )}
                              </div>
                              {[1, 2].includes(state.role) && (
                                <div className="power">
                                  <h3>
                                    {state.role === 1
                                      ? "选择刺杀的角色"
                                      : "选择盗窃的角色"}
                                  </h3>
                                  <div className="button-row">
                                    {roles
                                      .slice(0, state.roleCount)
                                      .filter(
                                        (r) =>
                                          r.id !== state.role &&
                                          (state.role !== 2 ||
                                            (r.id !== 1 &&
                                              r.id !== state.killed)),
                                      )
                                      .map((r) => (
                                        <button
                                          key={r.id}
                                          disabled={busy || !can("power")}
                                          onClick={() =>
                                            act({
                                              type:
                                                state.role === 1
                                                  ? "kill"
                                                  : "rob",
                                              role: r.id,
                                            })
                                          }
                                        >
                                          {r.id} {r.name}
                                        </button>
                                      ))}
                                  </div>
                                </div>
                              )}
                              {state.role === 3 && (
                                <div className="power">
                                  <h3>交换手牌 · 两种方式任选一种</h3>
                                  <div className="button-row">
                                    {state.players
                                      .filter((p) => p.id !== state.me)
                                      .map((p) => (
                                        <button
                                          key={p.id}
                                          disabled={busy || !can("power")}
                                          onClick={() =>
                                            act({ type: "swap", target: p.id })
                                          }
                                        >
                                          与 {p.name} 交换
                                        </button>
                                      ))}
                                    <button
                                      disabled={
                                        busy ||
                                        !can("power") ||
                                        !selected.length
                                      }
                                      onClick={() =>
                                        act({ type: "redraw", cards: selected })
                                      }
                                    >
                                      换掉勾选的 {selected.length} 张牌
                                    </button>
                                  </div>
                                </div>
                              )}
                              {me?.city.some((c) => c.key === "smithy") && (
                                <button
                                  disabled={
                                    busy || !can("smithy") || me.gold < 2
                                  }
                                  onClick={() => act({ type: "smithy" })}
                                >
                                  铁匠铺：付 2 金币，抽 3 张牌
                                </button>
                              )}
                              <div className="end-turn">
                                <span>
                                  已建造 {t.built} / {state.role === 7 ? 3 : 1}{" "}
                                  座 ·{" "}
                                  {t.gathered
                                    ? "已采集资源"
                                    : "先采集资源，再建造"}
                                </span>
                                {confirmEnd ? (
                                  <div className="button-row">
                                    <span>确认结束当前角色回合？</span>
                                    <button
                                      disabled={busy}
                                      onClick={() => act({ type: "end" })}
                                    >
                                      确认结束
                                    </button>
                                    <button
                                      onClick={() => setConfirmEnd(false)}
                                    >
                                      继续行动
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    disabled={busy || !t.gathered}
                                    onClick={() => setConfirmEnd(true)}
                                  >
                                    结束回合 →
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <p>
                          可以查看自己的手牌与所有人的城市，提前规划下一步。
                        </p>
                      )}
                    </section>
                  )}
                  {state.phase === "finished" && (
                    <section className="results">
                      <div className="large-crown">♛</div>
                      <h2>{state.scores[0]?.name}，新任造城大师</h2>
                      <p>同分时，最后一轮公开角色编号较高者获胜。</p>
                      <div className="score-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>玩家</th>
                              <th>建筑</th>
                              <th>五色</th>
                              <th>完城</th>
                              <th>独特</th>
                              <th>总分</th>
                            </tr>
                          </thead>
                          <tbody>
                            {state.scores.map((p) => (
                              <tr key={p.id}>
                                <td>{p.name}</td>
                                <td>{p.buildings}</td>
                                <td>{p.variety}</td>
                                <td>{p.completion}</td>
                                <td>{p.special}</td>
                                <td>
                                  <b>{p.total}</b>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {state.host === state.me && (
                        <button
                          className="primary"
                          disabled={busy}
                          onClick={() => act({ type: "rematch" })}
                        >
                          再聚一局
                        </button>
                      )}
                    </section>
                  )}
                  <section className="hand-section">
                    <div className="section-heading">
                      <h2>
                        我的手牌 <small>仅你可见 · 已按类别整理</small>
                      </h2>
                      <span>
                        ◉ {me?.gold} 金币 · {me?.handCount} 张
                      </span>
                    </div>
                    {!me?.hand.length && (
                      <p className="empty">
                        手中暂无建筑牌，采集资源时可以抽牌。
                      </p>
                    )}
                    <div className="cards">
                      {me?.hand.map((c) => (
                        <District card={c} key={c.id}>
                          {mine &&
                            state.phase === "turn" &&
                            t &&
                            !t.choices.length && (
                              <>
                                <label className="card-select">
                                  <input
                                    type="checkbox"
                                    checked={selected.includes(c.id)}
                                    onChange={(e) =>
                                      setSelected(
                                        e.target.checked
                                          ? [...selected, c.id]
                                          : selected.filter((x) => x !== c.id),
                                      )
                                    }
                                  />
                                  选中用于换牌 / 抵扣
                                </label>
                                <button
                                  disabled={
                                    busy ||
                                    !t.gathered ||
                                    t.built >= (state.role === 7 ? 3 : 1)
                                  }
                                  onClick={() =>
                                    act({
                                      type: "build",
                                      card: c.id,
                                      cards:
                                        c.key === "den"
                                          ? selected.filter((x) => x !== c.id)
                                          : [],
                                    })
                                  }
                                >
                                  建造
                                  {c.key === "den" && selected.length
                                    ? "（勾选牌抵扣）"
                                    : ""}
                                </button>
                                {me.city.some(
                                  (x) => x.key === "laboratory",
                                ) && (
                                  <button
                                    disabled={busy || !can("laboratory")}
                                    onClick={() =>
                                      act({ type: "laboratory", card: c.id })
                                    }
                                  >
                                    实验室：弃此牌换 2 金币
                                  </button>
                                )}
                              </>
                            )}
                        </District>
                      ))}
                    </div>
                  </section>
                  <section className="cities">
                    <div className="section-heading">
                      <h2>圆桌上的城市</h2>
                      <span>完城后进行本轮剩余回合</span>
                    </div>
                    {state.players.map((p) => (
                      <div className="city" key={p.id}>
                        <h3>
                          {p.name}{" "}
                          <small>
                            {p.city.length} 座建筑{" "}
                            {p.revealed.includes(5) && state.killed !== 5
                              ? "· 主教守护"
                              : ""}
                          </small>
                        </h3>
                        {!p.city.length ? (
                          <p className="empty">
                            城市的第一块砖，还在等待落下。
                          </p>
                        ) : (
                          <div className="city-cards">
                            {p.city.map((c) => (
                              <District key={c.id} card={c}>
                                {mine &&
                                  state.phase === "turn" &&
                                  state.role === 8 && (
                                    <button
                                      disabled={
                                        busy ||
                                        !can("power") ||
                                        p.city.length >= state.target ||
                                        c.key === "keep" ||
                                        (p.revealed.includes(5) &&
                                          state.killed !== 5)
                                      }
                                      onClick={() =>
                                        act({
                                          type: "destroy",
                                          target: p.id,
                                          card: c.id,
                                        })
                                      }
                                    >
                                      拆除 ·{" "}
                                      {Math.max(
                                        0,
                                        c.cost + (c.decorated ? 1 : 0) - 1,
                                      )}{" "}
                                      金币
                                    </button>
                                  )}
                                {mine &&
                                  state.phase === "turn" &&
                                  state.role === 9 &&
                                  p.id === state.me && (
                                    <button
                                      disabled={
                                        busy ||
                                        c.decorated ||
                                        !t ||
                                        t.decorated.length >= 2 ||
                                        !me?.gold
                                      }
                                      onClick={() =>
                                        act({ type: "decorate", card: c.id })
                                      }
                                    >
                                      美化 · 1 金币
                                    </button>
                                  )}
                              </District>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </section>
                </>
              )}
            </section>
            <aside className="sidebar">
              <section className="journal">
                <div className="section-heading">
                  <h3>城中纪事</h3>
                  <span>LIVE</span>
                </div>
                <ol>
                  {[...state.log].reverse().map((s, i) => (
                    <li key={`${i}-${s}`}>
                      <span />
                      {s}
                    </li>
                  ))}
                </ol>
              </section>
              <section className="table-note">
                <span>✧</span>
                <h3>留一点悬念。</h3>
                <p>
                  角色轮流被叫到时才会公开。不要在语音里不小心说出自己的另一个身份。
                </p>
                <button className="text-button" onClick={() => setHelp(true)}>
                  查看完整玩法 ↗
                </button>
              </section>
            </aside>
          </div>
        </main>
      )}
      <footer>
        <span>CITADELS · 远方的城</span>
        <span>一局游戏，让距离近一点。</span>
        <span>非官方同好项目 · 规则 / Bruno Faidutti</span>
      </footer>
      {help && (
        <div className="modal-backdrop" onClick={() => setHelp(false)}>
          <section
            className="help-modal"
            role="dialog"
            aria-modal="true"
            aria-label="玩法与规则"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close"
              aria-label="关闭规则"
              onClick={() => setHelp(false)}
            >
              ×
            </button>
            <div className="eyebrow">A LITTLE GUIDE</div>
            <h2>一起，把这座城建起来。</h2>
            <p>
              所有人准备 → 房主开始 → 盲选角色 → 按编号依次行动。每回合采集 2
              金币，或抽 2 张建筑保留 1 张；支付造价建造，通常每回合限 1
              座。角色与建筑能力按说明使用。
            </p>
            <p>
              本房间采用盲选玩法：选角与弃角均只显示牌背，选中后仅本人知道身份；其余角色牌会重新洗牌后供下一步选择。
            </p>
            <h3>2–3 人，两个身份，一座城市</h3>
            <p>
              2 人使用 8
              角色：王冠先选，第二人选并弃，第一人再选并弃，第二人最后选。3
              人加入艺术家：每人先选一次，系统随机暗弃一张，再每人选一次。两个角色共用城市、手牌和金币，分别行动；每个角色回合的能力与建造额度重新计算。
            </p>
            <h3>何时分出胜负？</h3>
            <p>
              2–3 人达到 8 座建筑；4–8 人达到 7
              座建筑，触发最后一轮。完成剩余角色回合后：建筑造价总和 + 五色齐全
              3 分 + 首位完城 4 分（其他完城 2 分）+
              独特建筑奖励。同分比较最后一轮公开角色最高编号。
            </p>
            <h3>角色速查</h3>
            <div className="reference-roles">
              {roles.map((r) => (
                <p key={r.id}>
                  <b>
                    {r.id} · {r.name}　
                  </b>
                  {r.text}
                </p>
              ))}
            </div>
            <h3>独特建筑 · 初次游玩组合</h3>
            <p>
              采用官方推荐的 14
              种独特建筑；中文名称为本项目译名。能力文本已整理，仍待与实体卡面逐张核对。
            </p>
            <div className="reference-roles">
              {cardCatalog
                .filter((c) => c.color === "unique")
                .map((c) => (
                  <p key={c.key}>
                    <b>
                      {c.name} · {c.cost} 金币　
                    </b>
                    {c.text}
                  </p>
                ))}
            </div>
            <h3>保存与重连</h3>
            <p>
              房间状态自动保存在服务器。刷新当前标签页会恢复席位；跨设备或关闭标签页前，请从“恢复密钥”保存你的私人密钥。邀请链接可分享，恢复密钥只属于你。
            </p>
            <p>
              当前实现基础 8 角色及艺术家，未包含其余 18
              个替换角色。没有单人机器人；朋友可开语音一起玩。
            </p>
            <a
              href="https://cdn.svc.asmodee.net/production-zman/uploads/2024/10/zc01-rulebook_web.pdf"
              target="_blank"
              rel="noreferrer"
            >
              打开官方英文规则 ↗
            </a>
          </section>
        </div>
      )}
    </>
  );
}
