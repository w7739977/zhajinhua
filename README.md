# 诈金花 微信小程序

微信小程序「诈金花」项目，基于微信云开发实现房间创建、加入、庄家制发牌、下注、比大小、记账与过庄。**核心玩法已完整实现。**

---

## 项目概况

- **类型**：微信小程序（云开发）
- **AppID**：`wx1f0b9966cbfebd33`
- **云开发环境 ID**：`cloud1-2gytrceb3105a929`
- **技术栈**：小程序原生 + 云函数 + 云数据库（集合 `rooms`）

### 功能概览

| 功能 | 说明 |
|------|------|
| 首页 | 首次进入弹出授权确认框；获取头像昵称后可选输入自定义昵称，确认进入大厅；创建/加入房间 |
| 房间页 | 房间号；庄家皇冠；围桌布局；**庄家一键发牌**→下注→开牌；观战/离线标签；庄家可代离线玩家下 1 杯；踢离线玩家；`watch` 断线重连 |
| 结果页 | 比牌结果与记账；**全开庄家全输**提示；过庄说明；庄家/房主「开始下一局」；其余玩家监听房间 `waiting` 自动返回 |

### 游戏规则

#### 基础

- 一副 52 张扑克（♠♥♣♦ × A~K），不含大小王；牌在数据库中**只存字符串**（如 `"♠K"`）。
- 创建房间时洗牌；牌组在**同一庄家任期内跨轮持续消耗**，不自动回收。

#### 庄家

- 创建房间的玩家默认为庄家，头像带 **黄色粗边框 + 右上角皇冠 👑**。
- 庄家身份按入房队列顺序循环转移（过庄时传给下一位）。
- **只有庄家能操作开牌**；庄家不参与下注。

#### 一局流程

```
进入房间 → 庄家一键发牌（全员发手牌 + 公牌，非观战玩家参与）
         → 下注（非庄家选注码 1/2/3；庄家可代离线玩家下 1 杯）
         → 庄家开牌（选人 / 全开 / 全开不过庄）
         → 结果页（比大小 + 记账）
         → 庄家/房主 resetRound 开始下一局；其他玩家随房间状态回到房间
```

#### 手牌组成（3 张牌）

| 牌 | 来源 |
|----|------|
| 公牌 | 全桌共享，全员发完后从牌组翻出 |
| 手牌 | 每人各自从牌组抽取的 1 张牌 |
| 万能牌 | 虚拟牌，系统自动枚举 52 种可能，取使该玩家手牌最强的一张 |

#### 牌型排名（从大到小）

| 排名 | 牌型 | 说明 |
|------|------|------|
| **特殊** | **非同花 2-3-5** | 专克豹子（遇其他牌型按散牌处理） |
| 1 | **豹子** | 三张点数相同（如 8-8-8） |
| 2 | **同花顺** | 花色相同 + 点数相连 |
| 3 | **同花** | 花色相同，非顺子 |
| 4 | **顺子** | 花色不同，点数相连（A-2-3 最小，Q-K-A 最大，K-A-2 不算） |
| 5 | **对子** | 两张相同 + 一张不同 |
| 6 | **散牌** | 以上皆不是 |

- 同牌型比最大牌点数（A 最大，2 最小），相同则比第二张，以此类推。
- **完全相同（平局）算庄家赢。**

#### 开牌模式（庄家专属）

| 模式 | 操作 | 过庄 / 特殊 |
|------|------|------|
| 选择玩家 | 点击 1~N 个玩家头像选中，再点「开牌」；**未选中者下局可保留手牌** | 无 |
| 全开 | 与所有非观战闲家比：**全胜即过庄（不限牌型）**；**若输给任一家 → 庄家全输**，所有闲家注码合计记庄家喝，闲家本局不喝酒 | 全胜过庄 |
| 全开不过庄 | 与所有闲家逐个结算（与选人开牌相同） | 无 |

#### 记账（喝酒计数）

- 注码即杯数：下注 1/2/3 = 输了喝 1/2/3 杯
- 庄家赢某玩家 → 该玩家喝 N 杯（玩家累计 +N）
- 庄家输给某玩家 → 庄家喝 N 杯（庄家累计 +N）
- 平局（牌型相同）→ 算庄家赢，玩家喝
- 庄家分别与各玩家结算，各自累计杯数（**全开庄家全输**时仅庄家加总杯数）
- 分数永远 ≥ 0，数字越大表示喝得越多
- 未被选中开牌的玩家本轮不结算（选人模式）

#### 过庄与牌组

