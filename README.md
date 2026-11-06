# Citadels · 远方的城

**相隔千里，同筑一城。** 为异地朋友制作的中文 Citadels 联机网页桌游。

[![Verify Citadels](https://github.com/Yingcheng-Deng/citadels-online/actions/workflows/ci.yml/badge.svg)](https://github.com/Yingcheng-Deng/citadels-online/actions/workflows/ci.yml)

[在线试玩](https://citadels-friends-yingcheng.perkyeel64.chatgpt.site) · [GitHub 仓库](https://github.com/Yingcheng-Deng/citadels-online)

## 开始游玩

1. 第一次打开可先完成约 3 分钟的交互教学，再填写昵称并创建房间。
2. 点击房间码复制邀请链接，或点击“复制房间号”仅复制 8 位房间号，发给朋友。
3. 所有人点击准备，房主开始对局。
4. 按页面提示盲选角色、采集、使用能力、建造并结束角色回合。

选角与弃角只展示牌背，选中后仅本人可见身份，其余角色牌会重新洗牌；这是本网站采用的盲选玩法。手牌自动按贵族、宗教、商业、军事、独特分类，同类按造价排列，同名建筑相邻。

刷新当前标签页会自动重连。关闭标签页或换设备前，请保存 **房间码 + 自己的恢复密钥**；密钥只属于本人，不要发到群里。掉线玩家的回合会等待其回来。

## 已实现

- 2–8 人独立房间；重点支持 2–3 人每轮双角色规则。
- 经典模式：基础 8 角色，3／8 人加入艺术家；进阶模式：全部 27 角色按编号组阵，开局随机或由房主自选，阵容整局固定。
- 54 张普通建筑 + 每局从全部 30 种独特建筑随机选出的 14 种；组牌覆盖低、中、高造价，并可查看本局名单。
- 二人局首位玩家亲手暗弃，再开始选角；建造二次确认默认开启，可在侧栏关闭。
- 秘密选角与弃角、刺杀、盗窃、魔术师换牌、税收、建造、拆除、美化。
- 正确区分 2–3 人的 8 建筑完城与 4–8 人的 7 建筑完城。
- 自动计分与平局比较、房间日志、同房再来一局。
- 服务端权威校验、私人视图、数据库存档、并发写入保护。
- 原版英文卡面、放大的中文说明、点击卡面查看大图；参考实体盒面元素创作的新封面。
- 首次访问交互教学，包含选角、采集、建造、角色能力、结算练习；对局内有下一步提示。

## 当前范围

当前实现全部 27 角色与 30 种独特建筑效果，包括跨玩家交涉、女巫接管、没收/交换/夺取与税池。进阶模式每编号选一位；二人禁用皇帝，少于五人禁用王后。尚无手动自定义建筑卡组、机器人、聊天或掉线托管。首次王冠随机分配（桌面规则按年龄）。官方选角允许看牌后秘密选择，本网站按房间玩法采用盲选；随机选择独特建筑也是自动组牌方式，官方允许玩家自行选组合。见 [规则来源](docs/rules-research.md) 与 [图片来源及封面生成记录](docs/ARTWORK.md)。

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
npm run test:api    # 对已启动的本地服务器执行经典和进阶两模式 2–8 人完整接口对局
npm run build      # 生产构建
```

HTTP 测试会创建独立测试房间，分别在经典和进阶模式跑完 2、3、4、5、6、7、8 人对局并核验结算和再来一局。`TEST_BASE_URL` 可指定其他测试地址。GitHub Actions 对每次 main 推送及 PR 运行测试、类型检查、生产构建和真实 HTTP 测试。

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

Citadels 由 Bruno Faidutti 设计，游戏、卡面美术及商标属于各自权利人；本项目与出版商无隶属或授权关系。游戏规则参考 [Z-Man 官方手册](https://cdn.svc.asmodee.net/production-zman/uploads/2024/10/zc01-rulebook_web.pdf)。卡面图案及原画署名见 [图片来源](docs/ARTWORK.md)，不属于本仓库 MIT 代码许可。

本项目原创代码与原创界面图形以 [MIT License](LICENSE) 发布；第三方模板/依赖保留各自许可，游戏名称、商标及原版素材不包含在此授权中。
