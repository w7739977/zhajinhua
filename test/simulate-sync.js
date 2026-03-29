/**
 * 多人游戏状态同步模拟测试
 *
 * 本脚本提取云函数核心逻辑在本地运行，验证以下场景：
 *   场景 1：中途有新玩家加入 → 应被拒绝，不破坏游戏状态
 *   场景 2：已有玩家重进房间（模拟 app 切出再切回）→ 状态不被重置
 *   场景 3：庄家冷启动重进 → openId 可恢复，开牌按钮正常显示
 *   场景 4：完整一局流程 waiting → dealing → betting → opening → opened
 */

// ======================== 模拟数据库 ========================

let DB = {}

function createRoom(roomId, ownerOpenId, nickName) {
  const suits = ['♠', '♥', '♣', '♦']
  const faces = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
  const deck = []
  suits.forEach((s) => faces.forEach((f) => deck.push(`${s}${f}`)))
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  DB[roomId] = {
    roomId,
    ownerOpenId,
    dealerOpenId: ownerOpenId,
    status: 'waiting',
    deck,
    publicCard: null,
    roundResult: null,
    players: [{ openId: ownerOpenId, nickName, avatarUrl: '', hasDealt: false, card: null, bet: null, score: 0 }]
  }
  return DB[roomId]
}

// ======================== 提取云函数逻辑 ========================

function joinRoom(roomId, openId, nickName) {
  const room = DB[roomId]
  if (!room) return { ok: false, code: 'ROOM_NOT_FOUND' }

  const players = room.players
  const status = room.status
  const idx = players.findIndex((p) => p.openId === openId)
  const isNewPlayer = idx === -1

  if (isNewPlayer && status !== 'waiting') {
    return { ok: false, code: 'GAME_IN_PROGRESS', message: '游戏中，请等待本局结束后再加入' }
  }

  if (isNewPlayer) {
    players.push({ openId, nickName, avatarUrl: '', hasDealt: false, card: null, bet: null, score: 0 })
  } else {
    players[idx].nickName = nickName
  }

  return { ok: true, openId, room: { ...room } }
}

function getRoom(roomId, callerOpenId) {
  const room = DB[roomId]
  if (!room) return { ok: false }
  return { ok: true, openId: callerOpenId, room: { ...room } }
}

function deal(roomId, openId) {
  const room = DB[roomId]
  if (!room) return { ok: false }
  const players = room.players
  const idx = players.findIndex((p) => p.openId === openId)
  if (idx === -1) return { ok: false, code: 'PLAYER_NOT_IN_ROOM' }
  if (room.status !== 'waiting' && room.status !== 'dealing') return { ok: false, code: 'WRONG_STATUS' }
  if (players[idx].hasDealt) return { ok: true, currentOpenId: openId, room: { ...room } }
  if (!room.deck.length) return { ok: false, code: 'DECK_EMPTY' }

  players[idx].card = room.deck.shift()
  players[idx].hasDealt = true

  let publicCard = room.publicCard
  const allDealt = players.every((p) => p.hasDealt)
  if (allDealt && !publicCard && room.deck.length) {
    publicCard = room.deck.shift()
    room.publicCard = publicCard
  }
  room.status = allDealt ? 'betting' : 'dealing'

  return { ok: true, currentOpenId: openId, room: { ...room } }
}

function bet(roomId, openId, amount) {
  const room = DB[roomId]
  if (!room) return { ok: false }
  const players = room.players
  const idx = players.findIndex((p) => p.openId === openId)
  if (idx === -1) return { ok: false, code: 'PLAYER_NOT_IN_ROOM' }
  if (room.status !== 'betting') return { ok: false, code: 'NOT_BETTING' }
  if (openId === room.dealerOpenId) return { ok: false, code: 'DEALER_NO_BET' }

  players[idx].bet = amount
  const nonDealer = players.filter((p) => p.openId !== room.dealerOpenId)
  const allBet = nonDealer.every((p) => p.bet != null)
  room.status = allBet ? 'opening' : 'betting'

  return { ok: true, room: { ...room } }
}

