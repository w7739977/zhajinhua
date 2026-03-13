function getCardColorClass(card) {
  const text = typeof card === 'string' ? card : card && card.text
  if (!text) return ''
  return text.startsWith('♥') || text.startsWith('♦') ? 'poker-card-text-red' : ''
}

Page({
  data: {
    roomId: '',
    players: [],
    publicCard: null,
    publicCardColorClass: '',
    defaultAvatar: ''
  },

  onLoad(options) {
    if (options.data) {
      try {
        const parsed = JSON.parse(decodeURIComponent(options.data))
        const players = (parsed.players || []).map((item) => ({
          ...item,
          cardColorClass: getCardColorClass(item.card)
        }))
        const publicCard = parsed.publicCard || null
        this.setData({
          roomId: parsed.roomId || '',
          players,
          publicCard,
          publicCardColorClass: getCardColorClass(publicCard)
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
