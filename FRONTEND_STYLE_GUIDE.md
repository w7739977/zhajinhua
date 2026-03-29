## 诈金花小程序前端样式概览（V4 — 庄家制）

### 全局基调

- **配色**：深墨绿丝绒牌桌风格，基底在 `#081510 ~ #163e2f` 之间，搭配浅绿色高光与少量金色边线。庄家相关元素使用 **金黄色** (`#facc15` 系列) 强调。
- **圆角与按钮**：首页主操作为胶囊形操作行（border-radius: 999rpx）；房间页底栏按钮为赌场桌边控制按钮风格；下注为圆形筹码。
- **字体**：默认微信字体，标题偏大号（约 52rpx / 30rpx），正文 24–30rpx。

---

## 页面结构与可渲染元素

### 1. 首页（`pages/index`）

> 首页结构未变，参见之前文档。核心为"先确认身份（授权弹框），再进入大厅操作"的双层结构。

---

### 2. 房间页（`pages/room`）

**整体布局**
- 容器：`room-page`
  - 深绿牌桌背景；顶部为房间信息和邀请按钮，中部为桌面区域，底部为本人信息与操作栏。

**顶部区域**
- 房间头：`room-header`
  - 左侧：`room-id`（如「房间号：997025」）
  - 右侧：`button.invite-btn`（邀请好友，`open-type="share"`）

**桌面区域**
- 容器：`table-stage`
  - 左列：`side-column.left-column`
  - 中心：`center-zone`（公牌）
  - 右列：`side-column.right-column`
- 排布规则：当前玩家固定底部，其他玩家按入房顺序旋转分布到左右两列

**单个其他玩家：`other-player-item`**
- `avatar-wrap`：头像容器（relative 定位，承载皇冠）
  - `image.avatar`（72rpx 圆形），根据状态加类：
    - `.avatar-dealer`：**庄家** — 黄色 4rpx 粗边框 + 外发光
    - `.avatar-dealt`：已发牌 — 绿色边框
    - `.avatar-pending`：未发牌 — 灰色边框
  - `text.crown-badge`：**庄家皇冠 👑**，absolute 定位右上角
- `text.nickname`（22rpx，浅灰）
- `text.deal-tag` / `.deal-tag.pending`：发牌/未发牌
- `text.bet-tag` / `.bet-tag.pending`：注码 / 待下注（金黄色）
- `text.score-tag`：累计喝酒杯数（🍺）
- **选人模式**：庄家在 `opening` 状态点击玩家头像，选中时加 `.player-selected` 类（金色边框+高亮背景）

**公牌区**
- `center-zone` > `center-card`：椭圆桌心容器
  - `center-card-label`：「公牌」/ 「等待公牌」
  - `poker-card.poker-card-large`：白色卡面

**本人信息区**
- `self-block`（fixed 定位，底部 150rpx）
  - `avatar-wrap.avatar-wrap-self` > `self-avatar` + `crown-badge.crown-badge-self`（庄家时显示）
  - `self-nickname`：昵称 + 庄家时追加 `(庄)`
  - `score-tag.score-tag-self`：累计喝酒杯数
  - 手牌：`self-card-row` > `poker-card`
  - `self-bet-info`：已下注信息（金黄色）

**底部操作区（按状态动态切换）**

| 状态 | 底栏内容 |
|------|----------|
| `waiting` / `dealing` | `[发牌]` 全宽主按钮 |
| `betting`（庄家） | `等待玩家下注...` 文案 |
| `betting`（已下注） | `已下注 X 分，等待其他玩家` |
| `betting`（未下注） | 注码选择器：三个圆形筹码 `[1] [2] [3]` |
| `opening`（庄家） | `[开牌(N)] [全开] [不过庄]` 三按钮 |
| `opening`（非庄家） | `等待庄家开牌...` 文案 |

- 按钮样式：
  - `.btn-full`：100% 宽度（发牌阶段）
  - `.btn-sm`：30% 宽度（开牌三按钮）
  - `.btn-primary`：绿色渐变主按钮
  - `.btn-secondary`：深灰金属质感次按钮
- 筹码样式：`.bet-chip`
  - 96rpx 圆形，金黄色渐变背景 + 金色边框
  - 大号数字（36rpx），按压态缩放

---

### 3. 结果页（`pages/result`）

**整体布局**
- 容器：`result-page`
  - 深绿牌桌背景，顶部房间号+模式标签，中部庄家区和玩家对比，底部返回按钮

**顶部**
- `header`：居中显示房间号 + `mode-badge`（金黄色标签：选择开牌/全开/全开不过庄）

