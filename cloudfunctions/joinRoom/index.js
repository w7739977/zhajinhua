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
    const nickName = event.nickName || '玩家'
    const avatarUrl = event.avatarUrl || ''

    if (!roomId) {
      return { ok: false, code: 'ROOM_ID_EMPTY', message: '房间号为空' }
    }

    const roomRes = await rooms.where({ roomId }).limit(1).get()
    if (!roomRes.data.length) {
      return { ok: false, code: 'ROOM_NOT_FOUND', message: '房间不存在' }
    }

    const room = roomRes.data[0]
    const players = room.players || []
    const status = room.status || 'waiting'
    const idx = players.findIndex((p) => p.openId === openId)
    const isNewPlayer = idx === -1

    if (isNewPlayer && status !== 'waiting') {
      return { ok: false, code: 'GAME_IN_PROGRESS', message: '游戏中，请等待本局结束后再加入' }
    }

    if (isNewPlayer) {
      players.push({
        openId,
        nickName,
        avatarUrl,
        hasDealt: false,
        card: null,
        bet: null,
        score: 0
      })
    } else {
      players[idx].nickName = nickName
      players[idx].avatarUrl = avatarUrl
    }

    await rooms.doc(room._id).update({
      data: {
        players: _.set(players),
        updatedAt: db.serverDate()
      }
    })

    return {
      ok: true,
      openId,
      room: {
        roomId: room.roomId,
        ownerOpenId: room.ownerOpenId || '',
        dealerOpenId: room.dealerOpenId || room.ownerOpenId || '',
        players,
        publicCard: room.publicCard || null,
        status
      }
    }
  } catch (err) {
    console.error('joinRoom error:', err)
    return {
      ok: false,
      code: 'JOIN_FAILED',
      message: err.message || '加入房间失败'
    }
  }
}
