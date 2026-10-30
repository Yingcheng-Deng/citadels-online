# Citadels · 远方的城

**相隔千里，同筑一城。** 为异地朋友制作的中文 Citadels 联机网页桌游。

[![Verify Citadels](https://github.com/Yingcheng-Deng/citadels-online/actions/workflows/ci.yml/badge.svg)](https://github.com/Yingcheng-Deng/citadels-online/actions/workflows/ci.yml)

[在线试玩](https://citadels-friends-yingcheng.perkyeel64.chatgpt.site) · [GitHub 仓库](https://github.com/Yingcheng-Deng/citadels-online)

## 开始游玩

1. 打开网站，填写昵称并创建房间。
2. 点击房间码复制邀请链接，发给朋友。
3. 所有人点击准备，房主开始对局。
4. 按页面提示秘密选角、采集、使用能力、建造并结束角色回合。

刷新当前标签页会自动重连。关闭标签页或换设备前，请保存 **房间码 + 自己的恢复密钥**；密钥只属于本人，不要发到群里。掉线玩家的回合会等待其回来。

## 已实现

- 2–8 人独立房间；重点支持 2–3 人每轮双角色规则。
- 基础 8 角色；3 人和 8 人加入艺术家（9号）。
- 54 张普通建筑 + 官方入门组合 14 张独特建筑。
- 秘密选角与弃角、刺杀、盗窃、魔术师换牌、税收、建造、拆除、美化。
- 正确区分 2–3 人的 8 建筑完城与 4–8 人的 7 建筑完城。
- 自动计分与平局比较、房间日志、同房再来一局。
- 服务端权威校验、私人视图、数据库存档、并发写入保护。
- 手机/桌面响应式界面，原创 SVG 城堡图形。

## 当前范围

这是 **v0.1 基础配置可玩版**，不是盒内所有配置的完整数字复刻。未实现另外 18 个替换角色、其他 16 种独特建筑、自定义卡组、机器人、聊天或掉线托管。首次王冠随机分配（桌面规则按年龄）。独特建筑数值与能力参考公开逐卡表，仍待和实体卡面逐张核对，见 [规则来源与待核验项](docs/rules-research.md)。

## 本地开发

需要 Node.js 24、npm 和 Git。仓库根目录就是本机的 `citadels/web`。

```sh
npm ci
npm run build
```

首次创建本地数据库（仅首次执行这条已存在的迁移；后续结构调整应用新增迁移）：

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_sudden_risque.sql
npm run dev
```

打开终端显示的地址，通常是 `http://127.0.0.1:5173`。在两个独立标签页分别创建/加入，能够在一台电脑上检查联机流程。真正异地游玩需要部署到公网服务，不能将 localhost 链接发给朋友。

```sh
npm test            # 规则边界与完整对局模拟
npm run typecheck   # TypeScript 检查
npm run test:api    # 对已启动的本地服务器执行双人/三人接口测试
npm run build      # 生产构建
```

HTTP 测试会创建独立测试房间。`TEST_BASE_URL` 可指定其他测试地址。GitHub Actions 对每次 main 推送及 PR 运行测试、类型检查、生产构建和真实 HTTP 测试。

## 技术与代码

React / TypeScript / Vinext / Cloudflare Workers / D1 / Drizzle。房间数据用服务端 JSON 快照存储，客户端采用 1.8 秒短轮询；带版本号的数据库写入防止并发覆盖。完整规则引擎与前端独立，可以直接运行 Node 测试。

- [架构、隐私模型与维护](docs/ARCHITECTURE.md)
- [规则核对记录](docs/rules-research.md)
- [规则引擎](lib/game.ts)
- [HTTP 房间接口](app/api/room/route.ts)
- [测试](tests/game.test.ts)

源码备份在 GitHub。当前托管通过 Sites 发布至 Cloudflare Workers，数据库由托管环境配置；GitHub Pages 只能托管静态资源，不能单独运行本项目的后端。`.openai/hosting.json` 是本项目的部署标识，fork 部署时需要创建自己的站点和数据库，不应直接向原站点发布。

本地 `.wrangler/`、运行状态、凭证和原始拍摄照片都不上传。所有源码与项目文档保留在 `citadels` 目录下。后续修改建议建立分支，运行检查，再通过 PR 合并。

## 致谢与许可

Citadels 由 Bruno Faidutti 设计，游戏及商标属于各自权利人；本项目与出版商无隶属或授权关系。游戏规则参考 [Z-Man 官方手册](https://cdn.svc.asmodee.net/production-zman/uploads/2024/10/zc01-rulebook_web.pdf)。不分发原版卡面、美术或扫描手册。

本项目原创代码与原创界面图形以 [MIT License](LICENSE) 发布；第三方模板/依赖保留各自许可，游戏名称、商标及原版素材不包含在此授权中。