- **全开模式**下，庄家全胜 → 自动过庄（不限牌型）+ 按规则刷新牌组
- 每轮 `resetRound` 前检查牌组：若剩余不足 → **自动过庄 + 刷新牌组**
- **与 Web 对齐**：`resetRound` 云函数在上一局写入的 `passDealer` 为真时，应 **整副洗牌（52 张）** 并清空本局相关手牌；详见仓库内 [SYNC_MAP.md](./SYNC_MAP.md) 第六节说明（对应 Web `executeResetRound` / 响应字段 `passDealerShuffle`）
- 新一局为 `waiting`，可在选人开牌后**保留未开牌闲家手牌**（`retainedCard`）

---

## 当前进度

### 已完成

- [x] 项目基础结构、三页（index / room / result）、云开发与 AppID 配置
- [x] 首页：创建/加入房间（`createRoom` / `joinRoom`），身份确认弹框
- [x] 房间页：实时监听（`watch`）、围桌布局（本人底部、逆时针排列）
- [x] 深墨绿丝绒牌桌主题（三页统一）
- [x] **庄家系统**：房主默认庄家、黄色粗边框 + 皇冠标识、庄家队列循环
- [x] **新流程**：`发牌 → 下注 → 开牌`（取消原"准备"环节）
- [x] **下注功能**：非庄家选注码 1/2/3，筹码 UI；全下完激活庄家开牌
- [x] **庄家开牌**：选人开牌（点击头像选中）、全开、全开不过庄三种模式
- [x] **万能牌计算**：遍历 52 种可能取最优手牌
- [x] **牌型比大小**：豹子 > 同花顺 > 同花 > 顺子 > 对子 > 散牌；非同花 235 专克豹子；平局算庄家赢
- [x] **记账系统（喝酒计数）**：输家喝酒 +注码，赢家不变，分数永远 ≥ 0，前端 🍺 杯数显示
- [x] **过庄机制**：全开全胜即过庄；牌组不足 → 自动过庄 + 刷新
- [x] **牌组管理**：同一庄家任期内牌组跨轮消耗；保留手牌与洗牌规则与 Web 对齐
- [x] **结果页**：庄家全输提示、中性样式、非庄家等待下一局 + DB 监听自动返回
- [x] **观战 / 离线**：中途入房观战；`onHide` 标记离线、`onShow` 重连入房；庄家代下注、踢离线玩家
- [x] **云数据库写入修复**：所有云函数 `update` 统一使用 `db.command.set()` 整体替换，避免 `DUPLICATE_WRITE` 错误
- [x] 云函数 × 9：`createRoom`、`joinRoom`、`getRoom`、`deal`、`bet`、`open`、`resetRound`、`kickPlayer`、`setOffline`
- [x] 正式版（main）与测试版（test/mock-multiplayer）分支隔离

### 待办 / 可选优化

- [ ] 所有云函数上传部署（每次代码改动后需重新部署）
- [x] 本地一键测试：`npm test`（= `cardEngine` 金样 + `selftest` 规则不变量）
- [x] 小程序内 QA 页：`pages/qa-test`（首页「QA 场景自测」入口，由 `utils/releaseConfig.js` 控制；正式发布设 `SHOW_QA_TEST_ENTRY: false`）
- [ ] 真机多人联调验证完整流程
- [ ] 5 人以上房间的座位分布与选人交互体验验证
- [ ] 上线前收紧 `rooms` 读写权限（仅房间内用户可读写对应数据）

---

## 房间状态流转

```
waiting ──庄家一键发牌──→ betting ──全员下注──→ opening ──开牌──→ opened
   ↑                                                              |
   +──────── resetRound（仅当 status=opened）←──────────────────+
```

| 状态 | 含义 |
|------|------|
| `waiting` | 等待庄家发牌（新一轮） |
| `dealing` | **遗留**：历史数据或旧版可能存在；当前逻辑新局不再写入，发牌后直接进入 `betting` |
| `betting` | 已发手牌+公牌，下注中 |
| `opening` | 非庄均已下注，庄家开牌中 |
| `opened` | 已结算，跳转结果页；庄家/房主可 `resetRound` 开下一局 |
---

## 数据模型（rooms 集合）

