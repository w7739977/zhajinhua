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
- 按钮区：
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

---

### 2. 房间页（`pages/room`）

**整体布局**
- 容器：`room-page`
  - 深色背景，顶部为房间信息和邀请按钮，中上方为其他玩家区，中部为公牌，中下为本人信息，底部为操作按钮。

**顶部区域**
- 房间头：`room-header`
  - 左侧：`room-id` 文本（例如「房间号：997025」）。
  - 右侧：`button.invite-btn`（邀请好友）
    - 蓝色胶囊按钮，适合作为轻量操作；`open-type="share"`。

**其他玩家区**
- 容器：`other-players`
  - 多行居中排列。
- 单个其他玩家：`other-player-item`
  - 头像：`image.avatar`（80rpx 圆形，暗背景）。
  - 昵称：`text.nickname`（22rpx，浅灰）。

**公牌区**
- 容器：`center-card`
  - 标签：`center-card-label`，灰色文字「公牌：」。
  - 扑克牌：`view.poker-card.poker-card-large > text.poker-card-text`
    - 小白卡片（约 80×110rpx），圆角、浅灰边框、阴影，牌面文字如「♣A」。

**本人信息区（底部中间偏上）**
- 容器：`self-block`
  - 头像：`image.self-avatar`（120rpx 圆形，金色描边，表示当前用户）。
  - 昵称：`text.self-nickname`。
  - 手牌：
    - 有牌时：
      - `view.self-card-row`
        - 标签：`self-hand-label`（「手牌：」）
        - 扑克牌：`view.poker-card > text.poker-card-text`（与公牌同样样式但略小）。
    - 无牌时：`text.self-hand-card.placeholder` 文本「手牌：未发牌」。

**底部操作区**
- 容器：`bottom-bar`
- 按钮：
  - `button.btn.btn-primary`（发牌）
    - 橙色渐变胶囊；`disabled` 时透明度降低。
  - `button.btn.btn-secondary`（开牌）
    - 深灰胶囊；根据 `canOpen` 控制是否可点（只有所有玩家都发过牌时才可点击）。

> 可渲染点：
> - 给 `self-avatar` 添加轻微脉冲或高光，强调当前用户。  
> - 在发牌/开牌按钮上添加微动效或按压态（缩放、阴影）。  
> - 「其他玩家」区可以轻微模糊或弱对比，突出本人卡片和公牌。

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
  - 绿色渐变胶囊按钮（#4caf50 → #2e7d32），固定在底部中间，文案「返回游戏」。

> 可渲染点：
> - 玩家行可在「自己」和「其他人」之间做轻微背景区分（当前实现逻辑上没有区分，可后续增加 `isSelf`）。
> - 公牌区域可以加轻微发光或边框高亮，强调是公共信息。

---

## 通用组件与样式约定

### 按钮（Button）

- 类名：`.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.back-btn`。
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
- 当前用户头像额外加金色描边以作强调。

---

## 给后续渲染同事的建议

1. **保持层级关系**：三个页面的结构都遵循「顶部信息 → 中部主要内容 → 底部操作按钮」的节奏，适合继续做动画或主题皮肤。
2. **可替换点**：
   - 按钮的渐变颜色、阴影、字体都可以根据新主题统一替换，只要保留现有类名即可。  
   - 扑克牌卡片可以换成图片背景或更复杂的 CSS 卡片，但建议仍用 `poker-card` 类。
3. **不要改动的数据结构**：
   - 仍假定手牌、公牌为字符串，如 `"♠A"`；若改用复杂对象，请同步修改云函数与前端逻辑。

