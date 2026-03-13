## 诈金花小程序前端样式概览（V1）

### 全局基调

- **配色**：深色背景（#121212），前景为白色文字，强调色为橙色渐变按钮和蓝色/绿色点缀。
- **圆角与按钮**：所有主操作按钮使用大圆角胶囊形（border-radius: 999rpx），扁平化无默认边框，禁用态降低透明度。
- **字体**：默认微信字体，标题偏大号（约 52rpx / 30rpx），正文 24–30rpx。

---

## 页面结构与可渲染元素

### 1. 首页（`pages/index`）

**整体布局**
- 容器：`container`
  - 垂直居中布局，背景 #121212，左右 40rpx 内边距。

**主要块**
- 标题：`title`
  - 文本「诈金花」，大号、加粗；可渲染为带轻微发光或渐变的标题。
- 首页授权弹框：`auth-mask > auth-modal`
  - 首次进入首页时覆盖在大厅之上，用户确认昵称头像前不展示创建/加入房间操作区。
  - 内含：
    - `auth-title`：弹框标题
    - `auth-desc`：说明文案
    - `profile-preview`：授权后的头像昵称预览
    - `profile-avatar`：头像预览
    - `profile-name`：授权昵称预览
    - `input.room-input.nickname-input`：自定义昵称输入框
    - `button.btn.btn-primary.auth-btn`：同意授权并获取头像昵称
    - `button.btn.btn-secondary.auth-btn`：确认并进入大厅
- 按钮区：
  - 容器：`action-panel`
    - 仅在身份信息确认完成后展示。
  - **创建房间按钮**：`button.btn.btn-primary`
    - 语义：主操作。
    - 样式：宽 80%、高度 80rpx、橙色渐变背景（#ffb74d → #ff7043）、黑色文字。
  - **加入房间按钮**：`button.btn.btn-secondary`
    - 语义：次主操作。
    - 样式：宽 80%、深灰背景 #2d2d2d、白字。
  - **加入房间输入框容器**：`join-wrap`
    - 内含：
      - `input.room-input`：深灰输入框（#1f1f1f）、圆角 12rpx、白字，占满宽度。
      - `button.btn.btn-primary` 确认加入按钮（样式同创建房间）。
  - **授权头像昵称按钮**：`button.btn.btn-ghost.user-btn`
    - 语义：辅助操作。
    - 样式：透明背景，浅灰文字，边框 #444；位于底部偏下。

> 设计提示：首页可强化标题与主按钮之间的视觉层级，例如在标题下方增加简短副标题或渐变分割线。
> 当前逻辑上，首页是一个“先确认身份，再进入大厅操作”的双层结构，渲染时不要去掉弹框遮罩与确认门槛。

---

### 2. 房间页（`pages/room`）

**整体布局**
- 容器：`room-page`
  - 深色背景，顶部为房间信息和邀请按钮，中上方为其他玩家区（含准备/发牌状态），中部为公牌，中下为本人信息，底部为准备 / 发牌 / 开牌三个操作按钮。

**顶部区域**
- 房间头：`room-header`
  - 左侧：`room-id` 文本（例如「房间号：997025」）。
  - 右侧：`button.invite-btn`（邀请好友）
    - 蓝色胶囊按钮，适合作为轻量操作；`open-type="share"`。

**其他玩家区**
- 容器：`other-players`
  - 多行居中排列。
- 单个其他玩家：`other-player-item`
  - 头像：`image.avatar`（80rpx 圆形，暗背景），并带状态外圈颜色。
  - 昵称：`text.nickname`（22rpx，浅灰）。
  - 准备状态：`text.ready-tag` / `text.ready-tag.pending`，分别表示「已准备 / 未准备」。
  - 发牌状态：`text.deal-tag` / `text.deal-tag.pending`，分别表示「已发牌 / 未发牌」。

**公牌区**
- 容器：`center-card`
  - 标签：`center-card-label`，灰色文字「公牌：」。
  - 扑克牌：`view.poker-card.poker-card-large > text.poker-card-text`
    - 小白卡片（约 80×110rpx），圆角、浅灰边框、阴影，牌面文字如「♣A」。

**本人信息区（底部中间偏上）**
- 容器：`self-block`
  - 头像：`image.self-avatar`（120rpx 圆形），并带状态外圈颜色。
  - 昵称：`text.self-nickname`。
  - 准备状态：`text.ready-tag.self-ready` 或 `text.ready-tag.pending.self-ready`。
  - 手牌：
    - 有牌时：
      - `view.self-card-row`
        - 标签：`self-hand-label`（「手牌：」）
        - 扑克牌：`view.poker-card > text.poker-card-text`（与公牌同样样式但略小）。
    - 无牌时：`text.self-hand-card.placeholder` 文本「手牌：未发牌」。

