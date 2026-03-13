
## 新微信小程序项目初始化备忘（骰子小游戏版本）

> 本文档用于今后新建类似项目时的前期准备与踩坑记录。  
> **注意：服务器登录密码一律只在线下私密保存，严禁写入任何代码仓库或云端文档。**

### 一、关键环境信息

- **小程序 AppID**：`wx3614e2f6176806c8`
- **云开发环境 ID（envId）**：`touzi-9gt3h7xu6cf26b5c`

- **云服务器（Ubuntu）**
  - **IP**：`119.91.53.223`
  - **用户**：`ubuntu`
  - **密码**：线下保存（纸质/密码管理器），**不要**写进代码仓库或本文件。

> 建议：在密码管理器中创建条目，名称如「骰子小游戏云服务器」，只在需要 SSH 的时候查。

### 二、新建小程序项目的步骤

1. **在微信开发者工具中新建项目**
   - 选择“小程序”类型。
   - 填写 AppID：`wx3614e2f6176806c8`（或新项目自己的 AppID）。
   - 项目目录：建议使用类似 `~/pj_touzi/miniapp` 的单独目录。

2. **初始化云开发**
   - 打开开发者工具顶部的 **「云开发」** 按钮。
   - 选择已有环境 `touzi-9gt3h7xu6cf26b5c`（或为新项目新建一个环境）。
   - 等初始化完成后再开发云函数与数据库。

3. **小程序端初始化云开发**
   - 在 `app.js` 的 `onLaunch` 中调用：

```javascript
wx.cloud.init({
  env: 'touzi-9gt3h7xu6cf26b5c',
  traceUser: true
})
```

### 三、云函数相关经验与踩坑记录

1. **`cloudfunctions` 目录识别问题（今日重点经验）**
   - 需要在 `project.config.json` 中显式配置：
   - 示例：

```json
{
  "cloudfunctionRoot": "cloudfunctions/",
  "cloudfunctionTemplateRoot": "cloudfunctionTemplate/",
  "miniprogramRoot": "./"
}
```

   - 若缺少 `cloudfunctionRoot`，开发者工具不会在“云函数”面板中识别本地 `cloudfunctions` 目录，也就**无法右键上传云函数**。

2. **云函数目录结构约定**
   - 根目录：`cloudfunctions/`
   - 子目录：每个云函数一个目录，例如：
     - `cloudfunctions/createRoom/index.js`
     - `cloudfunctions/joinRoom/index.js`
     - `cloudfunctions/rollDice/index.js`
     - `cloudfunctions/actionPiOrOpen/index.js`
     - `cloudfunctions/resetRound/index.js`

3. **在开发者工具中上传云函数的操作路径**
   - 打开顶部 **「云开发」 → 「云函数」** 标签。
   - 确认已识别到上述函数名称。
   - 对每个函数依次：
     - 在云函数列表中 **右键函数名 →「上传并部署（所有文件）」**。
   - 部署成功后，可在“运行日志”中查看调用情况和报错。

4. **依赖管理**
   - 当前项目云函数只用 `wx-server-sdk`，云函数环境默认内置，一般无需单独安装。
   - 若出现依赖错误，可在函数目录中执行：

```bash
cd cloudfunctions/<函数名>
npm install wx-server-sdk
```

### 四、云开发数据库准备

1. 在云开发控制台 / 工具“云开发”面板中，创建以下集合：
   - `rooms`
   - `players`

2. 字段由代码首次写入自动生成，无需提前建表结构；注意：
   - `rooms`：`roomId`、`ownerOpenId`、`status`、`createdAt`、`lastAction`、`updatedAt` 等。
   - `players`：`roomId`、`openId`、`nickName`、`diceList`、`hasRolled`、`lastAction`、`updatedAt` 等。

3. 开发阶段权限建议：
   - 可暂时设置为“所有用户可读写”，方便联调。
   - 上线前再收紧规则，只允许房间内成员访问对应房间数据。

### 五、Ubuntu 云服务器使用要点

1. **基本操作**

```bash
ssh ubuntu@119.91.53.223
# 密码从线下记录中查，不要脚本化
```

2. **Node.js 与 pm2（如需要部署后台服务）**
   - 使用 nvm 安装 Node.js（参考 README 中命令）。
   - 在 `~/pj_touzi/server` 下初始化 Node.js 项目，使用 `pm2` 守护进程。

3. **推荐目录结构（服务器）**
   - `~/pj_touzi/miniapp/`：小程序项目代码。
   - `~/pj_touzi/cloudfunctions/`：本地备份/脚本。
   - `~/pj_touzi/server/`：Node.js 后端服务。

### 六、今天的开发经验总结（可复用的通用流程）

1. **先理清架构与数据模型**
   - 明确房间、玩家的集合结构以及云函数接口（`createRoom`、`joinRoom`、`rollDice`、`actionPiOrOpen`、`resetRound`）。

2. **优先打通“云开发 + 云函数 + 数据库”闭环**
   - 本地小程序只需要先做最简单的页面和按钮。
   - 把云函数、数据库调通之后，再迭代 UI 和游戏逻辑。

3. **项目配置是高频踩坑点**
   - `project.config.json` 中要检查：
     - `appid`
     - `miniprogramRoot`
     - `cloudfunctionRoot`
   - 任意一项配置错了，都会导致上传、预览或云函数识别异常。

4. **建议的明日步骤（新项目复用）**
   - 复制本项目结构，改动 AppID 与 envId（如果新建环境）。
   - 按本文件检查并修正 `project.config.json`。
   - 在云开发中新建/确认集合与云函数，**先上传部署一次**。
   - 在首页接上“开房间 / 加入房间”最小路径，确认云调用成功后，再继续游戏页与结果页开发。

