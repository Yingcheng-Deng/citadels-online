"use client";
import { useState } from "react";
import { GameDialog } from "./game-dialog";

const titles = ["欢迎来到圆桌", "先获得本轮身份", "采集：金币或建筑牌", "把手牌建成城市", "使用角色能力", "结束回合，继续下一位", "你已经可以开局了"];
export function Tutorial({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [gold, setGold] = useState(2);
  const [picked, setPicked] = useState(false);
  const [gathered, setGathered] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [built, setBuilt] = useState(false);
  const [bonus, setBonus] = useState(false);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const ready = step === 0 || (step === 1 && picked) || (step === 2 && gathered) || (step === 3 && built) || (step === 4 && bonus) || (step === 5 && answer === "round");
  function finish() {
    try { localStorage.setItem("citadels-tutorial-completed", "yes"); } catch {}
    onClose();
  }
  return <GameDialog title="新手教学" onClose={onClose} className="tutorial-dialog">
    <div className="eyebrow">LEARN BY PLAYING · 约 3 分钟</div>
    <h2>{titles[step]}</h2>
    <div className="tutorial-progress" aria-label={`教学第 ${step + 1} 步，共 7 步`}>
      {titles.map((title, index) => <span key={title} className={index <= step ? "done" : ""} />)}
    </div>
    {step > 0 && step < 6 && <div className="practice-status"><b>◉ 金币 {gold}</b><span>城市 {built ? 1 : 0} 座</span><span>{picked ? "本轮身份：商人" : "身份待选"}</span></div>}
    {step === 0 && <>
      <p>你要用金币建造城市，争取最高分。角色每轮重新选择，城市、手牌和金币会保留。</p>
      <div className="lesson-grid"><div><b>① 每轮选角色</b><p>角色决定行动顺序和特殊能力。</p></div><div><b>② 采集与建造</b><p>拿资源、建建筑，再使用能力。</p></div><div><b>③ 比较总分</b><p>建筑造价是基础得分，五色与紫色建筑还有奖励。</p></div></div>
      <p className="lesson-note">这是独立练习，不需要朋友在线，也不会修改你的真实房间。</p>
    </>}
    {step === 1 && <>
      <p>二人局先由首位玩家亲手暗弃一张牌背，再开始选角。本网站采用盲选：点一张牌背，选中后只有你能看到身份。练习中你会获得商人。</p>
      <div className="practice-cards">{[0, 1, 2].map((i) => <button key={i} className="practice-back" disabled={picked} aria-label={`练习盲选第 ${i + 1} 张角色牌`} onClick={() => { setPicked(true); setFeedback("你获得了 6 号商人！数字越小，行动越早。别人看不到你的身份，直到轮到你。基本角色：刺客→盗贼→魔术师→国王→主教→商人→建筑师→军阀；3/8 人另有艺术家。"); }}>?</button>)}</div>
      <p className="lesson-note">规则区别：实体桌游是查看可选角色后秘密挑选；网站按房间玩法采用盲选。2–3 人每轮各有两个身份，4–8 人各有一个。</p>
    </>}
    {step === 2 && <>
      <p>每个角色回合必须采集一次：拿 2 金币，或者抽 2 张建筑牌保留 1 张。只能二选一。</p>
      <div className="button-row"><button disabled={gathered || choosing} onClick={() => { setGold(gold + 2); setGathered(true); setFeedback("已获得 2 金币。这次不能再选择抽牌，金币可以留到后续回合。"); }}>练习：拿 2 金币</button><button disabled={gathered || choosing} onClick={() => { setChoosing(true); setFeedback("选一张保留，另一张回到牌库底。建筑牌在手里时还不生效。"); }}>练习：抽 2 张牌</button></div>
      {choosing && !gathered && <div className="button-row">{["酒馆 · 1 金币", "城堡 · 4 金币"].map((name) => <button key={name} onClick={() => { setGathered(true); setFeedback(`已保留${name}；另一张放回牌库底。下面用开局手里的神殿练习建造。`); }}>保留{name}</button>)}</div>}
    </>}
    {step === 3 && <>
      <p>采集后，可以支付建筑造价，把一张手牌放进自己的城市。普通角色每回合最多建 1 座，同名建筑通常不能重复。</p>
      <div className="practice-building"><span>宗教 · 蓝色</span><h3>神殿</h3><p>造价 1 金币 · 终局基础得分 1 分</p><button className="primary" disabled={built} onClick={() => { setGold(gold - 1); setBuilt(true); setFeedback("神殿建好了！金币减 1，城市多 1 座。手牌只提供建造机会，城市中的建筑才计分。紫色独特建筑还会提供卡面描述的能力。"); }}>{built ? "已建造" : "练习：支付 1 金币建造"}</button></div>
    </>}
    {step === 4 && <>
      <p>商人每回合可以额外拿 1 金币；还可以按城市中的绿色商业建筑收税。每种角色能力各限一次，与采集资源分开计算。收税可以在建造后发动，新建的绿色建筑也会计入。</p>
      <button disabled={bonus} onClick={() => { setGold(gold + 1); setBonus(true); setFeedback("已使用商人能力！本回合神殿是蓝色，不提供商业税收。建筑师可以额外抽 2 张牌并建最多 3 座，其他角色也有各自能力。"); }}>练习：商人额外 1 金币</button>
      <p>提示：鼠标点击卡面可放大阅读；手机也可以轻点。特殊建筑在建成后才生效。</p>
    </>}
    {step === 5 && <>
      <p>确认采集、建造和想用的能力都完成后，点“结束回合”。所有角色轮完，再开始新一轮选角。</p>
      <p><b>小问题：4–8 人局中，有人建到第 7 座建筑，什么时候结算？</b></p>
      <div className="lesson-answers"><button onClick={() => { setAnswer("now"); setFeedback("还不是马上结束。其余角色仍有机会在这一轮行动。2–3 人局的完城目标是 8 座。"); }}>立即停止游戏</button><button onClick={() => { setAnswer("round"); setFeedback("答对了！完成本轮剩余角色回合后再结算。最先完城不一定获胜，最后比较总分。"); }}>完成本轮剩余角色回合后</button></div>
    </>}
    {step === 6 && <>
      <p>记住这个顺序：<b>选身份 → 采集 → 建造 / 能力 → 结束回合</b>。</p>
      <div className="lesson-note">得分 = 城市建筑造价 + 五色齐全 3 分 + 首位完城 4 分（其他完城 2 分）+ 独特建筑奖励。</div>
      <p>每局随机选入 14 种独特建筑，和 54 张普通建筑一起洗牌；游戏中可以查看“本局独特建筑”。</p>
      <p>创建时可选经典或进阶模式；经典以基础角色为主，进阶从全部 27 角色按每个编号各选一位组阵。建造确认默认开启，可在操作设置中关闭。复制链接或房间号邀请朋友，所有人准备后由房主开局。刷新可恢复席位；跨设备前保存自己的恢复密钥。</p>
      <button className="primary full" onClick={finish}>完成教学，去圆桌</button>
    </>}
    {feedback && step < 6 && <p className="lesson-feedback" role="status">{feedback}</p>}
    {step < 6 && <div className="tutorial-footer"><button className="text-button" onClick={onClose}>稍后再学</button><span>{step + 1} / 7</span><button className="primary" disabled={!ready} onClick={() => { setStep(step + 1); setFeedback(""); }}>{step === 0 ? "开始练习 →" : "下一步 →"}</button></div>}
  </GameDialog>;
}