```javascript
{
  roomId: '123456',
  ownerOpenId: 'xxx',
  dealerOpenId: 'xxx',           // 当前庄家
  status: 'waiting',             // waiting | betting | opening | opened（dealing 仅遗留）
  deck: ['♠A', '♠2', ...],      // 牌组（跨轮持续消耗）
  publicCard: null,              // 公牌字符串
  roundResult: null,             // 本轮开牌结果（比大小+记账详情）
  players: [
    {
      openId: 'xxx',
      nickName: '玩家1',
      avatarUrl: '...',
      hasDealt: false,
      card: null,                // 手牌字符串
      bet: null,                 // 注码 1/2/3（庄家始终 null）
      score: 0,                  // 累计喝酒杯数（≥0）
      spectating: false,         // 中途入房观战，本局不参与
      offline: false,            // 切后台等标记，供代下注/踢人
      autoBet: false,            // 庄家代离线下注
      retainedCard: false        // 选人开牌未开者下局保牌
    }
  ],
  createdAt: ...,
  updatedAt: ...
}
```

---

## 目录结构

```
pj_zhajinhua/
├── package.json        # scripts: npm test
├── app.js / app.json / app.wxss
├── project.config.json
├── README.md
├── FRONTEND_STYLE_GUIDE.md
├── NEXT_MINIAPP_SETUP.md
├── utils/
│   └── releaseConfig.js  # SHOW_QA_TEST_ENTRY：false = 隐藏 QA 入口
├── pages/
│   ├── index/          # 大厅：身份确认 → 创建/加入房间
│   ├── room/           # 房间：庄家标识、发牌、下注、选人开牌、实时同步
│   ├── result/         # 结果：庄家vs玩家对比、万能牌、牌型、记账、过庄提示
│   └── qa-test/        # 开发：云函数场景一键自测 + 双机项说明
├── test/
│   ├── selftest.js     # node test/selftest.js
│   └── cardEngine.test.js  # node test/cardEngine.test.js（牌型引擎）
└── cloudfunctions/
    ├── createRoom/     # 创建房间（含庄家字段 dealerOpenId）
    ├── joinRoom/       # 加入房间
    ├── getRoom/        # 查询房间
    ├── deal/           # 庄家一键发牌 + 公牌 → betting
    ├── bet/            # 下注（1/2/3）；庄家可 targetPlayerId 代离线下 1 杯
    ├── open/           # 开牌（万能牌+比大小+记账+全开全输/过庄）
    ├── resetRound/     # 新一局（保留手牌；牌不足过庄+洗牌）
    ├── kickPlayer/     # 庄家/房主移出玩家
    ├── setOffline/     # 当前用户标记离线（小程序切后台）
    └── (mockRoomAction/ 仅在 test 分支)
```

---

## 部署步骤

1. 微信开发者工具打开项目，确认云开发环境为 `cloud1-2gytrceb3105a929`，数据库有集合 `rooms`
2. 对以下云函数分别右键「上传并部署：云端安装依赖」：
   - `createRoom`、`joinRoom`、`getRoom`、`deal`、`bet`、`open`、`resetRound`、`kickPlayer`、`setOffline`
3. 真机/预览：创建房间 → 发牌 → 下注 → 开牌 → 查看结果 → 返回新一局
4. **正式发布前**：将 [`utils/releaseConfig.js`](utils/releaseConfig.js) 中 `SHOW_QA_TEST_ENTRY` 改为 `false`，重新上传小程序代码（首页不再显示「QA 场景自测」；若直链打开 QA 页会自动返回）。

### 常见问题：`请在编辑器云函数根目录（cloudfunctionRoot）选择一个云环境`

这是开发者工具没有把 **`cloudfunctions` 文件夹**和云端环境绑在一起，按下面做即可（与代码仓库无关，多为本机或首次开云开发未选环境）：

1. 确认用微信开发者工具打开的是**本仓库根目录**（能看到 `project.config.json` 里的 `"cloudfunctionRoot": "cloudfunctions/"`）。
2. 左侧**资源管理器**里找到 **`cloudfunctions`** 目录（根下的文件夹，不要只点开某个子函数）。
3. **右键 `cloudfunctions`** → 选择 **「选择云环境」** / **「当前环境」**（不同版本文案略有差异）→ 勾选 **`cloud1-2gytrceb3105a929`**（须与 [`app.js`](app.js) 里 `wx.cloud.init({ env: '...' })` 一致）。
4. 若右键没有该菜单：先点顶部 **「云开发」** 打开控制台，用当前小程序 AppID **开通/进入云开发**，再回到目录树对 `cloudfunctions` 右键选环境。
5. 选好后，再对具体云函数执行 **上传并部署**；若仍报错，可尝试 **关闭项目重新打开** 或更新开发者工具。

### 常见问题：`更新云函数失败`（无详细原因或通用失败）

按下面逐项排查（多为本机网络、权限或函数目录问题）：

