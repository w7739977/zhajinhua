Page({
  data: {
    roomId: '',
    players: [],
    publicCard: null,
    defaultAvatar: ''
  },

  onLoad(options) {
    if (options.data) {
      try {
        const parsed = JSON.parse(decodeURIComponent(options.data))
        this.setData({
          roomId: parsed.roomId || '',
          players: parsed.players || [],
          publicCard: parsed.publicCard || null
        })
      } catch (e) {
        console.error('解析结果数据失败', e)
      }
    }
  },

  onBack() {
    wx.setStorageSync('roomNeedResetRound', true)
    wx.navigateBack()
  }
})
