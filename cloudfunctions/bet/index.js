const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-2gytrceb3105a929'
})

const db = cloud.database()
const _ = db.command
const rooms = db.collection('rooms')

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext()
    const openId = wxContext.OPENID
    const roomId = String(event.roomId || '').trim()
    const betAmount = parseInt(event.bet)

    if (!roomId) {
      return { ok: false, code: 'ROOM_ID_EMPTY', message: '房间号为空' }
    }

    if (![1, 2, 3].includes(betAmount)) {
      return { ok: false, code: 'INVALID_BET', message: '注码无效，请选择1、2或3' }
    }

    const roomRes = await rooms.where({ roomId }).limit(1).get()
    if (!roomRes.data.length) {
      return { ok: false, code: 'ROOM_NOT_FOUND', message: '房间不存在' }
    }

    const room = roomRes.data[0]
    const players = room.players || []
    const idx = players.findIndex((p) => p.openId === openId)

    if (idx === -1) {
      return { ok: false, code: 'PLAYER_NOT_IN_ROOM', message: '玩家不在房间内' }
    }

    if (openId === room.dealerOpenId) {
      return { ok: false, code: 'DEALER_NO_BET', message: '庄家无需下注' }
    }

    if (room.status !== 'betting') {
      return { ok: false, code: 'NOT_BETTING', message: '当前不在下注阶段' }
    }

    if (players[idx].bet != null) {
      return { ok: false, code: 'ALREADY_BET', message: '你已经下注了' }
    }

    players[idx].bet = betAmount

    const nonDealerPlayers = players.filter((p) => p.openId !== room.dealerOpenId)
    const allBet = nonDealerPlayers.every((p) => p.bet != null)
    const nextStatus = allBet ? 'opening' : 'betting'

    await rooms.doc(room._id).update({
      data: {
        players: _.set(players),
        status: nextStatus,
        updatedAt: db.serverDate()
      }
    })

    return {
      ok: true,
      room: {
        roomId: room.roomId,
        players,
        publicCard: room.publicCard || null,
        status: nextStatus,
        dealerOpenId: room.dealerOpenId
      }
    }
  } catch (err) {
    console.error('bet error:', err)
    return {
      ok: false,
      code: 'BET_FAILED',
      message: err.message || '下注失败'
    }
  }
}