1. **先看完整报错**：开发者工具 **云开发 → 云函数 → 日志**，或上传弹窗里的 **详情/复制错误信息**；把具体英文/错误码搜官方文档。
2. **确认已绑定环境**：同上一节，**右键 `cloudfunctions` → 选择云环境** 为 `cloud1-2gytrceb3105a929`。
3. **单个函数目录完整**：每个子目录须有 `index.js` + `package.json`（含 `wx-server-sdk`）；`open` 另需同目录 `cardEngine.js`，勿漏传。
4. **用「云端安装依赖」**：右键该函数 → **上传并部署：云端安装依赖**（勿仅用「上传所有文件」若依赖有变）。
5. **本机网络**：关闭 VPN/代理重试；或换网络；公司防火墙可能拦腾讯云上传。
6. **权限**：当前微信账号须为该小程序 **开发者**，且云开发控制台未欠费。
7. **函数名与大小写**：与 `cloudfunctions/` 下文件夹名一致，勿含非法字符。
8. **仍失败**：在函数目录执行 `npm install` 后重传；或删除云端该函数后在工具里重新上传创建。

---

## 分支说明

| 分支 | 用途 | mock 测试代码 |
|------|------|:------------:|
| `main` | 正式版，只保留可上线功能 | ❌ 无 |
| `test/mock-multiplayer` | 测试版，保留模拟多人调试能力 | ✅ 有测试面板 + 模拟玩家 |

## 与 Web 版的关系