**底部操作区**
- 容器：`bottom-bar bottom-bar-three`
- 按钮：
  - `button.btn.btn-secondary`（准备）
    - 点击后把当前玩家状态改为已准备；已准备后按钮禁用并显示「已准备」。
  - `button.btn.btn-primary`（发牌）
    - 只有所有玩家都已准备且自己尚未发牌时才可点击。
  - `button.btn.btn-secondary`（开牌）
    - 只有所有玩家都已发牌时才可点击；任意一人点击后，全员同步跳入结果页。

> 可渲染点：
> - 用头像外圈颜色替代一部分文字状态提示，降低阅读负担。  
> - 在发牌/开牌按钮上添加微动效或按压态（缩放、阴影）。  
> - 「其他玩家」区可以轻微弱对比，突出本人卡片和公牌。

---

### 3. 结果页（`pages/result`）

**整体布局**
- 容器：`result-page`
  - 深色背景，顶部房间号，中部公牌和玩家列表，底部「返回游戏」。

**顶部房间信息**
- `header`：居中显示「房间号：XXXXXX」。

**公牌展示**
- 容器：`public-card`
  - 标签：`public-label`（灰色「公牌：」）。
  - 扑克牌：`view.poker-card.poker-card-large > text.poker-card-text`。

**玩家列表**
- 容器：`players-list`。
- 行容器：`player-row`
  - 头像：`image.avatar`（72rpx 圆形）。
  - 信息块：`view.info`
    - 昵称：`text.name`。
    - 手牌：
      - 有牌：`view.card` 下包含：
        - `text.card-label`（「手牌：」）
        - `view.poker-card > text.poker-card-text`（牌面）；
      - 无牌：`text.card.placeholder` 文本「手牌：未发牌」。

**底部操作按钮**
- `button.back-btn`
  - 蓝色胶囊按钮，固定在底部中间，文案「返回游戏」。点击后返回房间页，房间会进入等待准备状态。

> 可渲染点：
> - 玩家行可在「自己」和「其他人」之间做轻微背景区分（当前实现逻辑上没有区分，可后续增加 `isSelf`）。
> - 公牌区域可以加轻微发光或边框高亮，强调是公共信息。

---

## 通用组件与样式约定

### 按钮（Button）

- 类名：`.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.back-btn`, `.ready-tag`。
- 统一特点：
  - 胶囊造型（border-radius: 999rpx）。
  - 无系统默认边框，纯自定义背景。
  - 主按钮多用渐变背景、深色文字；次按钮用实心深灰背景、浅色文字；幽灵按钮透明背景 + 1rpx 细边框。

### 扑克牌（PokerCard）

- 类名：`.poker-card`, `.poker-card-large`, `.poker-card-text`。
- 数据源：仅使用字符串如 `"♠A"`，前端负责直接渲染在卡片中央。
- 风格：
  - 白色卡面、圆角、轻阴影。
  - 大小：普通牌约 `70×100rpx`，公牌略大 `80×110rpx`。

### 头像（Avatar）

- 统一使用 `image` + 圆角 50%，背景深灰，大小随场景轻微变化（80rpx / 96rpx / 120rpx）。
- 房间页通过外圈颜色表达玩家状态：
  - `.avatar-pending`：灰色外圈，表示未准备
  - `.avatar-ready`：蓝色外圈，表示已准备
  - `.avatar-dealt`：绿色外圈，表示已发牌

---

## 给后续渲染同事的建议

1. **保持层级关系**：三个页面的结构都遵循「顶部信息 → 中部主要内容 → 底部操作按钮」的节奏，适合继续做动画或主题皮肤。
2. **可替换点**：
   - 按钮的渐变颜色、阴影、字体都可以根据新主题统一替换，只要保留现有类名即可。  
   - 扑克牌卡片可以换成图片背景或更复杂的 CSS 卡片，但建议仍用 `poker-card` 类。
3. **不要改动的数据结构**：
   - 仍假定手牌、公牌为字符串，如 `"♠A"`；若改用复杂对象，请同步修改云函数与前端逻辑。
   - 房间页联机状态依赖 `room.status` 与 `players[].isReady / hasDealt / card`，渲染或重构样式时不要破坏这些字段与 UI 的映射关系。



---

## 最新交互补充（准备制）

### 房间页最新交互规则

- 首次进入房间时，所有玩家默认显示 `未准备`。
- 当所有玩家都点了「准备」后，才允许点击「发牌」。
- 当所有玩家都发牌后，才允许点击「开牌」。
- 任意一位玩家点击「开牌」后，所有在房间页的玩家会同步跳到结果页。
- 从结果页返回后，回到房间页等待再次准备，不再直接进入可发牌状态。

### 渲染建议

- `ready-tag` 建议使用弱强调状态样式：
  - 已准备：绿色或蓝绿色轻底色 + 高亮文字。
  - 未准备：灰色轻底色 + 中性文字。
- 三按钮底部栏应维持明确主次层级：
  - `准备`：次级按钮。
  - `发牌`：主按钮。
  - `开牌`：次级按钮，但在可点击时应明显高亮。
