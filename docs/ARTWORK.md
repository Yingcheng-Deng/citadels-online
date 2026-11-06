# 图片来源与处理记录

## 原版卡面

按用户要求，展示 Citadels 实体桌游的原版英文卡面，下方另配中文说明；没有用生成图替代原版卡牌图案。

- 公开素材来源：[Citadels (2016) HD / Tabletop Simulator Workshop](https://steamcommunity.com/sharedfiles/filedetails/?id=1754753798)
- [建筑原始图集](https://cdn.steamusercontent.com/ugc/795361804478972040/351FEF2AA9FA9F72F1079CB4A99B59A2AB05B962/)
- [角色原始图集](https://cdn.steamusercontent.com/ugc/795361804478916811/826A10BB5AF08183189B5165DF6AE632153807D0/)
- [角色牌背](https://cdn.steamusercontent.com/ugc/795361804476240230/FC628CC58E6EA46FCFC3057C45606672E6D896EF/)

建筑图集 7×7，角色图集 4×7。按 Workshop 卡牌编号映射提取 47 种建筑、9 个当前启用角色，压缩为 600 像素宽 WebP；完整卡面不改画、不移除卡面文字。映射与提取过程见 `scripts/prepare-card-assets.mjs`。大图仅在本地忽略目录保存，部署与 GitHub 只包含网页用逐卡资源。

卡面美术归各自权利人所有，不适用本仓库 MIT 代码许可。角色原画 Andrew Bosley；建筑原画团队及完整署名见 [官方手册末页](https://cdn.svc.asmodee.net/production-zman/uploads/2024/10/zc01-rulebook_web.pdf)。公开图集来源不表示取得原画版权或出版商授权。本项目为非官方朋友联机项目。

## 新封面

- 文件：`public/art/city-cover.png`
- 方式：内置 image_gen 工具生成，参考用户提供的实体盒面照片；未调用 API CLI。
- 生成日期：2026-11-06。
- 创作方向：保留彩色尖顶、金色宫殿、石桥、钟楼与城邦人物等主题元素，重新创作横向城景；页面文字由 HTML 排版。

完整生成提示词：

```text
Use case: illustration-story. Asset type: wide hero illustration for a Chinese Citadels tabletop game website. Use the supplied photo of the physical board game box ONLY as visual inspiration for a new composition. Create an original painted fantasy Renaissance city panorama with warm ochre stone arches and bridges, jewel green and crimson steep rooftops, pale gold palace towers, a tall whimsical clocktower, a small busy civic square, and distant hazy blue mountains under a bright sky. Include small courtly silhouettes suggesting a crowned monarch, merchant and architect, integrated naturally into the city. Rich traditional board-game illustration, detailed architectural storytelling, warm afternoon light, textured hand-painted finish. Wide landscape 3:2 composition with architecture as the focus and quiet sky at top. This is a finished web background artwork, no UI, no lettering, no titles, no logos, no border, no watermark. Do not replicate the box layout or photographed tabletop; create a clean new scene from its architectural and color elements.
```