**过庄提示**
- `pass-dealer-tip`：金黄色背景提示条，显示「🔄 庄家全胜且为豹子/同花顺，自动过庄」

**庄家区域：`dealer-section`**
- 金黄色微光背景 + 金色边框
- `dealer-row`：
  - `avatar-wrap-result` > `avatar.avatar-dealer-result`（黄边框）+ `crown-result` 皇冠
  - `player-info`：昵称 + `hand-type-tag`（牌型名称，浅绿标签）
  - `cards-row`：三张牌并排
    - `card-with-label`：每张牌上方有小字标签（`公` / `手` / `万能`）
    - `poker-card` > `poker-card-text`
  - `score-change-row`：本轮喝酒杯数（🍺 喝 N 杯 / 未喝酒）+ 累计杯数

**玩家对比列表：`players-section`**
- 每位被选中玩家一个 `player-result-card`：
  - `result-badge`（右上角）：「庄家赢」红色 / 「玩家赢」绿色（平局算庄家赢，无平局状态）
  - `player-left`：头像 + 昵称 + 牌型标签
  - `cards-row`：三张牌（公牌 + 手牌 + 万能牌→XX）
  - `settle-row`：注码 + 本轮喝酒杯数 + 累计杯数

**底部**
- `back-btn`：绿色赌场主按钮，文案「返回游戏」

---

## 通用组件与样式约定

### 操作行（ActionRow）— 首页

- 类名：`.action-row`, `.btn-primary`, `.btn-secondary`, `.input-row`, `.action-input`
- 胶囊造型（999rpx），高度 88rpx，首页优先用 `view + bindtap`

### 扑克牌（PokerCard）

- 类名：`.poker-card`, `.poker-card-large`, `.poker-card-text`, `.poker-card-text-red`
- 数据源：仅字符串如 `"♠A"`
- 白色卡面、圆角、暗阴影；普通 70×100rpx，公牌 90×126rpx
- `♥` / `♦` 使用红色类 `.poker-card-text-red`

### 头像（Avatar）

- 圆角 50%，背景深灰，大小 72rpx / 100rpx / 120rpx
- 状态类：
  - `.avatar-pending`：灰色外圈（未发牌）
  - `.avatar-dealt`：绿色外圈（已发牌）
  - `.avatar-dealer`：**黄色粗边框 + 外发光**（庄家）

### 庄家标识

- `.crown-badge`：皇冠 👑 emoji，absolute 定位右上角（28rpx）
- `.crown-badge-self`：自己座位的皇冠（34rpx，更大）
- `.avatar-dealer`：4rpx 黄色实线边框 + box-shadow 发光

### 选人高亮

- `.player-selected`：金黄色背景 + 金色边框 + 外发光阴影

### 下注筹码

- `.bet-chip`：96rpx 圆形，金黄渐变 + 金色 3rpx 边框，大号数字
- `.bet-picker`：垂直居中容器，含标签和三筹码
- `.bet-label`：金黄色小字「选择注码」

### 状态标签

- `.deal-tag` / `.deal-tag.pending`：蓝色/灰色圆角标签
- `.bet-tag` / `.bet-tag.pending`：金黄色/灰色圆角标签
- `.score-tag`：累计喝酒杯数标签（🍺）
### 结果页专用

- `.result-badge`：右上角胜负标签
  - `.result-win`：绿色
  - `.result-lose`：红色
  - `.result-tie`：灰色（已废弃，平局算庄家赢）
- `.hand-type-tag`：浅绿圆角标签显示牌型名（豹子/同花顺等）
- `.card-with-label` > `.card-label-mini`：卡牌上方小字标签（公/手/万能）
- `.drinks-tag`：本轮喝酒杯数（金黄色）
- `.drinks-zero`：未喝酒（灰色）

---

## 给后续渲染同事的建议

1. **保持层级关系**：三页遵循「顶部信息 → 中部内容 → 底部操作」节奏。
2. **可替换点**：
   - 丝绒桌布色相、按钮金属感、筹码样式都可微调
   - 扑克牌可换成图片卡面，保留 `poker-card` 类
   - 庄家皇冠可换成自定义图标，保留 `crown-badge` 类
3. **不要改动的数据结构**：
   - 手牌、公牌为字符串如 `"♠A"`
   - 房间状态依赖 `room.status`（waiting/dealing/betting/opening/opened）
   - 玩家字段：`hasDealt`、`card`、`bet`、`score`
   - 庄家字段：`dealerOpenId`
   - 开牌结果：`roundResult`（含万能牌、牌型、比大小、过庄判断）
