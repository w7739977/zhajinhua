const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-2gytrceb3105a929'
})

const db = cloud.database()
const rooms = db.collection('rooms')

// ==================== 牌型计算引擎 ====================

const SUITS = ['♠', '♥', '♣', '♦']
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

const HAND_TYPE = {
  HIGH_CARD: 0,
  PAIR: 1,
  STRAIGHT: 2,
  FLUSH: 3,
  STRAIGHT_FLUSH: 4,
  THREE_OF_A_KIND: 5
}

const HAND_TYPE_NAME = {
  0: '散牌',
  1: '对子',
  2: '顺子',
  3: '同花',
  4: '同花顺',
  5: '豹子'
}

function rankValue(rank) {
  if (rank === 'A') return 14
  if (rank === 'K') return 13
  if (rank === 'Q') return 12
  if (rank === 'J') return 11
  return parseInt(rank)
}

function parseCard(cardStr) {
  const suit = cardStr[0]
  const rank = cardStr.slice(1)
  return { suit, rank, value: rankValue(rank), text: cardStr }
}

function evaluateThreeCards(c1, c2, c3) {
  const cards = [parseCard(c1), parseCard(c2), parseCard(c3)]
  cards.sort((a, b) => b.value - a.value)

  const values = cards.map((c) => c.value)
  const suits = cards.map((c) => c.suit)
  const sameSuit = suits[0] === suits[1] && suits[1] === suits[2]

  const sorted = values.slice().sort((a, b) => a - b)
  const is235 = sorted[0] === 2 && sorted[1] === 3 && sorted[2] === 5
  const isSpecial235 = is235 && !sameSuit

  if (values[0] === values[1] && values[1] === values[2]) {
    return { type: HAND_TYPE.THREE_OF_A_KIND, typeName: '豹子', cmp: values, is235: false }
  }

  let isStraight = false
  let straightCmp = values

  if (values[0] - values[1] === 1 && values[1] - values[2] === 1) {
    isStraight = true
  }
  if (values[0] === 14 && values[1] === 3 && values[2] === 2) {
    isStraight = true
    straightCmp = [3, 2, 1]
  }

  if (sameSuit && isStraight) {
    return { type: HAND_TYPE.STRAIGHT_FLUSH, typeName: '同花顺', cmp: straightCmp, is235: false }
  }
  if (sameSuit) {
    return { type: HAND_TYPE.FLUSH, typeName: '同花', cmp: values, is235: false }
  }
  if (isStraight) {
    return { type: HAND_TYPE.STRAIGHT, typeName: '顺子', cmp: straightCmp, is235: false }
  }

  if (values[0] === values[1]) {
    return { type: HAND_TYPE.PAIR, typeName: '对子', cmp: [values[0], values[0], values[2]], is235: false }
  }
  if (values[1] === values[2]) {
    return { type: HAND_TYPE.PAIR, typeName: '对子', cmp: [values[1], values[1], values[0]], is235: false }
  }

  return {
    type: HAND_TYPE.HIGH_CARD,
    typeName: isSpecial235 ? '散牌(2-3-5)' : '散牌',
    cmp: values,
    is235: isSpecial235
  }
}

function compareHands(a, b) {
  if (a.is235 && b.type === HAND_TYPE.THREE_OF_A_KIND) return 1
  if (b.is235 && a.type === HAND_TYPE.THREE_OF_A_KIND) return -1

  if (a.type !== b.type) return a.type - b.type

  for (let i = 0; i < a.cmp.length; i++) {
    if (a.cmp[i] !== b.cmp[i]) return a.cmp[i] - b.cmp[i]
  }
  return 0
}

function findBestHand(publicCard, handCard) {
  let bestHand = null
  let bestWild = null

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const wild = `${suit}${rank}`
      const hand = evaluateThreeCards(publicCard, handCard, wild)
      if (!bestHand || compareHands(hand, bestHand) > 0) {
        bestHand = hand
        bestWild = wild
      }
    }
  }

  return { hand: bestHand, wildCard: bestWild }
}

function getNextDealer(players, currentDealerOpenId) {
  const idx = players.findIndex((p) => p.openId === currentDealerOpenId)
  if (idx === -1) return players[0].openId
  return players[(idx + 1) % players.length].openId
}

