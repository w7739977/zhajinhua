const app = getApp()

function rotatePlayers(players, selfOpenId) {
  if (!selfOpenId) return players
  const idx = players.findIndex((p) => p.openId === selfOpenId)
  if (idx === -1) return players
  return players.slice(idx + 1).concat(players.slice(0, idx + 1))
}

function normalizePlayers(players) {
  return (players || []).map((p) => ({
    ...p,
    isReady: p && p.isReady === true,
    hasDealt: p && p.hasDealt === true,
    card: p && p.card ? p.card : null
  }))
}

let roomWatcher = null

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
    status: 'waiting',
    isReady: false,
    hasDealt: false,
    canDeal: false,
    canOpen: false,
    defaultAvatar: ''
  },

  onLoad(options) {
    const roomId = options.roomId || ''
    const isOwner = options.isOwner === '1'
    this.setData({ roomId, isOwner })
    this.selfOpenId = app.globalData.openId || ''
    this.isNavigatingToResult = false
    this.readyGuardUntil = 0
  },

  onShow() {
    const roomId = this.data.roomId
    if (!roomId) return
    // 防止从上一页跳转进入房间时，点击穿透误触“准备”按钮
    this.readyGuardUntil = Date.now() + 1200

    const needReset = wx.getStorageSync('roomNeedResetRound')
    if (needReset) {
      wx.removeStorageSync('roomNeedResetRound')
      wx.showLoading({ title: '等待准备...', mask: true })
      wx.cloud
        .callFunction({
          name: 'resetRound',
          data: { roomId }
        })
        .then((res) => {
          wx.hideLoading()
          const result = (res && res.result) || {}
          if (!result.ok) {
            wx.showToast({ title: result.message || '重置失败', icon: 'none' })
          }
          this.fetchRoom()
          this.initRoomWatcher()
        })
        .catch(() => {
          wx.hideLoading()
          wx.showToast({ title: '重置失败', icon: 'none' })
          this.fetchRoom()
          this.initRoomWatcher()
        })
      return
    }

    this.fetchRoom()
    this.initRoomWatcher()
  },

  onHide() {
    this.closeRoomWatcher()
  },

  onUnload() {
    this.closeRoomWatcher()
  },

  buildSelf(players, selfOpenId) {
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo') || null
    let self = players.find((p) => p.openId === selfOpenId)
    if (self && userInfo) {
      self = {
        ...self,
        nickName: userInfo.nickName || self.nickName,
        avatarUrl: userInfo.avatarUrl || self.avatarUrl
      }
    }
    return self || null
  },

  updateRoomView(room) {
    if (!room) return

    const players = normalizePlayers(room.players)
    const publicCard = room.publicCard || null
    const status = room.status || 'waiting'
    const selfOpenId = this.selfOpenId
    const ordered = rotatePlayers(players, selfOpenId).map((p) => ({
      ...p,
      isSelf: p.openId === selfOpenId
    }))
    const self = this.buildSelf(players, selfOpenId)
    const otherPlayers = ordered
      .filter((p) => !p.isSelf)
      .map((p) => ({
        ...p,
        card: null
      }))
    const publicCardText = (publicCard && (typeof publicCard === 'string' ? publicCard : publicCard.text)) || ''
    const allReady = players.length > 0 && players.every((p) => p.isReady === true)
    const allDealt = players.length > 0 && players.every((p) => p.hasDealt === true)
    const isReady = !!(self && self.isReady === true)
    const hasDealt = !!(self && self.hasDealt === true)
    const canDeal = allReady && !hasDealt && status !== 'opened'
    const canOpen = allDealt && status === 'dealing'

    this.setData({
      players,
      displayPlayers: ordered,
      otherPlayers,
      selfPlayer: self,
      publicCard,
      publicCardText,
      status,
      isReady,
      hasDealt,
      canDeal,
      canOpen
    })

    if (status !== 'opened') {
      this.isNavigatingToResult = false
    }

    if (status === 'opened' && !this.isNavigatingToResult) {
      this.isNavigatingToResult = true
      const data = {
        roomId: room.roomId,
        players,
        publicCard
      }
      wx.navigateTo({
        url: `/pages/result/result?data=${encodeURIComponent(JSON.stringify(data))}`
      })
    }
  },

  initRoomWatcher() {
    if (roomWatcher || !this.data.roomId) return
    const db = wx.cloud.database()
    roomWatcher = db
      .collection('rooms')
      .where({ roomId: this.data.roomId })
      .watch({
        onChange: (snapshot) => {
          const docs = snapshot.docs || []
          if (!docs.length) return
          this.updateRoomView(docs[0])
        },
        onError: (err) => {
          console.error('room watch error', err)
        }
      })
  },

  closeRoomWatcher() {
    if (roomWatcher) {
      roomWatcher.close()
      roomWatcher = null
    }
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
        wx.showToast({ title: result.message || '房间不存在', icon: 'none' })
        return
      }
      this.updateRoomView(result.room)
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

  onReady() {
    const { roomId, isReady } = this.data
    if (!roomId || isReady) return
    if (Date.now() < this.readyGuardUntil) return

    wx.showLoading({ title: '准备中...', mask: true })
    wx.cloud
      .callFunction({
        name: 'ready',
        data: { roomId }
      })
      .then((res) => {
        wx.hideLoading()
        const result = (res && res.result) || {}
        if (!result.ok) {
          wx.showToast({ title: result.message || '准备失败', icon: 'none' })
          return
        }
        if (result.room) {
          this.updateRoomView(result.room)
        }
      })
      .catch(() => {
        wx.hideLoading()
        wx.showToast({ title: '准备失败', icon: 'none' })
      })
  },

  onDeal() {
    const { roomId, canDeal } = this.data
    if (!canDeal || !roomId) return

    wx.showLoading({ title: '发牌中...', mask: true })
    wx.cloud
      .callFunction({
        name: 'deal',
        data: { roomId }
      })
      .then((res) => {
        wx.hideLoading()
        const result = (res && res.result) || {}
        if (!result.ok) {
          wx.showToast({ title: result.message || '发牌失败', icon: 'none' })
          return
        }
        if (result.currentOpenId && !this.selfOpenId) {
          this.selfOpenId = result.currentOpenId
          app.globalData.openId = result.currentOpenId
        }
        if (result.room) {
          this.updateRoomView(result.room)
        }
      })
      .catch(() => {
        wx.hideLoading()
        wx.showToast({ title: '发牌失败', icon: 'none' })
      })
  },

  onOpen() {
    const { roomId, canOpen } = this.data
    if (!canOpen || !roomId) return

    wx.showLoading({ title: '开牌中...', mask: true })
    wx.cloud
      .callFunction({
        name: 'open',
        data: { roomId }
      })
      .then((res) => {
        wx.hideLoading()
        const result = (res && res.result) || {}
        if (!result.ok) {
          wx.showToast({ title: result.message || '开牌失败', icon: 'none' })
        }
      })
      .catch(() => {
        wx.hideLoading()
        wx.showToast({ title: '开牌失败', icon: 'none' })
      })
  }
})
