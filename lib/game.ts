// Pure authoritative rules engine. Never send Game directly to a client; use view().
export type Color = "noble" | "religious" | "trade" | "military" | "unique";
export type Card = {
  id: string;
  key: string;
  name: string;
  cost: number;
  color: Color;
  text: string;
  decorated?: boolean;
  stored?: Card[];
};
export type Player = {
  id: string;
  secret: string;
  name: string;
  gold: number;
  hand: Card[];
  city: Card[];
  roles: number[];
  revealed: number[];
  ready: boolean;
};
export type Turn = {
  gathered: boolean;
  built: number;
  used: string[];
  choices: Card[];
  decorated: string[];
};
export type Game = {
  code: string;
  host: string;
  players: Player[];
  phase: "lobby" | "draft" | "turn" | "finished";
  round: number;
  crown: string;
  deck: Card[];
  available: number[];
  faceup: number[];
  facedown: number;
  draftOrder: string[];
  draftIndex: number;
  discardPending: boolean;
  active: string;
  role: number;
  killed: number;
  robbed: number;
  thief: string;
  turn: Turn;
  firstComplete: string;
  log: string[];
  scores: ReturnType<typeof score>[];
  roleCount: number;
  target: number;
  uniqueKeys?: string[];
  theaterPending?: string;
};
export type Action = {
  type: string;
  role?: number;
  slot?: number;
  target?: string;
  card?: string;
  cards?: string[];
  gold?: number;
  name?: string;
  sacrifice?: string;
};
export const roles = [
  {
    id: 1,
    name: "刺客",
    en: "Assassin",
    icon: "†",
    text: "指定一个其他角色，跳过其本轮回合。",
  },
  {
    id: 2,
    name: "盗贼",
    en: "Thief",
    icon: "◈",
    text: "指定可盗取的角色；对方被叫到时，拿走其全部金币。",
  },
  {
    id: 3,
    name: "魔术师",
    en: "Magician",
    icon: "✧",
    text: "与一位玩家交换全部手牌，或弃任意手牌并抽取等量新牌。",
  },
  {
    id: 4,
    name: "国王",
    en: "King",
    icon: "♛",
    text: "获得王冠。可按贵族建筑数量收取金币。",
  },
  {
    id: 5,
    name: "主教",
    en: "Bishop",
    icon: "♧",
    text: "本轮城市免受军阀破坏。可按宗教建筑数量收取金币。",
  },
  {
    id: 6,
    name: "商人",
    en: "Merchant",
    icon: "◉",
    text: "可额外获得 1 金币，并按商业建筑数量收税。",
  },
  {
    id: 7,
    name: "建筑师",
    en: "Architect",
    icon: "⌂",
    text: "可额外抽取 2 张牌，本回合最多建造 3 座建筑。",
  },
  {
    id: 8,
    name: "军阀",
    en: "Warlord",
    icon: "⚔",
    text: "可按军事建筑数量收税；支付一座建筑造价减 1 的金币将其拆除。",
  },
  {
    id: 9,
    name: "艺术家",
    en: "Artist",
    icon: "❋",
    text: "可美化最多 2 座不同建筑，每座付 1 金币；造价与得分永久 +1。",
  },
];
const definitions: [string, string, number, Color, number, string][] = [
  ["manor", "庄园", 3, "noble", 5, ""],
  ["castle", "城堡", 4, "noble", 4, ""],
  ["palace", "宫殿", 5, "noble", 3, ""],
  ["temple", "神殿", 1, "religious", 3, ""],
  ["church", "教堂", 2, "religious", 3, ""],
  ["monastery", "修道院", 3, "religious", 3, ""],
  ["cathedral", "大教堂", 5, "religious", 2, ""],
  ["tavern", "酒馆", 1, "trade", 5, ""],
  ["market", "市场", 2, "trade", 4, ""],
  ["trading", "商栈", 2, "trade", 3, ""],
  ["docks", "码头", 3, "trade", 3, ""],
  ["harbor", "港口", 4, "trade", 3, ""],
  ["townhall", "市政厅", 5, "trade", 2, ""],
  ["watchtower", "瞭望塔", 1, "military", 3, ""],
  ["prison", "监狱", 2, "military", 3, ""],
  ["barracks", "兵营", 3, "military", 3, ""],
  ["fortress", "要塞", 5, "military", 2, ""],
  ["dragon", "龙门", 6, "unique", 1, "终局额外获得 2 分。"],
  ["factory", "工厂", 5, "unique", 1, "建造其他独特建筑少支付 1 金币。"],
  ["haunted", "幽灵区", 2, "unique", 1, "终局可作为一种其他颜色计算五色奖励。"],
  ["treasury", "帝国宝库", 5, "unique", 1, "终局每枚剩余金币额外获得 1 分。"],
  ["keep", "堡垒", 3, "unique", 1, "军阀不能拆除此建筑。"],
  [
    "laboratory",
    "实验室",
    5,
    "unique",
    1,
    "每回合可弃 1 张手牌，获得 2 金币。",
  ],
  [
    "library",
    "图书馆",
    6,
    "unique",
    1,
    "采集资源选择抽牌时，保留全部抽到的牌。",
  ],
  ["maproom", "地图室", 5, "unique", 1, "终局每张手牌额外获得 1 分。"],
  ["quarry", "采石场", 5, "unique", 1, "允许建造同名建筑。"],
  ["school", "魔法学校", 6, "unique", 1, "角色收税时，可视为对应的建筑颜色。"],
  ["smithy", "铁匠铺", 5, "unique", 1, "每回合可付 2 金币抽 3 张牌。"],
  ["statue", "雕像", 3, "unique", 1, "终局持有王冠额外获得 5 分。"],
  ["den", "盗贼窝", 6, "unique", 1, "建造时可弃手牌，每张抵扣 1 金币。"],
  [
    "well",
    "许愿井",
    5,
    "unique",
    1,
    "终局每座独特建筑（包括自身）额外获得 1 分。",
  ],
  ["armory", "军械库", 3, "unique", 1, "自己的回合可拆除军械库，同时拆除另一座建筑。不能拆除完工城市中的目标。"],
  ["basilica", "圣殿", 4, "unique", 1, "终局每座造价为奇数的建筑额外得 1 分，美化后的造价也计算在内。"],
  ["capitol", "议会大厦", 5, "unique", 1, "终局若有至少 3 座同一类别的建筑，额外得 3 分。此奖励只计算一次。"],
  ["framework", "脚手架", 3, "unique", 1, "建造另一座建筑时，可拆除脚手架代替支付金币。仍占用正常建造次数。"],
  ["goldmine", "金矿", 6, "unique", 1, "采集资源选择金币时，额外获得 1 金币。"],
  ["greatwall", "长城", 6, "unique", 1, "军阀拆除你城内其他建筑时，须额外支付 1 金币。长城自身不受此保护。"],
  ["ivorytower", "象牙塔", 5, "unique", 1, "终局若象牙塔是城市中唯一的独特建筑，额外得 5 分。"],
  ["monument", "纪念碑", 4, "unique", 1, "城市中已有 5 座或更多建筑时不能建造。判断城市完工时算作 2 座，其他计数仍算 1 座。"],
  ["museum", "博物馆", 4, "unique", 1, "每个角色回合可将 1 张手牌暗藏于此。终局每张藏牌额外得 1 分；本馆被拆时藏牌回到牌库底。"],
  ["necropolis", "墓园", 5, "unique", 1, "建造时可拆除自己城市中的另一座建筑，代替支付墓园的金币费用。"],
  ["observatory", "天文台", 4, "unique", 1, "采集资源选择抽牌时，改为抽 3 张、保留 1 张。与图书馆同时拥有时全部保留。"],
  ["park", "公园", 6, "unique", 1, "自己的角色回合结束时，若没有手牌，获得 2 张建筑牌。"],
  ["poorhouse", "济贫院", 4, "unique", 1, "自己的角色回合结束时，若金币为 0，获得 1 金币。"],
  ["secretvault", "秘密金库", 0, "unique", 1, "不能建造。游戏结束时，若仍在自己手中，展示此牌并额外得 3 分。"],
  ["stables", "马厩", 2, "unique", 1, "建造马厩不占用本角色回合的建造次数，仍需支付造价。"],
  ["theater", "剧院", 6, "unique", 1, "所有人选角后、角色行动前，可与另一位玩家交换身份。双角色局中，选择自己的一个角色，随机换取对方的一个。"],
];
export const cardCatalog = definitions.map(
  ([key, name, cost, color, count, text]) => ({
    key,
    name,
    cost,
    color,
    count,
    text,
  }),
);
function random(n: number) {
  const a = new Uint32Array(1);
  const max = Math.floor(4294967296 / n) * n;
  do {
    crypto.getRandomValues(a);
  } while (a[0] >= max);
  return a[0] % n;
}
function shuffle<T>(a: T[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function newDeck(uniqueKeys?: string[]) {
  const unique = cardCatalog.filter((c) => c.color === "unique");
  if (!uniqueKeys) {
    // Include low, middle and high costs, then sample the rest without replacement.
    const groups = [unique.filter((c) => c.cost <= 3), unique.filter((c) => c.cost === 4), unique.filter((c) => c.cost >= 5)];
    const seed = groups.map((group) => group[random(group.length)].key);
    uniqueKeys = [...seed, ...shuffle(unique.filter((c) => !seed.includes(c.key))).slice(0, 11).map((c) => c.key)];
  }
  check(uniqueKeys.length === 14 && new Set(uniqueKeys).size === 14 && uniqueKeys.every((key) => unique.some((c) => c.key === key)), "每局需要 14 种不同的独特建筑");
  return shuffle(
    definitions.filter(([key, , , color]) => color !== "unique" || uniqueKeys!.includes(key)).flatMap(([key, name, cost, color, n, text]) =>
      Array.from({ length: n }, (_, i) => ({
        id: `${key}-${i}`,
        key,
        name,
        cost,
        color,
        text,
      })),
    ),
  );
}
function check(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
const emptyTurn = (): Turn => ({
  gathered: false,
  built: 0,
  used: [],
  choices: [],
  decorated: [],
});
function log(g: Game, s: string) {
  g.log.push(s);
  if (g.log.length > 150) g.log.shift();
}
export function newPlayer(id: string, secret: string, name: string): Player {
  return {
    id,
    secret,
    name: name.trim().slice(0, 20),
    gold: 0,
    hand: [],
    city: [],
    roles: [],
    revealed: [],
    ready: false,
  };
}
export function newGame(code: string, p: Player): Game {
  return {
    code,
    host: p.id,
    players: [p],
    phase: "lobby",
    round: 0,
    crown: p.id,
    deck: [],
    available: [],
    faceup: [],
    facedown: 0,
    draftOrder: [],
    draftIndex: 0,
    discardPending: false,
    active: "",
    role: 0,
    killed: 0,
    robbed: 0,
    thief: "",
    turn: emptyTurn(),
    firstComplete: "",
    log: [`${p.name} 创建了房间`],
    scores: [],
    roleCount: 8,
    target: 8,
  };
}
export function addPlayer(g: Game, p: Player) {
  check(g.phase === "lobby", "对局已开始，不能加入新玩家");
  check(g.players.length < 8, "房间已满");
  check(!g.players.some((x) => x.name === p.name), "这个昵称已被使用");
  if (!g.players.length) {
    g.host = p.id;
    g.crown = p.id;
  }
  g.players.push(p);
  log(g, `${p.name} 加入了圆桌`);
}
const has = (p: Player, key: string) => p.city.some((c) => c.key === key);
export const citySize = (p: Pick<Player, "city">) => p.city.length + p.city.filter((c) => c.key === "monument").length;
const draw = (g: Game, n: number) => g.deck.splice(0, n);
const owner = (g: Game, r: number) =>
  g.players.find((p) => p.roles.includes(r));
const totalCost = (c: Card) => c.cost + (c.decorated ? 1 : 0);
function draft(g: Game) {
  g.theaterPending = "";
  g.phase = "draft";
  g.round++;
  g.role = 0;
  g.killed = 0;
  g.robbed = 0;
  g.thief = "";
  g.turn = emptyTurn();
  g.players.forEach((p) => {
    p.roles = [];
    p.revealed = [];
  });
  const rs = shuffle(Array.from({ length: g.roleCount }, (_, i) => i + 1));
  g.faceup = [];
  const n = g.players.length;
  if (n >= 4) {
    const count = Math.max(0, g.roleCount - n - 2);
    for (let i = 0; i < count; i++) {
      const idx = rs.findIndex((r) => r !== 4);
      g.faceup.push(rs.splice(idx, 1)[0]);
    }
  }
  g.facedown = rs.pop()!;
  g.available = rs;
  const start = g.players.findIndex((p) => p.id === g.crown);
  const order = [...g.players.slice(start), ...g.players.slice(0, start)].map(
    (p) => p.id,
  );
  g.draftOrder = n <= 3 ? [...order, ...order] : order;
  g.draftIndex = 0;
  g.discardPending = false;
  g.active = g.draftOrder[0];
  log(g, `第 ${g.round} 轮 · 开始秘密选角`);
}
function start(g: Game) {
  const n = g.players.length;
  check(n >= 2 && n <= 8, "需要 2–8 位玩家");
  check(
    g.players.every((p) => p.ready),
    "请等待所有玩家准备",
  );
  g.roleCount = n === 3 || n === 8 ? 9 : 8;
  g.target = n <= 3 ? 8 : 7;
  g.deck = newDeck();
  g.uniqueKeys = g.deck.filter((c) => c.color === "unique").map((c) => c.key).sort();
  g.firstComplete = "";
  g.scores = [];
  g.crown = g.players[random(n)].id;
  for (const p of g.players) {
    p.gold = 2;
    p.hand = draw(g, 4);
    p.city = [];
  }
  draft(g);
}
function nextDraft(g: Game) {
  const n = g.players.length;
  if (n === 3 && g.draftIndex === 2) {
    g.available.splice(random(g.available.length), 1);
  }
  g.draftIndex++;
  if (g.draftIndex === g.draftOrder.length) {
    g.available = [];
    const theater = g.players.find((p) => has(p, "theater"));
    if (theater) {
      g.theaterPending = theater.id;
      g.active = theater.id;
    } else beginTurns(g);
    return;
  }
  if (n >= 7 && g.draftIndex === n - 1) {
    g.available.push(g.facedown);
  }
  g.available = shuffle(g.available);
  g.active = g.draftOrder[g.draftIndex];
}
function beginTurns(g: Game) {
  g.theaterPending = "";
  g.phase = "turn";
  g.role = 0;
  advance(g);
}
function destroyDistrict(g: Game, p: Player, card: Card) {
  p.city = p.city.filter((c) => c.id !== card.id);
  const { stored, decorated: _decorated, ...plain } = card;
  g.deck.push(plain, ...(stored || []));
}
function advance(g: Game) {
  g.turn = emptyTurn();
  for (g.role++; g.role <= g.roleCount; g.role++) {
    const p = owner(g, g.role);
    if (!p || g.killed === g.role) continue;
    g.active = p.id;
    p.revealed.push(g.role);
    log(g, `${roles[g.role - 1].name} · ${p.name} 的回合`);
    if (g.role === 4) {
      g.crown = p.id;
      log(g, `${p.name} 获得王冠`);
    }
    if (g.robbed === g.role) {
      const thief = g.players.find((x) => x.id === g.thief)!;
      const amount = p.gold;
      if (thief.id !== p.id) {
        thief.gold += amount;
        p.gold = 0;
      }
      log(g, `${p.name} 的 ${amount} 枚金币被盗贼取走`);
    }
    return;
  }
  if (g.killed === 4) {
    const king = owner(g, 4);
    if (king) {
      g.crown = king.id;
      king.revealed.push(4);
      log(g, `${king.name} 是被刺杀的国王，在轮末获得王冠`);
    }
  }
  if (g.firstComplete) {
    g.phase = "finished";
    g.active = "";
    g.scores = g.players
      .map((p) => score(g, p))
      .sort((a, b) => b.total - a.total || b.highestRole - a.highestRole);
    log(g, `对局结束 · ${g.scores[0].name} 获胜`);
  } else draft(g);
}
export function score(g: Game, p: Player) {
  const buildings = p.city.reduce((s, c) => s + totalCost(c), 0);
  const completion =
    citySize(p) >= g.target ? (g.firstComplete === p.id ? 4 : 2) : 0;
  // Pick the Haunted Quarter color with the best combined bonus, including Ivory Tower/Well/Capitol.
  const variants: Color[] = has(p, "haunted") ? ["unique", "noble", "religious", "trade", "military"] : ["unique"];
  const best = variants.map((hauntedType) => {
    const types = p.city.map((c) => c.key === "haunted" ? hauntedType : c.color);
    const variety = new Set(types).size === 5 ? 3 : 0;
    const uniqueCount = types.filter((color) => color === "unique").length;
    const special = p.city.reduce(
    (s, c) =>
      s +
      (c.key === "dragon"
        ? 2
        : c.key === "treasury"
          ? p.gold
          : c.key === "maproom"
            ? p.hand.length
            : c.key === "statue" && g.crown === p.id
              ? 5
              : c.key === "well"
                ? uniqueCount
                : c.key === "basilica"
                  ? p.city.filter((x) => totalCost(x) % 2 === 1).length
                  : c.key === "capitol" && types.some((color) => types.filter((x) => x === color).length >= 3)
                    ? 3
                    : c.key === "ivorytower" && uniqueCount === 1
                      ? 5
                      : c.key === "museum"
                        ? c.stored?.length || 0
                : 0),
    p.hand.filter((c) => c.key === "secretvault").length * 3,
  );
    return { variety, special, hauntedType };
  }).sort((a, b) => (b.variety + b.special) - (a.variety + a.special))[0];
  const { variety, special, hauntedType } = best;
  return {
    id: p.id,
    name: p.name,
    buildings,
    variety,
    completion,
    special,
    hauntedType: has(p, "haunted") ? hauntedType : null,
    total: buildings + variety + completion + special,
    highestRole: Math.max(...p.revealed, 0),
  };
}
export function apply(g: Game, id: string, a: Action) {
  const p = g.players.find((x) => x.id === id);
  check(p, "玩家不存在");
  if (a.type === "ready") {
    check(g.phase === "lobby", "对局已开始");
    p.ready = !p.ready;
    return;
  }
  if (a.type === "start") {
    check(id === g.host, "只有房主可以开始");
    check(g.phase === "lobby", "对局已开始");
    start(g);
    return;
  }
  if (a.type === "rematch") {
    check(
      id === g.host && g.phase === "finished",
      "只有房主可以在结束后再开一局",
    );
    g.phase = "lobby";
    g.players.forEach((p) => (p.ready = false));
    g.scores = [];
    return;
  }
  if (a.type === "leave") {
    check(g.phase === "lobby", "对局中请保留席位，稍后可重新连接");
    g.players = g.players.filter((x) => x.id !== id);
    if (g.host === id) g.host = g.players[0]?.id || "";
    log(g, `${p.name} 离开了房间`);
    return;
  }
  check(g.active === id, "请等待你的回合");
  if (g.phase === "draft") {
    if (g.theaterPending) {
      check(g.theaterPending === id && has(p, "theater"), "请等待剧院持有者");
      check(a.type === "theater" || a.type === "skipTheater", "请选择交换身份或跳过剧院");
      if (a.type === "theater") {
        const other = g.players.find((x) => x.id === a.target && x.id !== id);
        check(other && other.roles.length > 0, "请选择另一位玩家");
        const own = p.roles.indexOf(a.role!);
        check(own >= 0, "请选择自己的一个身份");
        const their = random(other.roles.length);
        [p.roles[own], other.roles[their]] = [other.roles[their], p.roles[own]];
        log(g, `${p.name} 使用剧院与 ${other.name} 交换了身份`);
      }
      beginTurns(g);
      return;
    }
    check(
      a.type === (g.discardPending ? "discardRole" : "pick"),
      "请完成当前选角步骤",
    );
    // Clients select a face-down position, never a role identity.
    check(a.role === undefined, "请刷新页面后盲选角色");
    check(
      Number.isInteger(a.slot) && a.slot! >= 0 && a.slot! < g.available.length,
      "请选择一张有效的角色牌",
    );
    const [role] = g.available.splice(a.slot!, 1);
    if (g.discardPending) {
      g.discardPending = false;
      nextDraft(g);
      return;
    }
    p.roles.push(role);
    if (g.players.length === 2 && (g.draftIndex === 1 || g.draftIndex === 2)) {
      g.discardPending = true;
      g.available = shuffle(g.available);
      return;
    }
    nextDraft(g);
    return;
  }
  check(g.phase === "turn", "当前不能执行此操作");
  const t = g.turn;
  const use = (key: string) => {
    check(!t.used.includes(key), "本回合已使用此能力");
    t.used.push(key);
  };
  if (a.type === "chooseCard") {
    check(t.choices.length > 0, "没有待选择的牌");
    const c = t.choices.find((c) => c.id === a.card);
    check(c, "请选择一张牌");
    p.hand.push(c);
    g.deck.push(...t.choices.filter((x) => x.id !== c.id));
    t.choices = [];
    return;
  }
  check(t.choices.length === 0, "请先选择保留的建筑牌");
  if (a.type === "gold" || a.type === "cards") {
    check(!t.gathered, "本回合已采集资源");
    t.gathered = true;
    if (a.type === "gold") {
      const amount = has(p, "goldmine") ? 3 : 2;
      p.gold += amount;
      log(g, `${p.name} 采集 ${amount} 金币`);
    } else {
      const cards = draw(g, has(p, "observatory") ? 3 : 2);
      if (has(p, "library") || cards.length <= 1) p.hand.push(...cards);
      else t.choices = cards;
      log(g, `${p.name} 采集建筑牌`);
    }
    return;
  }
  if (a.type === "tax") {
    const color = (
      { 4: "noble", 5: "religious", 6: "trade", 8: "military" } as Record<
        number,
        Color
      >
    )[g.role];
    check(color, "当前角色不能收税");
    use("tax");
    const n = p.city.filter(
      (c) => c.color === color || c.key === "school",
    ).length;
    p.gold += n;
    log(g, `${p.name} 收取 ${n} 金币税收`);
    return;
  }
  if (a.type === "bonus") {
    check(g.role === 6 || g.role === 7, "当前角色没有此能力");
    use("bonus");
    if (g.role === 6) p.gold++;
    else p.hand.push(...draw(g, 2));
    log(g, `${p.name} 使用${roles[g.role - 1].name}的额外资源能力`);
    return;
  }
  if (a.type === "kill" || a.type === "rob") {
    check(g.role === (a.type === "kill" ? 1 : 2), "当前角色没有此能力");
    check(
      Number.isInteger(a.role) && a.role! >= 1 && a.role! <= g.roleCount,
      "请选择有效角色",
    );
    check(a.role !== g.role, "不能指定当前角色");
    if (a.type === "rob")
      check(a.role !== 1 && a.role !== g.killed, "不能盗取刺客或被刺杀的角色");
    use("power");
    if (a.type === "kill") g.killed = a.role!;
    else {
      g.robbed = a.role!;
      g.thief = id;
    }
    log(
      g,
      `${p.name} 指定${roles[a.role! - 1].name}作为${a.type === "kill" ? "刺杀" : "盗窃"}目标`,
    );
    return;
  }
  if (a.type === "swap" || a.type === "redraw") {
    check(g.role === 3, "只有魔术师可以交换手牌");
    use("power");
    if (a.type === "swap") {
      const other = g.players.find((x) => x.id === a.target && x.id !== id);
      check(other, "请选择其他玩家");
      [p.hand, other.hand] = [other.hand, p.hand];
      log(g, `${p.name} 与 ${other.name} 交换了手牌`);
    } else {
      const ids = new Set(a.cards || []);
      check(
        ids.size === (a.cards || []).length &&
          [...ids].every((c) => p.hand.some((x) => x.id === c)),
        "手牌选择无效",
      );
      const removed = p.hand.filter((c) => ids.has(c.id));
      p.hand = p.hand.filter((c) => !ids.has(c.id));
      g.deck.push(...removed);
      p.hand.push(...draw(g, removed.length));
      log(g, `${p.name} 换掉 ${removed.length} 张手牌`);
    }
    return;
  }
  if (a.type === "build") {
    check(t.gathered, "请先采集资源再建造");
    const c = p.hand.find((x) => x.id === a.card);
    check(c, "你没有这张牌");
    check(c.key !== "secretvault", "秘密金库不能建造，请留在手中参与终局计分");
    check(c.key === "stables" || t.built < (g.role === 7 ? 3 : 1), "本回合建造次数已用完");
    const sacrifice = a.sacrifice ? p.city.find((x) => x.id === a.sacrifice) : undefined;
    if (a.sacrifice) {
      check(sacrifice && (sacrifice.key === "framework" || c.key === "necropolis"), "只能使用脚手架，或为墓园拆除自己的建筑");
    }
    const remainingCity = p.city.filter((x) => x.id !== sacrifice?.id);
    check(c.key !== "monument" || remainingCity.length < 5, "已有至少 5 座建筑，不能建造纪念碑");
    check(
      remainingCity.some((x) => x.key === "quarry") || !remainingCity.some((x) => x.key === c.key),
      "城市中已有同名建筑",
    );
    const ids = new Set(a.cards || []);
    check(ids.size === (a.cards || []).length, "抵扣手牌重复");
    check(c.key === "den" || !ids.size, "只有盗贼窝允许用牌抵扣");
    check(!sacrifice || !ids.size, "免费建造不需要抵扣手牌");
    check(
      [...ids].every((x) => x !== c.id && p.hand.some((y) => y.id === x)),
      "抵扣手牌无效",
    );
    const cost = sacrifice ? 0 : Math.max(
      0,
      c.cost - (c.color === "unique" && has(p, "factory") ? 1 : 0),
    );
    check(ids.size <= cost, "抵扣数量超过造价");
    check(p.gold >= cost - ids.size, "金币不足");
    p.gold -= cost - ids.size;
    if (sacrifice) destroyDistrict(g, p, sacrifice);
    g.deck.push(...p.hand.filter((x) => ids.has(x.id)));
    p.hand = p.hand.filter((x) => x.id !== c.id && !ids.has(x.id));
    p.city.push(c);
    if (c.key !== "stables") t.built++;
    log(g, `${p.name} 建造了${c.name}`);
    if (citySize(p) >= g.target && !g.firstComplete) {
      g.firstComplete = id;
      log(g, `${p.name} 首先完成城市，本轮结束后结算`);
    }
    return;
  }
  if (a.type === "destroy") {
    check(g.role === 8, "只有军阀可以拆除");
    const other = g.players.find((x) => x.id === a.target);
    check(other, "请选择城市");
    check(citySize(other) < g.target, "不能拆除已完工城市");
    check(!(other.roles.includes(5) && g.killed !== 5), "主教保护这座城市");
    const c = other.city.find((x) => x.id === a.card);
    check(c, "建筑不存在");
    check(c.key !== "keep", "不能拆除堡垒");
    const cost = Math.max(0, totalCost(c) - 1) + (c.key !== "greatwall" && has(other, "greatwall") ? 1 : 0);
    check(p.gold >= cost, "金币不足");
    use("power");
    p.gold -= cost;
    destroyDistrict(g, other, c);
    log(g, `${p.name} 拆除了 ${other.name} 的${c.name}`);
    return;
  }
  if (a.type === "decorate") {
    check(g.role === 9, "只有艺术家可以美化");
    check(t.decorated.length < 2, "每回合最多美化两座");
    const c = p.city.find((x) => x.id === a.card);
    check(c && !c.decorated, "请选择未美化的建筑");
    check(p.gold >= 1, "金币不足");
    p.gold--;
    c.decorated = true;
    t.decorated.push(c.id);
    log(g, `${p.name} 美化了${c.name}`);
    return;
  }
  if (a.type === "laboratory") {
    check(has(p, "laboratory"), "需要实验室");
    const c = p.hand.find((x) => x.id === a.card);
    check(c, "请选择弃牌");
    use("laboratory");
    p.hand = p.hand.filter((x) => x.id !== c.id);
    g.deck.push(c);
    p.gold += 2;
    log(g, `${p.name} 使用实验室`);
    return;
  }
  if (a.type === "smithy") {
    check(has(p, "smithy"), "需要铁匠铺");
    check(p.gold >= 2, "金币不足");
    use("smithy");
    p.gold -= 2;
    p.hand.push(...draw(g, 3));
    log(g, `${p.name} 使用铁匠铺`);
    return;
  }
  if (a.type === "museum") {
    const museum = p.city.find((c) => c.key === "museum");
    const c = p.hand.find((c) => c.id === a.card);
    check(museum && c, "需要已建造的博物馆及一张手牌");
    use("museum");
    p.hand = p.hand.filter((x) => x.id !== c.id);
    museum.stored = [...(museum.stored || []), c];
    log(g, `${p.name} 在博物馆收藏了 1 张牌`);
    return;
  }
  if (a.type === "armory") {
    const armory = p.city.find((c) => c.key === "armory");
    const other = g.players.find((x) => x.id === a.target);
    const c = other?.city.find((x) => x.id === a.card);
    check(armory && other && c && c.id !== armory.id, "请选择军械库之外的一座建筑");
    check(citySize(other) < g.target, "不能拆除已完工城市");
    destroyDistrict(g, p, armory);
    destroyDistrict(g, other, c);
    log(g, `${p.name} 拆除军械库，同时拆除了 ${other.name} 的${c.name}`);
    return;
  }
  if (a.type === "end") {
    check(t.gathered, "请先采集资源");
    if (has(p, "park") && !p.hand.length) {
      p.hand.push(...draw(g, 2));
      log(g, `${p.name} 通过公园获得建筑牌`);
    }
    if (has(p, "poorhouse") && p.gold === 0) {
      p.gold++;
      log(g, `${p.name} 通过济贫院获得 1 金币`);
    }
    advance(g);
    return;
  }
  throw new Error("未知操作");
}
const handColorOrder: Color[] = ["noble", "religious", "trade", "military", "unique"];
function sortHand(hand: Card[]) {
  return [...hand].sort((a, b) =>
    handColorOrder.indexOf(a.color) - handColorOrder.indexOf(b.color) ||
    a.cost - b.cost ||
    a.key.localeCompare(b.key) ||
    a.id.localeCompare(b.id),
  );
}
export function view(g: Game, id: string) {
  const me = g.players.find((p) => p.id === id);
  check(me, "没有该房间的访问权限");
  const mine = g.active === id;
  return {
    code: g.code,
    host: g.host,
    phase: g.phase,
    round: g.round,
    crown: g.crown,
    active: g.active,
    role: g.role,
    roleCount: g.roleCount,
    target: g.target,
    firstComplete: g.firstComplete,
    killed: g.killed,
    robbed: g.robbed,
    faceup: g.faceup,
    remaining: g.deck.length,
    log: g.log,
    scores: g.scores,
    uniqueKeys: g.uniqueKeys || [...new Set([...g.deck, ...g.players.flatMap((p) => [...p.hand, ...p.city])].filter((c) => c.color === "unique").map((c) => c.key))].sort(),
    theaterPending: g.theaterPending || "",
    me: id,
    players: g.players.map((p) => ({
      id: p.id,
      name: p.name,
      gold: p.gold,
      city: p.city.map(({ stored, ...c }) => ({ ...c, storedCount: stored?.length || 0 })),
      cityCount: citySize(p),
      handCount: p.hand.length,
      hand: p.id === id ? sortHand(p.hand) : [],
      roles: p.id === id || g.phase === "finished" ? p.roles : p.revealed,
      revealed: p.revealed,
      ready: p.ready,
    })),
    draftSlots:
      g.phase === "draft" && mine
        ? g.available.map((_, index) => index)
        : [],
    discardPending: g.discardPending && mine,
    turn: g.phase === "turn" && mine ? g.turn : null,
  };
}
export type GameView = ReturnType<typeof view>;
