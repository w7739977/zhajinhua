const app = getApp()

function getCardColorClass(card) {
  const text = typeof card === 'string' ? card : card && card.text
  if (!text) return ''
  return text.startsWith('♥') || text.startsWith('♦') ? 'poker-card-text-red' : ''
}

Page({
  data: {
    roomId: '',
    publicCard: null,
    publicCardColorClass: '',
    dealer: null,
    playerResults: [],
    passDealer: false,
    mode: '',
    modeText: '',
    defaultAvatar: ''
  },

  onLoad(options) {
    const roomId = options.roomId || ''
    const roundResult = app.globalData.roundResult
    const allPlayers = app.globalData.roomPlayers || []

    if (!roundResult) {
      this.setData({ roomId })
      this.fetchResultFromCloud(roomId)
      return
    }

    this.applyResult(roomId, roundResult, allPlayers)
  },

  async fetchResultFromCloud(roomId) {
    if (!roomId) return
    try {
      const res = await wx.cloud.callFunction({ name: 'getRoom', data: { roomId } })
      const result = res.result || {}
      if (result.ok && result.room && result.room.roundResult) {
        this.applyResult(roomId, result.room.roundResult, result.room.players || [])
      }
    } catch (e) {
      console.error('fetch result failed', e)
    }
  },

  applyResult(roomId, rr, allPlayers) {
    const publicCard = rr.publicCard || null

    const dealerCards = [
      { text: publicCard, label: '公', colorClass: getCardColorClass(publicCard) },
      { text: rr.dealerHandCard, label: '手', colorClass: getCardColorClass(rr.dealerHandCard) },
      { text: rr.dealerWildCard, label: '万能', colorClass: getCardColorClass(rr.dealerWildCard) }
    ]

    const dealerPlayer = allPlayers.find((p) => p.openId === rr.dealerOpenId)

    const dealer = {
      openId: rr.dealerOpenId,
      nickName: rr.dealerNickName || (dealerPlayer && dealerPlayer.nickName) || '庄家',
      avatarUrl: rr.dealerAvatarUrl || (dealerPlayer && dealerPlayer.avatarUrl) || '',
      handTypeName: rr.dealerHandTypeName,
      cards: dealerCards,
      scoreChange: rr.dealerScoreChange || 0,
      totalScore: dealerPlayer ? dealerPlayer.score || 0 : 0
    }

    const playerResults = (rr.playerResults || []).map((pr) => {
      const p = allPlayers.find((x) => x.openId === pr.openId)
      const cards = [
        { text: publicCard, label: '公', colorClass: getCardColorClass(publicCard) },
        { text: pr.handCard, label: '手', colorClass: getCardColorClass(pr.handCard) },
        { text: pr.wildCard, label: '万能', colorClass: getCardColorClass(pr.wildCard) }
      ]

      let resultText = ''
      let resultClass = ''
      if (pr.result === 'dealerWin') {
        resultText = '庄家赢'
        resultClass = 'result-lose'
      } else if (pr.result === 'playerWin') {
        resultText = '玩家赢'
        resultClass = 'result-win'
      } else {
        resultText = '平局'
        resultClass = 'result-tie'
      }

      return {
        ...pr,
        nickName: pr.nickName || (p && p.nickName) || '玩家',
        avatarUrl: pr.avatarUrl || (p && p.avatarUrl) || '',
        cards,
        handTypeName: pr.handTypeName,
        resultText,
        resultClass,
        scoreChange: pr.result === 'dealerWin' ? -pr.bet : pr.result === 'playerWin' ? pr.bet : 0,
        totalScore: p ? p.score || 0 : 0
      }
    })

    const modeMap = {
      selectPlayers: '选择开牌',
      openAll: '全开',
      openAllNoPass: '全开不过庄'
    }

    this.setData({
      roomId,
      publicCard,
      publicCardColorClass: getCardColorClass(publicCard),
      dealer,
      playerResults,
      passDealer: !!rr.passDealer,
      mode: rr.mode,
      modeText: modeMap[rr.mode] || ''
    })
  },

  onBack() {
    wx.setStorageSync('roomNeedResetRound', true)
    wx.navigateBack()
  }
})
