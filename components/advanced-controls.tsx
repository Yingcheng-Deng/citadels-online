"use client";
import { useState } from "react";
import { roleAt, type GameView, type Action, type Card, type Color } from "../lib/game";

type Props = { state:GameView; busy:boolean; act:(a:Action)=>void; build:(a:Action,c:Card)=>void; cardinalTarget:string; setCardinalTarget:(id:string)=>void };
const types: [Color,string][] = [["noble","贵族"],["religious","宗教"],["trade","商业"],["military","军事"],["unique","独特"]];
export function AdvancedControls({state:s,busy,act,build,cardinalTarget,setCardinalTarget}:Props) {
  const me = s.players.find(p => p.id === s.me)!;
  const others = s.players.filter(p => p.id !== s.me);
  const t = s.turn, rid = roleAt(s,s.role)?.id;
  const [target,setTarget] = useState(others[0]?.id || "");
  const [color,setColor] = useState<Color>("trade");
  const [marked,setMarked] = useState<number[]>([]);
  const [truth,setTruth] = useState(0);
  const [ownCard,setOwnCard] = useState("");
  const [gold,setGold] = useState(0);
  const [selectedCard,setSelectedCard] = useState("");
  const can = (key:string) => !!t && !busy && !s.restricted && !t.choices.length && !t.used.includes(key);
  const players = <label>选择玩家<select value={target} onChange={e=>setTarget(e.target.value)}>{others.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>;
  const roleButtons = (type:string) => <div className="button-row">{s.cast.map((_,i)=>i+1).filter(r=>r!==s.role).map(r=><button key={r} disabled={busy || !t?.gathered} onClick={()=>act({type,role:r})}>{r} · {roleAt(s,r).name}</button>)}</div>;
  if (s.pending) {
    const q = s.pending;
    if (q.actor !== s.me) return <p className="lesson-note">等待 {s.players.find(p=>p.id===q.actor)?.name} 处理{q.kind === "warrant" ? "逮捕令" : q.kind === "emperor" ? "皇帝遗命" : "勒索威胁"}。</p>;
    if (q.kind === "bribe") return <div className="reaction"><h3>你受到勒索威胁</h3><p>你不知道标记真假。支付一半金币可直接解除；拒绝后由勒索者决定是否揭示。</p><button disabled={busy} onClick={()=>act({type:"bribe"})}>支付 {Math.floor(me.gold/2)} 金币解除</button><button disabled={busy} onClick={()=>act({type:"refuse"})}>拒绝，等待对方揭示</button></div>;
    if (q.kind === "blackmail") return <div className="reaction"><h3>目标拒绝支付勒索费</h3><p>此标记为{s.threats?.real === s.role ? "真威胁，揭示可收走全部金币" : "假威胁，揭示不会收取金币"}。</p><button disabled={busy} onClick={()=>act({type:"revealThreat"})}>揭示标记</button><button disabled={busy} onClick={()=>act({type:"passReaction"})}>放过</button></div>;
    if (q.kind === "warrant") return <div className="reaction"><h3>法官：是否没收{q.card?.name}？</h3><p>没收后建筑进入你的城市，对方收回 {q.paid} 金币。此标记为{s.warrants?.signed === s.role ? "真令" : "假令"}；假令或已有同名建筑时不能没收。</p><button disabled={busy || s.warrants?.signed !== s.role || me.city.some(c=>c.key===q.card?.key)} onClick={()=>act({type:"confiscate"})}>揭示真令，没收建筑</button><button disabled={busy} onClick={()=>act({type:"passReaction"})}>放过此次建造</button></div>;
    return <div className="reaction"><h3>皇帝遗命：转交王冠</h3>{others.filter(p=>p.id!==s.crown).map(p=><button key={p.id} disabled={busy} onClick={()=>act({type:"crown",target:p.id})}>交给 {p.name}</button>)}</div>;
  }
  if (!t) return null;
  if (t.choices.length) return null;
  if (t.owed?.length) return <div className="reaction"><h3>先知：逐一归还一张手牌</h3><label>归还的牌<select value={selectedCard} onChange={e=>setSelectedCard(e.target.value)}><option value="">请选择</option>{me.hand.map(c=><option key={c.id} value={c.id}>{c.name} · {c.cost}</option>)}</select></label>{t.owed.map(id=><button key={id} disabled={busy || !selectedCard} onClick={()=>{act({type:"seerGive",target:id,card:selectedCard});setSelectedCard("");}}>交给 {s.players.find(p=>p.id===id)?.name}</button>)}</div>;
  return <div className="advanced-controls">
    {rid === 10 && <div className="power"><h3>采集后必须指定施巫术角色</h3>{roleButtons("bewitch")}</div>}
    {[11,13].includes(rid) && <div className="power"><h3>{rid===11 ? "逮捕令：选 3 个角色，一真两假" : "威胁：选 2 个角色，一真一假"}</h3>
      <div className="marker-options">{s.cast.map((_,i)=>i+1).filter(r=>r>1 && r!==s.role && (rid===11 || (r!==s.killed && r!==s.bewitched))).map(r=><label key={r}><input type="checkbox" checked={marked.includes(r)} disabled={!can("power")} onChange={e=>{setMarked(e.target.checked?[...marked,r]:marked.filter(x=>x!==r));if(truth===r)setTruth(0);}}/>{r} · {roleAt(s,r).name}</label>)}</div>
      <label>真实标记（仅你可见）<select value={truth} onChange={e=>setTruth(Number(e.target.value))}><option value={0}>请选择</option>{marked.map(r=><option key={r} value={r}>{roleAt(s,r).name}</option>)}</select></label><button disabled={!can("power") || marked.length!==(rid===11?3:2) || !truth} onClick={()=>act({type:rid===11?"warrants":"threats",ranks:marked,role:truth})}>秘密分配标记</button>
    </div>}
    {[12,14].includes(rid) && !t.inspected && <div className="power"><h3>{rid===12 ? "间谍：指定类别并查看手牌" : "巫师：查看并取走一张手牌"}</h3>{players}{rid===12 && <label>建筑类别<select value={color} onChange={e=>setColor(e.target.value as Color)}>{types.map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label>}<button disabled={!can("power")} onClick={()=>act({type:rid===12?"spy":"wizard",target,color})}>查看所选玩家手牌</button></div>}
    {t.inspected && <div className="power"><h3>仅你可见：查看到的手牌</h3><div className="inspected-cards">{t.inspected.cards.map(c=><article key={c.id}><img src={`/cards/${c.key}.webp`} alt={`${c.name}原版卡面`}/><h4>{c.name} · {c.cost} 金币</h4><p>{c.text}</p>{t.inspected?.kind==="wizard" && <><button disabled={busy} onClick={()=>act({type:"wizardTake",card:c.id})}>放入手牌</button><button disabled={busy || !t.gathered || c.key==="secretvault"} onClick={()=>build({type:"wizardBuild",card:c.id,sacrifice:ownCard || undefined},c)}>立即建造 · 不占次数</button></>}</article>)}</div>{t.inspected.kind==="wizard" && <label>可选：用自己的脚手架免费建造（墓园可选任何自己的建筑）<select value={ownCard} onChange={e=>setOwnCard(e.target.value)}><option value="">正常支付金币</option>{me.city.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label>}</div>}
    {rid===15 && <button disabled={!can("power")} onClick={()=>act({type:"seer"})}>先知：随机取牌，然后逐一归还</button>}
    {rid===16 && <div className="power"><h3>必须转交王冠</h3>{others.filter(p=>p.id!==s.crown).map(p=><div className="button-row" key={p.id}><span>{p.name}</span><button disabled={!can("crown") || (!p.gold && !!p.handCount)} onClick={()=>act({type:"crown",target:p.id,choice:"gold"})}>交王冠，取 1 金币{!p.gold && !p.handCount ? "（无资源可取）" : ""}</button><button disabled={!can("crown") || !p.handCount} onClick={()=>act({type:"crown",target:p.id,choice:"card"})}>交王冠，随机取 1 张牌</button></div>)}</div>}
    {rid===18 && <div className="power"><h3>修道院长：选择税收组合</h3><label>获得金币数（其余获得牌）<input type="number" min={0} max={me.city.filter(c=>c.color==="religious" || c.key==="school").length} value={gold} onChange={e=>setGold(Number(e.target.value))}/></label><button disabled={!can("tax")} onClick={()=>act({type:"tax",gold})}>领取所选金币和牌</button><div className="button-row">{others.filter(p=>p.gold===Math.max(...s.players.map(x=>x.gold)) && p.gold>me.gold).map(p=><button key={p.id} disabled={!can("alms")} onClick={()=>act({type:"abbot",target:p.id})}>让最富的 {p.name} 给你 1 金币</button>)}</div></div>}
    {rid===19 && <label className="lesson-note">红衣主教借款对象：建造缺钱时，先勾选恰好所缺金币数量的手牌，再点建造<select value={cardinalTarget} onChange={e=>setCardinalTarget(e.target.value)}><option value="">不借款，正常建造</option>{others.map(p=><option key={p.id} value={p.id}>{p.name} · {p.gold} 金币</option>)}</select></label>}
    {rid===22 && <div className="button-row"><button disabled={!can("bonus")} onClick={()=>act({type:"navigator",choice:"gold"})}>航海家：额外 4 金币</button><button disabled={!can("bonus")} onClick={()=>act({type:"navigator",choice:"cards"})}>航海家：额外 4 张牌</button></div>}
    {rid===23 && <button disabled={!can("bonus")} onClick={()=>act({type:"scholar"})}>学者：抽 7 张牌，保留 1 张</button>}
    {[24,25].includes(rid) && <div className="power"><h3>{rid===24?"外交官交换建筑":"元帅夺取建筑"}</h3>{players}{rid===24 && <label>交出自己的建筑<select value={ownCard} onChange={e=>setOwnCard(e.target.value)}><option value="">请选择</option>{me.city.map(c=><option value={c.id} key={c.id}>{c.name} · {c.cost+(c.decorated?1:0)} 金币</option>)}</select></label>}<div className="button-row">{s.players.find(p=>p.id===target)?.city.map(c=><button key={c.id} disabled={!can("power") || (rid===24&&!ownCard) || c.key==="keep" || (rid===25&&c.cost+(c.decorated?1:0)>3)} onClick={()=>act({type:rid===24?"exchangeDistrict":"seize",target,card:c.id,sacrifice:ownCard})}>{rid===24?"交换":"夺取"}{c.name}</button>)}</div><p>对方完城、主教保护、同名冲突或金币不足时不能执行。长城会增加 1 金币费用。</p></div>}
    {rid===27 && <button disabled={!can("collect")} onClick={()=>act({type:"collect"})}>税务官：领取税池 {s.taxPool} 金币</button>}
  </div>;
}
