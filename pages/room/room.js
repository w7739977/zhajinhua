const app = getApp()

function rotatePlayers(players, selfOpenId) {
  if (!selfOpenId) return players
  const idx = players.findIndex((p) => p.openId === selfOpenId)
  if (idx === -1) return players
  const ordered = players.slice(idx + 1).concat(players.slice(0, idx + 1))
  return ordered
}

Page({
  data: {
    roomId: '',
    isOwner: false,
    players: [],
    displayPlayers: [],
    otherPlayers: [],
    selfPlayer: null,
    publicCard: null,
    publicCardText: '',
    hasDealt: false,
    canOpen: false,
    defaultAvatar: ''
  },

  onLoad(options) {
    const roomId = options.roomId || ''
    const isOwner = options.isOwner === '1'
    this.setData({ roomId, isOwner })
    this.selfOpenId = app.globalData.openId || ''
  },

  onShow() {
    const roomId = this.data.roomId
    if (!roomId) return

    const needReset = wx.getStorageSync('roomNeedResetRound')
    if (needReset) {
      wx.removeStorageSync('roomNeedResetRound')
      wx.showLoading({ title: '新一局...', mask: true })
      wx.cloud
        .callFunction({
          name: 'resetRound',
          data: { roomId }
        })
        .then((res) => {
          wx.hideLoading()
          const result = (res && res.result) || {}
          if (result.ok !== true) {
            wx.showToast({ title: result.message || '新一局失败', icon: 'none' })
          }
          this.fetchRoom()
        })
        .catch((e) => {
          wx.hideLoading()
          wx.showToast({ title: '新一局失败', icon: 'none' })
          this.fetchRoom()
        })
      return
    }

    this.fetchRoom()
  },

  async fetchRoom() {
    const { roomId } = this.data
    if (!roomId) return

    try {
      wx.showLoading({ title: '加载中...', mask: true })
      const res = await wx.cloud.callFunction({
        name: 'getRoom',
        data: { roomId }
      })
      wx.hideLoading()
      const result = res.result || {}
      if (!result.ok) {
        wx.showToast({ title: '房间不存在', icon: 'none' })
        return
      }
      const room = result.room
      const players = room.players || []
      const publicCard = room.publicCard || null

      const selfOpenId = this.selfOpenId
      const ordered = rotatePlayers(players, selfOpenId).map((p) => ({
        ...p,
        isSelf: p.openId === selfOpenId
      }))

      const self = players.find((p) => p.openId === selfOpenId)
      const publicCardText = (publicCard && (typeof publicCard === 'string' ? publicCard : publicCard.text)) || ''
      const otherPlayers = ordered.filter((p) => !p.isSelf)
      const canOpen = players.length > 0 && players.every((p) => p.hasDealt)

      this.setData({
        players,
        displayPlayers: ordered,
        otherPlayers,
        selfPlayer: self || null,
        publicCard,
        publicCardText,
        hasDealt: !!(self && self.hasDealt),
        canOpen
      })
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  onShareAppMessage() {
    const { roomId } = this.data
    return {
      title: `邀请你加入房间 ${roomId}`,
      path: `/pages/room/room?roomId=${roomId}`
    }
  },

  onDeal() {
    const { roomId, hasDealt } = this.data
    console.log('[onDeal] 点击发牌 roomId=', roomId, 'hasDealt=', hasDealt)

    if (hasDealt) return
    if (!roomId) {
      wx.showToast({ title: '房间号为空', icon: 'none' })
      return
    }

    wx.showLoading({ title: '发牌中...', mask: true })
    wx.cloud
      .callFunction({
        name: 'deal',
        data: { roomId }
      })
      .then((res) => {
        wx.hideLoading()
        try {
          console.log('[onDeal] 云函数完整响应:', res)
          const result = res && res.result
          if (result === undefined || result === null) {
            console.error('[onDeal] result 为空 res=', res)
            wx.showToast({ title: '发牌异常: 无返回数据', icon: 'none' })
            return
          }
          if (result.errCode !== undefined && result.errCode !== 0) {
            console.error('[onDeal] 云函数错误:', result)
            wx.showToast({ title: (result.errMsg || '发牌失败').slice(0, 20), icon: 'none' })
            return
          }
          if (!result.ok) {
            const msg = result.message || result.code || '发牌失败'
            if (result.code === 'DECK_EMPTY') {
              wx.showToast({ title: '牌已经发完', icon: 'none' })
            } else if (result.code === 'PLAYER_NOT_IN_ROOM') {
              wx.showToast({ title: '未在房间内，请重新进入', icon: 'none' })
            } else {
              wx.showToast({ title: msg.slice(0, 20), icon: 'none' })
            }
            return
          }
          const room = result.room
          const players = (room && room.players) || []
          const publicCard = (room && room.publicCard) || null

          // 用云端返回的 currentOpenId 兜底，避免 globalData.openId 未同步导致找不到自己
          const currentOpenId = result.currentOpenId || this.selfOpenId || app.globalData.openId || ''
          if (currentOpenId && !this.selfOpenId) {
            this.selfOpenId = currentOpenId
            app.globalData.openId = currentOpenId
          }

          const selfOpenId = this.selfOpenId
          const ordered = rotatePlayers(players, selfOpenId).map((p) => ({
            ...p,
            isSelf: p.openId === selfOpenId
          }))
          const self = players.find((p) => p.openId === selfOpenId)
          const publicCardText = (publicCard && (typeof publicCard === 'string' ? publicCard : publicCard.text)) || ''
          const otherPlayers = ordered.filter((p) => !p.isSelf)
          const canOpen = players.length > 0 && players.every((p) => p.hasDealt)

          this.setData({
            players,
            displayPlayers: ordered,
            otherPlayers,
            selfPlayer: self || null,
            publicCard,
            publicCardText,
            hasDealt: !!(self && self.hasDealt),
            canOpen
          })
        } catch (err) {
          console.error('[onDeal] then 内异常:', err)
          wx.showToast({ title: '发牌解析异常', icon: 'none' })
        }
      })
      .catch((e) => {
        wx.hideLoading()
        const errMsg = (e && e.errMsg) ? e.errMsg : (e && e.message) ? e.message : String(e)
        console.error('[onDeal] 调用异常:', errMsg, e)
        wx.showToast({
          title: errMsg.length > 18 ? errMsg.slice(0, 18) + '…' : errMsg || '发牌失败',
          icon: 'none',
          duration: 3000
        })
      })
  },

  onOpen() {
    const { roomId } = this.data
    if (!roomId) return

    wx.showLoading({ title: '加载中...', mask: true })
    wx.cloud
      .callFunction({
        name: 'getRoom',
        data: { roomId }
      })
      .then((res) => {
        wx.hideLoading()
        const result = res.result || {}
        if (!result.ok) {
          wx.showToast({ title: '房间不存在', icon: 'none' })
          return
        }
        const room = result.room
        const data = {
          roomId: room.roomId,
          players: room.players || [],
          publicCard: room.publicCard || null
        }
        wx.navigateTo({
          url: `/pages/result/result?data=${encodeURIComponent(JSON.stringify(data))}`
        })
      })
      .catch(() => {
        wx.hideLoading()
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  }
})

