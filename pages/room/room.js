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
    hasDealt: p && p.hasDealt === true,
    card: p && p.card ? p.card : null,
    bet: p && p.bet != null ? p.bet : null,
    score: p && p.score != null ? p.score : 0
  }))
}

function getCardColorClass(card) {
  const text = typeof card === 'string' ? card : card && card.text
  if (!text) return ''
  return text.startsWith('♥') || text.startsWith('♦') ? 'poker-card-text-red' : ''
}

let roomWatcher = null

Page({
  data: {
    roomId: '',
    isOwner: false,
    players: [],
    displayPlayers: [],
    otherPlayers: [],
    leftPlayers: [],
    rightPlayers: [],
    selfPlayer: null,
    publicCard: null,
    publicCardText: '',
    publicCardColorClass: '',
    selfCardColorClass: '',
    status: 'waiting',
    dealerOpenId: '',
    isDealer: false,
    hasDealt: false,
    canDeal: true,
    hasBet: false,
    canBet: false,
    canOpen: false,
    selectedPlayers: {},
    selectedCount: 0,
    defaultAvatar: ''
  },

  onLoad(options) {
    const roomId = options.roomId || ''
    const isOwner = options.isOwner === '1'
    this.setData({ roomId, isOwner })
    this.selfOpenId = app.globalData.openId || ''
    this.isNavigatingToResult = false
  },

  onShow() {
    const roomId = this.data.roomId
    if (!roomId) return

    const needReset = wx.getStorageSync('roomNeedResetRound')
    if (needReset) {
      wx.removeStorageSync('roomNeedResetRound')
      this.setData({ selectedPlayers: {}, selectedCount: 0 })
      wx.showLoading({ title: '新一局...', mask: true })
      wx.cloud
        .callFunction({ name: 'resetRound', data: { roomId } })
        .then((res) => {
          wx.hideLoading()
          const result = (res && res.result) || {}
          if (!result.ok) {
            wx.showToast({ title: result.message || '重置失败', icon: 'none' })
          }
          const passed = result.autoPassed || wx.getStorageSync('roomPassedDealer')
          wx.removeStorageSync('roomPassedDealer')
          if (passed) {
            const tip = result.autoPassed ? '牌组不足，自动过庄' : '庄家全胜，自动过庄'
            wx.showToast({ title: tip, icon: 'none', duration: 2500 })
          }
          this.fetchRoom()
          this.initRoomWatcher()
        })
        .catch(() => {
          wx.hideLoading()
          wx.removeStorageSync('roomPassedDealer')
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
    const dealerOpenId = room.dealerOpenId || room.ownerOpenId || ''
    const selfOpenId = this.selfOpenId

    const ordered = rotatePlayers(players, selfOpenId).map((p) => ({
      ...p,
      isSelf: p.openId === selfOpenId,
      isDealer: p.openId === dealerOpenId
    }))

    const self = this.buildSelf(players, selfOpenId)
    const isDealer = selfOpenId === dealerOpenId

    const otherPlayers = ordered
      .filter((p) => !p.isSelf)
      .map((p) => ({
        ...p,
        card: null,
        selected: !!(this.data.selectedPlayers && this.data.selectedPlayers[p.openId])
      }))

    const splitIndex = Math.ceil(otherPlayers.length / 2)
    const rightPlayers = otherPlayers.slice(0, splitIndex).reverse()
    const leftPlayers = otherPlayers.slice(splitIndex)

    const publicCardText =
      (publicCard && (typeof publicCard === 'string' ? publicCard : publicCard.text)) || ''
    const publicCardColorClass = getCardColorClass(publicCard)
    const selfCardColorClass = getCardColorClass(self && self.card)

    const allDealt = players.length > 0 && players.every((p) => p.hasDealt === true)
    const hasDealt = !!(self && self.hasDealt === true)
    const canDeal =
      !hasDealt && (status === 'waiting' || status === 'dealing') && status !== 'opened'

    const hasBet = !!(self && self.bet != null)
    const canBet = status === 'betting' && !isDealer && !hasBet

    const nonDealerAllBet =
      players.filter((p) => p.openId !== dealerOpenId).every((p) => p.bet != null) &&
      players.filter((p) => p.openId !== dealerOpenId).length > 0
    const canOpen = status === 'opening' && isDealer

    const selectedCount = Object.values(this.data.selectedPlayers || {}).filter(Boolean).length

    this.setData({
      players,
      displayPlayers: ordered,
      otherPlayers,
      leftPlayers,
      rightPlayers,
      selfPlayer: self,
      publicCard,
      publicCardText,
      publicCardColorClass,
      selfCardColorClass,
      status,
      dealerOpenId,
      isDealer,
      hasDealt,
      canDeal,
      hasBet,
      canBet,
      canOpen,
      selectedCount
    })

    if (status !== 'opened') {
      this.isNavigatingToResult = false
    }

    if (status === 'opened' && !this.isNavigatingToResult) {
      this.isNavigatingToResult = true
      app.globalData.roundResult = room.roundResult || null
      app.globalData.roomPlayers = players
      wx.navigateTo({
        url: `/pages/result/result?roomId=${room.roomId}`
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
      const res = await wx.cloud.callFunction({ name: 'getRoom', data: { roomId } })
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

  // ==================== 发牌 ====================
  onDeal() {
    const { roomId, canDeal } = this.data
    if (!canDeal || !roomId) return

    wx.showLoading({ title: '发牌中...', mask: true })
    wx.cloud
      .callFunction({ name: 'deal', data: { roomId } })
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
        if (result.room) this.updateRoomView(result.room)
      })
      .catch(() => {
        wx.hideLoading()
        wx.showToast({ title: '发牌失败', icon: 'none' })
      })
  },

  // ==================== 下注 ====================
  onBet(e) {
    const amount = parseInt(e.currentTarget.dataset.amount)
    const { roomId, canBet } = this.data
    if (!canBet || !roomId) return

    wx.showLoading({ title: '下注中...', mask: true })
    wx.cloud
      .callFunction({ name: 'bet', data: { roomId, bet: amount } })
      .then((res) => {
        wx.hideLoading()
        const result = (res && res.result) || {}
        if (!result.ok) {
          wx.showToast({ title: result.message || '下注失败', icon: 'none' })
          return
        }
        if (result.room) this.updateRoomView(result.room)
      })
      .catch(() => {
        wx.hideLoading()
        wx.showToast({ title: '下注失败', icon: 'none' })
      })
  },

  // ==================== 选人开牌（庄家） ====================
  onTogglePlayer(e) {
    if (!this.data.isDealer || this.data.status !== 'opening') return
    const openId = e.currentTarget.dataset.openid
    if (!openId || openId === this.selfOpenId) return

    const selected = { ...this.data.selectedPlayers }
    selected[openId] = !selected[openId]
    const selectedCount = Object.values(selected).filter(Boolean).length

    this.setData({ selectedPlayers: selected, selectedCount })

    const otherPlayers = this.data.otherPlayers.map((p) => ({
      ...p,
      selected: !!selected[p.openId]
    }))
    const splitIndex = Math.ceil(otherPlayers.length / 2)
    const rightPlayers = otherPlayers.slice(0, splitIndex).reverse()
    const leftPlayers = otherPlayers.slice(splitIndex)
    this.setData({ otherPlayers, leftPlayers, rightPlayers })
  },

  onOpenSelected() {
    const { roomId, canOpen, selectedCount, selectedPlayers } = this.data
    if (!canOpen || !roomId || selectedCount === 0) return
    const ids = Object.keys(selectedPlayers).filter((k) => selectedPlayers[k])
    this._doOpen('selectPlayers', ids)
  },

  onOpenAll() {
    if (!this.data.canOpen || !this.data.roomId) return
    this._doOpen('openAll', [])
  },

  onOpenAllNoPass() {
    if (!this.data.canOpen || !this.data.roomId) return
    this._doOpen('openAllNoPass', [])
  },

  _doOpen(mode, selectedOpenIds) {
    const { roomId } = this.data
    wx.showLoading({ title: '开牌中...', mask: true })
    wx.cloud
      .callFunction({
        name: 'open',
        data: { roomId, mode, selectedOpenIds }
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
  },

})
