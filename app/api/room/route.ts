import { env } from "cloudflare:workers";
import {
  newGame,
  newPlayer,
  addPlayer,
  apply,
  view,
  type Game,
} from "../../../lib/game";
export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers });
async function hash(s: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
    ),
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
function token() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
async function load(code: string) {
  if (!/^[A-Z2-9]{8}$/.test(code)) throw new Error("房间码为 8 位字母或数字");
  const row = await env
    .DB!.prepare("SELECT state,revision FROM rooms WHERE code = ?")
    .bind(code)
    .first<{ state: string; revision: number }>();
  if (!row) throw new Error("没有找到该房间，请检查房间码");
  return { game: JSON.parse(row.state) as Game, revision: row.revision };
}
async function identity(request: Request, g: Game) {
  const bearer =
    request.headers.get("Authorization")?.replace(/^Bearer /, "") || "";
  if (bearer.length > 200) throw new Error("无效恢复密钥");
  const secret = await hash(bearer);
  const p = g.players.find((p) => p.secret === secret);
  if (!p) throw new Error("席位凭证无效，请使用恢复密钥重新进入");
  return p;
}
export async function GET(request: Request) {
  try {
    const { game, revision } = await load(
      new URL(request.url).searchParams.get("code")?.toUpperCase() || "",
    );
    const p = await identity(request, game);
    return json({ state: view(game, p.id), revision });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "读取失败" }, 400);
  }
}
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin)
      return json({ error: "请求来源无效" }, 403);
    const raw = await request.text();
    if (raw.length > 16000) return json({ error: "请求过大" }, 413);
    const body = JSON.parse(raw);
    if (body.type === "create" || body.type === "join") {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name || name.length > 20)
        throw new Error("请输入 1–20 个字符的昵称");
      const key = token(),
        p = newPlayer(crypto.randomUUID(), await hash(key), name);
      if (body.type === "create") {
        const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        const bytes = crypto.getRandomValues(new Uint8Array(8));
        const code = Array.from(bytes, (b) => alphabet[b % 32]).join("");
        const game = newGame(code, p);
        await env
          .DB!.prepare(
            "INSERT INTO rooms (code,state,revision,updated_at) VALUES (?,?,0,?)",
          )
          .bind(code, JSON.stringify(game), Date.now())
          .run();
        return json({ token: key, state: view(game, p.id), revision: 0 });
      }
      const { game, revision } = await load(
        String(body.code || "").toUpperCase(),
      );
      addPlayer(game, p);
      const updated = await save(game, revision);
      if (!updated) return json({ error: "有朋友正在加入，请再试一次" }, 409);
      return json({
        token: key,
        state: view(game, p.id),
        revision: revision + 1,
      });
    }
    const { game, revision } = await load(
      String(body.code || "").toUpperCase(),
    );
    const p = await identity(request, game);
    if (body.revision !== revision)
      return json({ error: "房间有新变化，已同步，请重新操作" }, 409);
    if (!body.action || typeof body.action.type !== "string")
      throw new Error("操作无效");
    apply(game, p.id, body.action);
    const updated = await save(game, revision);
    if (!updated) return json({ error: "另一项操作已先完成，请重新操作" }, 409);
    return json({
      state: body.action.type === "leave" ? null : view(game, p.id),
      revision: revision + 1,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "操作失败" }, 400);
  }
}
async function save(game: Game, revision: number) {
  const r = await env
    .DB!.prepare(
      "UPDATE rooms SET state=?,revision=revision+1,updated_at=? WHERE code=? AND revision=?",
    )
    .bind(JSON.stringify(game), Date.now(), game.code, revision)
    .run();
  return r.meta.changes === 1;
}
