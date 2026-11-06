"use client";
import { useEffect, useRef, useState } from "react";
import { GameDialog } from "../components/game-dialog";
import { AdvancedControls } from "../components/advanced-controls";
import { Tutorial } from "../components/tutorial";
import {
  roles, roleAt, buildLimit, freeOfLimit, taxColor,
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
function District({
  card,
  children,
}: {
  card: Card & { storedCount?: number };
  children?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <article className={`district ${card.color}`}>
      <div className="card-top">
        <span>{colors[card.color]}</span>
        <b>◉ {card.cost + (card.decorated ? 1 : 0)}</b>
      </div>
      <button className="card-preview" onClick={() => setExpanded(true)} aria-label={`放大查看${card.name}`}>
        <img className="district-face" src={`/cards/${card.key}.webp`} alt={`${card.name}原版卡面`} loading="lazy" width="600" height="941" />
        <span>点击放大 ↗</span>
      </button>
      <h4>
        {card.name}
        {card.decorated ? " ✦" : ""}
      </h4>
      <p>{card.text || "建造属于你的城市，获得等同造价的分数。"}</p>
      {card.key === "museum" && card.storedCount !== undefined && <p className="museum-count">已收藏 {card.storedCount} 张 · 终局 +{card.storedCount} 分</p>}
      {children}
      {expanded && <GameDialog title={`${card.name}卡牌详情`} onClose={() => setExpanded(false)} className="card-dialog">
        <img src={`/cards/${card.key}.webp`} alt={`${card.name}原版卡面大图`} />
        <div><div className="eyebrow">{colors[card.color]} · {card.key === "secretvault" ? "不可建造" : `造价 ${card.cost + (card.decorated ? 1 : 0)} 金币`}</div>
          <h2>{card.name}{card.decorated ? " · 已美化" : ""}</h2>
          <p>{card.text || "支付造价后，从手牌放入城市。游戏结束时，获得等同造价的基础分数。"}</p>
          <p className="lesson-note">卡面为原版英文图案，下方中文说明用于本网站游玩。特殊能力通常在建筑建成后生效。</p>
        </div>
      </GameDialog>}
    </article>
  );
}
export default function Home() {
  const [mode,setMode] = useState<"classic"|"advanced">("classic");
  const [confirmBuild,setConfirmBuild] = useState(true);
  const [cardinalTarget,setCardinalTarget] = useState("");
  const [tutorial, setTutorial] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [roleInfo, setRoleInfo] = useState<number | null>(null);
  const [freeBuild, setFreeBuild] = useState<Card | null>(null);
  const [confirmation, setConfirmation] = useState<{title:string; action:Action} | null>(null);
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
    try {
      setConfirmBuild(localStorage.getItem("citadels-confirm-build") !== "off");
      if (!localStorage.getItem("citadels-tutorial-seen") && !sessionStorage.getItem("citadels-seat")) setTutorial(true);
    } catch {}
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
  function closeTutorial() {
    setTutorial(false);
    try { localStorage.setItem("citadels-tutorial-seen", "yes"); } catch {}
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
        body: JSON.stringify({ type, name, mode, code: code.trim().toUpperCase() }),
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
    !!t && !state?.restricted && !t.used.includes(key) && !t.choices.length;
  const currentRole = state ? roleAt(state,state.role) : undefined;
  const rid = currentRole?.id || 0;
  function requestBuild(action:Action, card:Card) {
    if (!me) return;
    const cost = action.sacrifice ? 0 : Math.max(0,card.cost-(card.color === "unique" && me.city.some(c=>c.key === "factory")?1:0));
    const paid = action.target ? cost : cost-(action.cards?.length || 0);
    if (paid < 0) { setError("抵扣数量超过造价"); return; }
    if (!action.target && me.gold < paid) { setError("金币不足，无法建造"); return; }
    if (confirmBuild) setConfirmation({title:`确认建造${card.name}？支付 ${paid} 金币${action.cards?.length ? `，交出 ${action.cards.length} 张手牌` : ""}${action.sacrifice ? "，并拆除所选建筑" : ""}${state?.cast.includes(27) && rid!==27 ? "；建造后若还有金币，另缴 1 金币房产税" : ""}`,action});
    else act(action);
  }
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
          <button className="text-button" onClick={() => setTutorial(true)}>新手教学</button>
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
              <img className="cover-art" src="/art/city-cover.png" alt="参考实体桌游封面元素创作的奇幻城邦：彩色尖塔、石桥、钟楼与圆桌伙伴" fetchPriority="high" />
            </div>
            <button className="learn-entry" onClick={() => setTutorial(true)}><span>第一次玩？</span><b>3 分钟，亲手学会一回合 →</b></button>
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
              {tab === "create" && <fieldset className="mode-picker"><legend>选择玩法</legend><label><input type="radio" name="mode" value="classic" checked={mode==="classic"} onChange={()=>setMode("classic")}/>经典模式<span>基础 8 角色；3／8 人局加入艺术家。</span></label><label><input type="radio" name="mode" value="advanced" checked={mode==="advanced"} onChange={()=>setMode("advanced")}/>进阶模式<span>27 角色池，按编号各选一个组成当局阵容。</span></label></fieldset>}
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
              经典 / 进阶 · 27 角色 · 每局从 30 种独特建筑随机选 14 种
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
                      : `${currentRole?.name || "角色交涉"}的时刻。`}
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
              {state.phase !== "lobby" && <button className="text-button" onClick={() => setCatalogOpen(true)}>本局独特建筑</button>}
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
                          : `◉ 金币 ${p.gold} · 手牌 ${p.handCount} · 城市 ${p.cityCount}/${state.target}`}
                      </small>
                      <span className="role-chips">
                        {p.roles.map((r) => (
                          <button className="role-chip" key={r} onClick={() => setRoleInfo(roleAt(state,r).id)} title="查看角色卡和能力">
                            {r} {roleAt(state,r).name}
                            {!p.revealed.includes(r) &&
                            state.phase !== "finished"
                              ? " · 暗"
                              : ""}
                          </button>
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
                  <p className="deck-explainer">本局开局时，从 30 种独特建筑随机选 14 种（包含不同造价），混入 54 张普通建筑；再次开局会重新抽选。</p>
                  <button onClick={() => setTutorial(true)}>第一次玩？先练习一回合</button>
                  <div className="mode-settings"><h3>{state.mode === "classic" ? "经典模式" : "进阶模式"}</h3>
                    {state.host===state.me && <label>房间模式<select value={state.mode} disabled={busy} onChange={e=>act({type:"configure",mode:e.target.value as "classic"|"advanced",cast:state.castChoices})}><option value="classic">经典模式</option><option value="advanced">进阶模式</option></select></label>}
                    {state.mode==="advanced" && <><p>每个编号只选一位，阵容整局固定。可自行选择或保持随机；2 人用 1–8 号，其余人数使用 1–9 号。皇帝至少 3 人，王后至少 5 人。</p><div className="cast-settings">{Array.from({length:9},(_,i)=>i+1).map(rank=><label key={rank}>{rank} 号角色<select value={state.castChoices[rank-1] || 0} disabled={busy || state.host!==state.me} onChange={e=>{const cast=Array.from({length:9},(_,i)=>state.castChoices[i] || 0);cast[rank-1]=Number(e.target.value);act({type:"configure",mode:"advanced",cast});}}><option value={0}>开局随机</option>{roles.filter(r=>r.rank===rank).map(r=><option key={r.id} value={r.id}>{r.name}{r.id===16 ? "（≥3人）" : r.id===26 ? "（≥5人）" : ""}</option>)}</select></label>)}</div></>}
                    {state.mode==="classic" && <p>基础 8 角色；仅 3／8 人局自动加入艺术家。切换设置后大家需要重新准备。</p>}
                  </div>
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
                    经典模式三人及八人局加入艺术家；进阶模式按阵容开局。初始王冠随机分配。
                  </p>
                </section>
              ) : (
                <>
                  {state.phase === "draft" && (
                    <section className="draft-panel">
                      <div className="section-heading">
                        <h2>
                          {mine
                            ? state.theaterPending
                              ? "剧院：交换一个身份？"
                              : state.discardPending
                              ? state.initialDiscard ? "首位玩家：先暗弃一张角色牌" : "秘密弃掉一个角色"
                              : "盲选你的角色"
                            : `等待 ${state.players.find((p) => p.id === state.active)?.name} ${state.theaterPending ? "使用剧院" : "选角"}`}
                        </h2>
                        <span>
                          {state.players.length <= 3
                            ? "每人两个身份"
                            : "每人一个身份"}
                        </span>
                      </div>
                      <p>
                        {mine
                          ? state.theaterPending
                            ? "所有人已选好身份。你可以交换自己的一个角色，或跳过；对方身份在交换前不可见。"
                            : state.discardPending
                            ? state.initialDiscard ? "本轮先由你亲手选择一张牌背暗弃，再从剩余七张中盲选第一个身份。" : "选择一张牌背暗弃；不会显示身份，也不会传给下一位玩家。"
                            : "角色牌已洗牌，选牌前不显示身份。点击一张牌背，选中后仅你可见。"
                          : "这一刻，最好的策略是让朋友猜不透你。"}
                      </p>
                      {state.faceup.length > 0 && (
                        <p>
                          公开弃置：
                          {state.faceup
                            .map((r) => roleAt(state,r).name)
                            .join("、")}
                        </p>
                      )}
                      {state.theaterPending && mine ? <div className="theater-actions">
                        {me?.roles.map((role) => <div key={role}><h3>交出：{roleAt(state,role).name}</h3><div className="button-row">
                          {state.players.filter((p) => p.id !== state.me).map((p) => <button key={p.id} disabled={busy} onClick={() => act({type:"theater",role,target:p.id})}>与 {p.name} 交换</button>)}
                        </div></div>)}
                        <button disabled={busy} onClick={() => act({type:"skipTheater"})}>保留身份，跳过剧院</button>
                      </div> : <div className="role-grid">
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
                      </div>}
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
                      <AdvancedControls key={`${state.round}-${state.role}-${state.active}`} state={state} busy={busy} act={act} build={requestBuild} cardinalTarget={cardinalTarget} setCardinalTarget={setCardinalTarget}/>
                      {mine && t ? (
                        <>
                          <div className="active-role"><button onClick={() => setRoleInfo(rid)} aria-label="放大当前角色卡"><img src={`/cards/role-${rid}.webp`} alt={currentRole?.name} /></button><div><h3>{currentRole?.name}</h3><p>{currentRole?.text}</p></div></div>
                          <div className="turn-guide"><b>{t.choices.length ? "下一步：从抽到的牌中选择一张保留" : !t.gathered ? "下一步：采集金币或抽建筑牌" : "下一步：建造、使用能力，完成后结束回合"}</b><span>普通角色建 1 座，建筑师建 3 座；马厩不占次数。能力可按卡面时机使用。</span></div>
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
                                  ◉ 采集 {me?.city.some((c) => c.key === "goldmine") ? 3 : 2} 金币
                                </button>
                                <button
                                  disabled={busy || t.gathered}
                                  onClick={() => act({ type: "cards" })}
                                >
                                  ▱ 抽 {me?.city.some((c) => c.key === "observatory") ? 3 : 2} 张建筑牌{me?.city.some((c) => c.key === "library") ? "，全部保留" : "，保留 1 张"}
                                </button>
                                {!!taxColor(rid) && rid!==18 && (
                                  <button
                                    disabled={busy || !can("tax")}
                                    onClick={() => act({ type: "tax" })}
                                  >
                                    {rid===17 || rid===19 ? "按建筑领取牌" : "按当前城市收税（可先建造再收）"}
                                  </button>
                                )}
                                {[6, 7].includes(rid) && (
                                  <button
                                    disabled={busy || !can("bonus")}
                                    onClick={() => act({ type: "bonus" })}
                                  >
                                    {rid === 6
                                      ? "商人：额外 1 金币"
                                      : "建筑师：额外 2 张牌"}
                                  </button>
                                )}
                              </div>
                              {[1, 2].includes(rid) && (
                                <div className="power">
                                  <h3>
                                    {state.role === 1
                                      ? "选择刺杀的角色"
                                      : "选择盗窃的角色"}
                                  </h3>
                                  <div className="button-row">
                                    {state.cast.map((_,i)=>({...roleAt(state,i+1),id:i+1}))
                                      .filter(
                                        (r) =>
                                          r.id !== state.role &&
                                          (state.role !== 2 ||
                                            (r.id !== 1 &&
                                              r.id !== state.killed && r.id !== state.bewitched)),
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
                              {rid === 3 && (
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
                                  已建造 {t.built} / {buildLimit(rid)}{" "}
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
                                    disabled={busy || !t.gathered || !!state.restricted}
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
                                    !t.gathered || !!state.restricted || rid===22 ||
                                    (!freeOfLimit(rid,c) && t.built >= buildLimit(rid)) ||
                                    c.key === "secretvault" ||
                                    (c.key === "monument" && me.city.length >= 5)
                                  }
                                  onClick={() =>
                                    requestBuild({
                                      type: "build",
                                      target: rid===19 ? cardinalTarget || undefined : undefined,
                                      card: c.id,
                                      cards:
                                        c.key === "den" || (rid===19 && !!cardinalTarget)
                                          ? selected.filter((x) => x !== c.id)
                                          : [],
                                    },c)
                                  }
                                >
                                  {c.key === "secretvault" ? "留在手中 · 终局 +3 分" : "建造"}
                                  {c.key === "den" && selected.length
                                    ? "（勾选牌抵扣）"
                                    : ""}
                                </button>
                                {c.key !== "secretvault" && me.city.some((x) => x.key === "framework" || c.key === "necropolis") && <button disabled={busy || !t.gathered || !!state.restricted || rid===22 || (!freeOfLimit(rid,c) && t.built >= buildLimit(rid))} onClick={() => setFreeBuild(c)}>拆除建筑，免费建造…</button>}
                                {me.city.some((x) => x.key === "museum") && <button disabled={busy || !can("museum")} onClick={() => act({type:"museum",card:c.id})}>博物馆：收藏此牌</button>}
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
                            {p.city.length} 张建筑 · 完城进度 {p.cityCount}/{state.target}{" "}
                            {roleAt(state,5).id===5 && state.killed!==5 && (state.bewitched===5 ? p.revealed.includes(1) : p.revealed.includes(5))
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
                                  rid === 8 && (
                                    <button
                                      disabled={
                                        busy ||
                                        !can("power") ||
                                        p.cityCount >= state.target ||
                                        c.key === "keep" ||
                                        (roleAt(state,5).id===5 && state.killed!==5 && (state.bewitched===5 ? p.revealed.includes(1) : p.revealed.includes(5)))
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
                                      ) + (c.key !== "greatwall" && p.city.some((x) => x.key === "greatwall") ? 1 : 0)}{" "}
                                      金币
                                    </button>
                                  )}
                                {mine && state.phase === "turn" && me?.city.some((x) => x.key === "armory") && !(p.id === state.me && c.key === "armory") && <button disabled={busy || !!state.restricted || !t || !!t.choices.length || p.cityCount >= state.target} onClick={() => setConfirmation({title:`拆除自己的军械库，同时拆除 ${p.name} 的${c.name}？`,action:{type:"armory",target:p.id,card:c.id}})}>军械库：同时拆除此建筑</button>}
                                {mine &&
                                  state.phase === "turn" &&
                                  rid === 9 &&
                                  p.id === state.me && (
                                    <button
                                      disabled={
                                        busy ||
                                        !!state.restricted || c.decorated ||
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
              <section className="table-note operation-settings"><h3>操作设置</h3><label><input type="checkbox" role="switch" checked={confirmBuild} onChange={e=>{setConfirmBuild(e.target.checked);try{localStorage.setItem("citadels-confirm-build",e.target.checked?"on":"off");}catch{}}}/>建造前再次确认</label><p>默认开启，只影响你当前设备。确认窗口显示金币和手牌费用；取消不会扣资源。</p></section>
              {state.phase!=="lobby" && <section className="table-note"><h3>{state.mode==="classic"?"经典":"进阶"} · 本局角色阵容</h3><div className="cast-list">{state.cast.map((_,i)=><button key={i} onClick={()=>setRoleInfo(roleAt(state,i+1).id)}>{i+1} · {roleAt(state,i+1).name}</button>)}</div>{state.cast.includes(27) && <p>房产税池：{state.taxPool} 金币</p>}{state.bewitched>0 && <p>巫术目标：{roleAt(state,state.bewitched).name}</p>}{state.warrants && <p>逮捕令：{state.warrants.marked.map(r=>roleAt(state,r).name).join("、")}{state.warrants.signed>0 ? `；你的真令：${roleAt(state,state.warrants.signed).name}` : "（真假隐藏）"}</p>}{state.threats && <p>威胁：{state.threats.marked.map(r=>roleAt(state,r).name).join("、")}</p>}</section>}

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
      {tutorial && <Tutorial onClose={closeTutorial} />}
      {catalogOpen && state && <GameDialog title="本局独特建筑" onClose={() => setCatalogOpen(false)} className="catalog-dialog">
        <div className="eyebrow">THIS GAME · 14 UNIQUE DISTRICTS</div><h2>本局独特建筑</h2><p>本局使用以下 14 种独特建筑，以及全部 54 张普通建筑。这里只显示入选名单，不显示牌在谁手中或抽牌顺序。</p>
        <div className="cards">{cardCatalog.filter((c) => state.uniqueKeys.includes(c.key)).map((c) => <District key={c.key} card={{...c,id:c.key}} />)}</div>
      </GameDialog>}
      {roleInfo !== null && <GameDialog title="角色卡详情" onClose={() => setRoleInfo(null)} className="card-dialog">
        <img src={`/cards/role-${roleInfo}.webp`} alt={`${roles[roleInfo - 1].name}原版角色卡`} />
        <div><div className="eyebrow">角色 {roles[roleInfo - 1].rank} · {roles[roleInfo - 1].en}</div><h2>{roles[roleInfo - 1].name}</h2><p>{roles[roleInfo - 1].text}</p><p>角色按编号从小到大行动。每项能力每个角色回合限用一次；结束后要等下一轮重新选角。</p></div>
      </GameDialog>}
      {freeBuild && <GameDialog title="免费建造" onClose={() => setFreeBuild(null)}>
        <h2>免费建造{freeBuild.name}</h2><p>选择一座自己的建筑拆除，代替支付金币。被拆建筑和博物馆藏牌会回到牌库底。</p>
        <div className="button-row">{me?.city.filter((c) => c.key === "framework" || freeBuild.key === "necropolis").map((c) => <button key={c.id} disabled={busy} onClick={() => { requestBuild({type:"build",card:freeBuild.id,sacrifice:c.id},freeBuild); setFreeBuild(null); }}>拆除{c.name}</button>)}</div>
      </GameDialog>}
      {confirmation && <GameDialog title="确认建筑操作" onClose={() => setConfirmation(null)}><h2>{confirmation.title}</h2><div className="button-row"><button className="primary" disabled={busy} onClick={() => { act(confirmation.action); setConfirmation(null); }}>确认操作</button><button onClick={() => setConfirmation(null)}>取消</button></div></GameDialog>}
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
              角色：王冠持有者先亲手暗弃一张，再选第一个身份；第二人选并弃，第一人再选并弃，第二人最后选。3
              人使用九角色：每人先选一次，系统随机暗弃一张，再每人选一次。两个角色共用城市、手牌和金币，分别行动；每个角色回合的能力与建造额度重新计算。
            </p>
            <h3>收税时机</h3><p>未注明特定时机的角色能力，每回合可在自己的回合内使用一次。可以先建造再收税，计算使用能力时的当前城市；收税后再建造则不能再次收税。女巫、勒索等有指定时机的能力按提示处理。</p>
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
                <button className="reference-role" key={r.id} onClick={() => setRoleInfo(r.id)}>
                  <img src={`/cards/role-${r.id}.webp`} alt={`${r.name}原版角色卡`} loading="lazy" />
                  <span><b>{r.rank} · {r.name}</b>{r.text}</span>
                </button>
              ))}
            </div>
            <h3>独特建筑 · 全部 30 种</h3>
            <p>
              每局从 30 种独特建筑中随机选 14 种，和 54 张普通建筑混合。
              以下是完整独特建筑速查；中文名称为本项目译名，点击卡面可放大阅读。
            </p>
            <div className="reference-roles">
              {cardCatalog
                .filter((c) => c.color === "unique")
                .map((c) => (
                  <District key={c.key} card={{...c,id:c.key}} />
                ))}
            </div>
            <h3>保存与重连</h3>
            <p>
              房间状态自动保存在服务器。刷新当前标签页会恢复席位；跨设备或关闭标签页前，请从“恢复密钥”保存你的私人密钥。邀请链接可分享，恢复密钥只属于你。
            </p>
            <p>
              已实现全部 27 角色及 30 种独特建筑。经典模式使用基础 8 角色，3／8 人加入艺术家；进阶模式每编号各选一个，二人禁用皇帝、少于五人禁用王后。新手教学可单人练习，正式房间需要 2–8 人。
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