// 模拟客户端 canOpen 计算
function clientCanOpen(room, selfOpenId) {
  return room.status === 'opening' && selfOpenId === room.dealerOpenId
}

// 模拟客户端 selfOpenId 恢复逻辑
function recoverSelfOpenId(globalOpenId, localStorageOpenId, getRoomResultOpenId) {
  return globalOpenId || localStorageOpenId || getRoomResultOpenId || ''
}

// ======================== 测试执行 ========================

const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'

let passed = 0
let failed = 0

function assert(condition, testName) {
  if (condition) {
    console.log(`  ${GREEN}✓${RESET} ${testName}`)
    passed++
  } else {
    console.log(`  ${RED}✗${RESET} ${testName}`)
    failed++
  }
}

function section(title) {
  console.log(`\n${BOLD}${YELLOW}━━ ${title} ━━${RESET}`)
}

// ---------- 场景 4：完整一局流程（先测这个，后续场景依赖它） ----------

section('场景 4：完整一局流程 waiting → dealing → betting → opening')

DB = {}
createRoom('R001', 'dealer1', '庄家')
joinRoom('R001', 'playerA', '玩家A')
joinRoom('R001', 'playerB', '玩家B')

assert(DB['R001'].status === 'waiting', '初始状态为 waiting')
assert(DB['R001'].players.length === 3, '房间有 3 名玩家')

deal('R001', 'dealer1')
assert(DB['R001'].status === 'dealing', '庄家发牌后状态为 dealing')

deal('R001', 'playerA')
assert(DB['R001'].status === 'dealing', '第二人发牌后仍为 dealing')

deal('R001', 'playerB')
assert(DB['R001'].status === 'betting', '全员发牌后状态变为 betting')
assert(DB['R001'].publicCard !== null, '公牌已翻出')

const betResDealer = bet('R001', 'dealer1', 1)
assert(betResDealer.ok === false && betResDealer.code === 'DEALER_NO_BET', '庄家不能下注')

bet('R001', 'playerA', 2)
assert(DB['R001'].status === 'betting', '第一人下注后仍为 betting')

bet('R001', 'playerB', 1)
assert(DB['R001'].status === 'opening', '全员下注后状态变为 opening')

assert(clientCanOpen(DB['R001'], 'dealer1') === true, '庄家可以看到开牌按钮')
assert(clientCanOpen(DB['R001'], 'playerA') === false, '闲家看不到开牌按钮')

// ---------- 场景 1：中途有新玩家加入 ----------

section('场景 1：游戏进行中新玩家加入')

DB = {}
createRoom('R002', 'dealer1', '庄家')
joinRoom('R002', 'playerA', '玩家A')

deal('R002', 'dealer1')
deal('R002', 'playerA')
assert(DB['R002'].status === 'betting', '预设：全员发牌完，进入 betting')

const joinMidGame = joinRoom('R002', 'newPlayer', '新来的')
assert(joinMidGame.ok === false, '新玩家被拒绝加入')
assert(joinMidGame.code === 'GAME_IN_PROGRESS', '错误码为 GAME_IN_PROGRESS')
assert(DB['R002'].status === 'betting', '房间状态未被改变，仍为 betting')
assert(DB['R002'].players.length === 2, '玩家列表不变，仍为 2 人')

// 已有玩家重进不影响状态
const rejoin = joinRoom('R002', 'playerA', '玩家A改名')
assert(rejoin.ok === true, '已有玩家可以重进')
assert(DB['R002'].status === 'betting', '重进后状态不变，仍为 betting')
assert(DB['R002'].players[1].nickName === '玩家A改名', '昵称已更新')

// ---------- 场景 2：玩家切出 app 再切回来 ----------

section('场景 2：玩家切出 app 再切回，发牌状态不丢失')

DB = {}
createRoom('R003', 'dealer1', '庄家')
joinRoom('R003', 'playerA', '玩家A')

deal('R003', 'dealer1')
deal('R003', 'playerA')
assert(DB['R003'].status === 'betting', '预设：全员发牌，进入 betting')
assert(DB['R003'].players[1].hasDealt === true, '玩家A已发牌')