// ==================== 主函数 ====================

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext()
    const openId = wxContext.OPENID
    const roomId = String(event.roomId || '').trim()
    const mode = event.mode
    const selectedOpenIds = event.selectedOpenIds || []

    if (!roomId) {
      return { ok: false, code: 'ROOM_ID_EMPTY', message: '房间号为空' }
    }

    const roomRes = await rooms.where({ roomId }).limit(1).get()
    if (!roomRes.data.length) {
      return { ok: false, code: 'ROOM_NOT_FOUND', message: '房间不存在' }
    }

    const room = roomRes.data[0]
    const players = room.players || []

    if (openId !== room.dealerOpenId) {
      return { ok: false, code: 'NOT_DEALER', message: '只有庄家才能开牌' }
    }

    if (room.status !== 'opening') {
      return { ok: false, code: 'NOT_OPENING', message: '当前不在开牌阶段' }
    }

    if (!['selectPlayers', 'openAll', 'openAllNoPass'].includes(mode)) {
      return { ok: false, code: 'INVALID_MODE', message: '无效的开牌模式' }
    }

    const publicCard = room.publicCard
    if (!publicCard) {
      return { ok: false, code: 'NO_PUBLIC_CARD', message: '公牌不存在' }
    }

    let targetOpenIds
    if (mode === 'openAll' || mode === 'openAllNoPass') {
      targetOpenIds = players
        .filter((p) => p.openId !== room.dealerOpenId)
        .map((p) => p.openId)
    } else {
      targetOpenIds = selectedOpenIds.filter((id) => id !== room.dealerOpenId)
    }

    if (!targetOpenIds.length) {
      return { ok: false, code: 'NO_TARGET', message: '请选择至少一位玩家' }
    }

    const dealer = players.find((p) => p.openId === room.dealerOpenId)
    if (!dealer || !dealer.card) {
      return { ok: false, code: 'DEALER_NO_CARD', message: '庄家未发牌' }
    }

    const dealerBest = findBestHand(publicCard, dealer.card)

    const playerResults = []
    let dealerWinAll = true

    for (const targetId of targetOpenIds) {
      const target = players.find((p) => p.openId === targetId)
      if (!target || !target.card) continue

      const targetBest = findBestHand(publicCard, target.card)
      const cmp = compareHands(dealerBest.hand, targetBest.hand)

      let result
      let betChange = 0
      const bet = target.bet || 0

      if (cmp > 0) {
        result = 'dealerWin'
        betChange = bet
      } else if (cmp < 0) {
        result = 'playerWin'
        betChange = -bet
        dealerWinAll = false
      } else {
        result = 'tie'
        dealerWinAll = false
      }

      playerResults.push({
        openId: targetId,
        nickName: target.nickName,
        avatarUrl: target.avatarUrl,
        handCard: target.card,
        wildCard: targetBest.wildCard,
        handType: targetBest.hand.type,
        handTypeName: targetBest.hand.typeName,
        bet,
        result,
        betChange
      })
    }

    let dealerScoreChange = 0
    for (const pr of playerResults) {
      const pIdx = players.findIndex((p) => p.openId === pr.openId)
      if (pIdx === -1) continue

      if (pr.result === 'dealerWin') {
        players[pIdx].score = (players[pIdx].score || 0) - pr.bet
        dealerScoreChange += pr.bet
      } else if (pr.result === 'playerWin') {
        players[pIdx].score = (players[pIdx].score || 0) + pr.bet
        dealerScoreChange -= pr.bet
      }
    }

    const dealerIdx = players.findIndex((p) => p.openId === room.dealerOpenId)
    if (dealerIdx !== -1) {
      players[dealerIdx].score = (players[dealerIdx].score || 0) + dealerScoreChange
    }

    let passDealer = false
    let nextDealerOpenId = room.dealerOpenId

    if (mode === 'openAll' && dealerWinAll && targetOpenIds.length > 0) {
      const dt = dealerBest.hand.type
      if (dt === HAND_TYPE.THREE_OF_A_KIND || dt === HAND_TYPE.STRAIGHT_FLUSH) {
        passDealer = true
        nextDealerOpenId = getNextDealer(players, room.dealerOpenId)
      }
    }

    const roundResult = {
      dealerOpenId: room.dealerOpenId,
      dealerNickName: dealer.nickName,
      dealerAvatarUrl: dealer.avatarUrl,
      dealerHandCard: dealer.card,
      dealerWildCard: dealerBest.wildCard,
      dealerHandType: dealerBest.hand.type,
      dealerHandTypeName: dealerBest.hand.typeName,
      dealerScoreChange,
      publicCard,
      playerResults,
      passDealer,
      nextDealerOpenId,
      mode
    }

    await rooms.doc(room._id).update({
      data: {
        players,
        status: 'opened',
        dealerOpenId: nextDealerOpenId,
        roundResult,
        updatedAt: db.serverDate()
      }
    })

    return { ok: true, roundResult }
  } catch (err) {
    console.error('open error:', err)
    return {
      ok: false,
      code: 'OPEN_FAILED',
      message: err.message || '开牌失败'
    }
  }
}