本项目有对应的 Web 版 `pj_zhajinhua_web`（[GitHub](https://github.com/w7739977/zhajinhua-web)），两个项目的分支一一对应：

| 小程序 `pj_zhajinhua` | Web `pj_zhajinhua_web` | 用途 |
|:---:|:---:|:---:|
| `main` | `main` | 正式版，不含测试代码 |
| `test/mock-multiplayer` | `test` | 测试版，含测试面板与模拟玩家 |

### 联动开发原则

1. **分支对应修改**：改了哪个项目的哪个分支，必须同步修改另一个项目的对应分支
2. **先改后合**：功能开发在 test 分支完成验证后，再合并到 main 分支
3. **查表同步**：具体代码映射关系见 [SYNC_MAP.md](./SYNC_MAP.md)，修改前先查此表定位对应文件和函数
4. **test 独有内容不进 main**：测试面板、模拟玩家等调试功能只保留在 test 分支

### Web 版功能差异（与当前小程序对齐情况）

核心规则与房间能力已与 Web 对齐，**文件与接口级映射见 [SYNC_MAP.md](./SYNC_MAP.md)**。

| 能力 | Web | 小程序 |
|------|-----|--------|
| 实时推送 | Socket.IO + `broadcastRoom` | 云数据库 `watch` |
| 离线超时托管 | 约 60s 后自动代下注 / 自动开牌 / 自动下一局 | 庄家 UI 代离线下 1 杯；无服务端定时自动开牌/下一局 |
| 联调测试 | `#/test` + `test-runner.js` | 本地 `npm test` + 可选 `pages/qa-test` |
| 邀请 | 二维码 + 复制链接 | `open-type="share"` |

---

## 经验教训

### 云函数

1. **依赖必须安装**：云函数目录下需有 `package.json` 写 `wx-server-sdk` 依赖，在开发者工具中右键「上传并部署：云端安装依赖」。
2. **返回值必须可序列化**：不能返回 `db.serverDate()`、`_id`、Date 等，建议只返回业务纯数据。
3. **牌只存字符串**：避免嵌套对象中的 `rank`/`face` 字段触发云库写入错误。
4. **try/catch 统一错误格式**：出错返回 `{ ok: false, code, message }`。
5. **万能牌计算放在云函数**：遍历 52 种可能取最优手牌，前端不做牌型计算，保证防作弊。
6. **`update` 必须用 `db.command.set()`**：云数据库 `update` 默认合并更新，对 `null` → 对象的字段会触发 `DUPLICATE_WRITE` 错误，数组和对象字段统一用 `_.set()` 整体替换。

### 前端

7. **openId 兜底**：`deal` / `getRoom` / `joinRoom` 均可辅助恢复；`wx.setStorageSync('selfOpenId')` 与 `app.globalData.openId` 双写。
8. **下一局**：庄家/房主在结果页直接调 `resetRound` 后返回；非庄家在结果页 `watch` 等 `status === 'waiting'` 自动返回（不再依赖 `roomNeedResetRound` 存储标记）。
9. **结果数据传递**：`app.globalData.roundResult` + `roomOwnerOpenId`；降级用 `getRoom` 拉 `roundResult`。
10. **庄家选人交互**：`opening` 状态下庄家点击玩家头像 toggle 选中，选中玩家加金色高亮边框；返回新一局时清空选中状态。
11. **围桌布局**：以入房顺序为基础旋转，自己固定底部，其他玩家稳定分布到左右两侧。
12. **正式版与测试版分支隔离**：`main` 只保留可发布内容，测试工具放 `test/mock-multiplayer` 分支。
13. **`open` 云函数**：须与 `cardEngine.js` 同目录一并部署；改牌型只改 `cardEngine.js` 并跑 `npm test`。

---

## 参考

- 同目录 `NEXT_MINIAPP_SETUP.md`（若存在）可作云开发与项目初始化参考
- 同目录 `FRONTEND_STYLE_GUIDE.md` 为前端样式与类名参考
- 微信云开发文档：[https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)

---

## 开发日志

### 2026-04-04：文档与部署说明整理

- `README`：状态流、`players` 字段、云环境/「更新云函数失败」排查、与 Web 差异表改为「对齐后差异」；经验教训同步下一局与 `openId` 策略。
- `SYNC_MAP`：样式映射注明小程序已含观战/离线类；补充开发者工具与 `project.config` 说明。
- `FRONTEND_STYLE_GUIDE`：首页 QA 入口、房间观战/踢人/代下注、结果页全输与下一局文案。

### 2026-04-03（续）：牌型引擎拆分

- `cloudfunctions/open/cardEngine.js`：与 `open/index.js` 分离，供 `node test/cardEngine.test.js` 金样覆盖。
- 根目录 `package.json`：`npm test` 串联引擎测试与规则自测。
- `SYNC_MAP.md`：引擎路径、`openedPlayerIds`、实时同步与状态流描述已与当前实现对齐。

### 2026-04-03：与 Web 版机制对齐 + 断线重连

- 云函数：`joinRoom` 观战入房且不篡改 `status`；`deal` 庄家一键发牌；`bet` 观战拦截与庄家代离线下注；`open` 全开全输/全胜过庄、`openedPlayerIds`；`resetRound` 保留手牌与权限；新增 `kickPlayer`、`setOffline`；`getRoom` 返回 `openId`。
- 房间页：`onShow` 调 `joinRoom` + `fetchRoom`；`onHide` `setOffline`；`watch` 错误 3 秒重连；`selfOpenId` 本地缓存；观战/离线/保留/托管标签与代下注、踢人。
- 结果页：庄家全输 UI；庄家/房主调用 `resetRound`；非庄家 `watch` 等 `waiting` 自动返回；首页已保存用户信息时不强制弹出授权框。

### 2026-03-11：基础功能

- 完成「创建房间 → 加入 → 发牌 → 公牌 → 开牌 → 返回新一局」闭环
- 云函数稳定化（5 个）、前端状态正确性、UI 渲染升级
- 新增 `FRONTEND_STYLE_GUIDE.md`

### 2026-03-12：准备制 + 实时同步 + 视觉升级

- 房间切换为准备制（全员准备→发牌→开牌）
- 云数据库 `watch` 实时监听
- 首页身份确认弹框、围桌布局、深墨绿丝绒主题
- 测试分支新增 `mockRoomAction` 和模拟面板

### 2026-03-15：庄家制 + 完整玩法 + 规则定版

**核心玩法**
- 取消准备环节，流程改为 `发牌 → 下注 → 开牌`
- 庄家系统：房主默认庄家，黄色粗边框 + 皇冠标识
- 下注功能：非庄家选注码 1/2/3，筹码 UI
- 庄家开牌三模式：选人开牌、全开（含过庄）、全开不过庄
- 万能牌计算：52 枚举最优，组成公牌+手牌+万能牌
- 牌型比大小：豹子 > 同花顺 > 同花 > 顺子 > 对子 > 散牌；235 专克豹子；平局算庄家赢
- 记账系统（喝酒计数）：输家 +注码杯数，赢家不变，前端 🍺 显示
- 过庄机制：全开全胜+豹子/同花顺→过庄；牌组不足→自动过庄+刷新；过庄弹出提示
- 牌组管理：跨轮持续消耗，过庄后才刷新整副牌
- 结果页重构：庄家区+玩家对比列表+万能牌标注+喝酒杯数+累计

**云函数**
- 新增 `bet`，重写 `open`（含牌型引擎），更新 `deal`/`resetRound`
- 修复 `DATABASE_DUPLICATE_WRITE`：所有 `update` 统一用 `db.command.set()`

**体验优化**
- 从结果页返回后清空上一轮选人边框
- 正式版 main 分支去除所有测试代码，与 test 分支隔离