// 模拟 onShow 流程：fetchRoom → getRoom 拉最新数据
const roomResult = getRoom('R003', 'playerA')
assert(roomResult.ok === true, 'getRoom 成功')
assert(roomResult.openId === 'playerA', 'getRoom 返回了调用者 openId')

const roomData = roomResult.room
assert(roomData.status === 'betting', '拉取的状态是 betting，没有回退')

const selfInRoom = roomData.players.find((p) => p.openId === 'playerA')
assert(selfInRoom !== undefined, '能从 players 中找到自己')
assert(selfInRoom.hasDealt === true, '自己的发牌状态仍为 true')
assert(selfInRoom.card !== null, '自己的手牌仍在')

// ---------- 场景 3：庄家冷启动重进房间 ----------

section('场景 3：庄家冷启动重进房间，openId 恢复 + 开牌按钮正常')

DB = {}
createRoom('R004', 'dealer1', '庄家')
joinRoom('R004', 'playerA', '玩家A')
joinRoom('R004', 'playerB', '玩家B')

deal('R004', 'dealer1')
deal('R004', 'playerA')
deal('R004', 'playerB')
bet('R004', 'playerA', 2)
bet('R004', 'playerB', 3)
assert(DB['R004'].status === 'opening', '预设：进入 opening 阶段')

// 模拟冷启动：globalData.openId 丢失
const globalOpenId_lost = ''
const localStorageOpenId = 'dealer1'  // 之前存过
const getRoom_openId = ''  // 还没调 getRoom

// 优先级 1：尝试 globalData → 空
// 优先级 2：尝试 localStorage → 找到了
let recovered = recoverSelfOpenId(globalOpenId_lost, localStorageOpenId, getRoom_openId)
assert(recovered === 'dealer1', '从 localStorage 恢复了 selfOpenId')
assert(clientCanOpen(DB['R004'], recovered) === true, '恢复后庄家能看到开牌按钮')

// 如果 localStorage 也丢了，从 getRoom 恢复
const localStorageOpenId_also_lost = ''
const getRoom_result = getRoom('R004', 'dealer1')
recovered = recoverSelfOpenId('', localStorageOpenId_also_lost, getRoom_result.openId)
assert(recovered === 'dealer1', '从 getRoom 结果恢复了 selfOpenId')
assert(clientCanOpen(DB['R004'], recovered) === true, '恢复后庄家仍能看到开牌按钮')

// ---------- 额外场景：waiting 阶段允许新玩家加入 ----------

section('额外场景：waiting 阶段正常加入')

DB = {}
createRoom('R005', 'dealer1', '庄家')
assert(DB['R005'].status === 'waiting', '初始状态为 waiting')

const join1 = joinRoom('R005', 'p1', '张三')
assert(join1.ok === true, '新玩家在 waiting 阶段可以加入')
assert(DB['R005'].players.length === 2, '玩家数变为 2')
assert(DB['R005'].status === 'waiting', '状态仍为 waiting')

// ---------- 额外场景：watcher 断线重连模拟 ----------

section('额外场景：watcher onError 触发后状态一致性')

DB = {}
createRoom('R006', 'dealer1', '庄家')
joinRoom('R006', 'playerA', '玩家A')
deal('R006', 'dealer1')
deal('R006', 'playerA')
bet('R006', 'playerA', 1)
assert(DB['R006'].status === 'opening', '预设：进入 opening')

// watcher 断线后 fetchRoom 拉到的数据应与数据库一致
const afterReconnect = getRoom('R006', 'dealer1')
assert(afterReconnect.room.status === 'opening', '重连后拉到 opening 状态')
assert(clientCanOpen(afterReconnect.room, 'dealer1') === true, '重连后庄家仍能开牌')

// ======================== 结果汇总 ========================

console.log(`\n${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`)
console.log(`${BOLD}  总计: ${passed + failed} | ${GREEN}通过: ${passed}${RESET} | ${failed > 0 ? RED : GREEN}失败: ${failed}${RESET}`)
console.log(`${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`)

process.exit(failed > 0 ? 1 : 0)
