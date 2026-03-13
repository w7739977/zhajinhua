const app = getApp()

Page({
  data: {
    joinRoomId: '',
    showJoinInput: false,
    showAuthModal: true,
    authorizedUserInfo: null,
    customNickName: ''
  },

  onLoad() {
    const savedUserInfo = wx.getStorageSync('userInfo') || null
    if (savedUserInfo) {
      app.globalData.userInfo = savedUserInfo
      this.setData({
        authorizedUserInfo: savedUserInfo,
        showAuthModal: false
      })
    }
  },

  getUserProfile() {
    wx.getUserProfile({
      desc: '用于展示头像和昵称',
      success: (res) => {
        this.setData({
          authorizedUserInfo: res.userInfo
        })
      },
      fail: () => {
        wx.showToast({ title: '未授权将无法显示头像昵称', icon: 'none' })
      }
    })
  },

  onNicknameInput(e) {
    this.setData({
      customNickName: (e.detail.value || '').trim()
    })
  },

  onConfirmProfile() {
    const authorizedUserInfo = this.data.authorizedUserInfo
    if (!authorizedUserInfo) {
      wx.showToast({ title: '请先同意授权', icon: 'none' })
      return
    }

    const finalUserInfo = {
      ...authorizedUserInfo,
      nickName: this.data.customNickName || authorizedUserInfo.nickName || '玩家'
    }

    app.globalData.userInfo = finalUserInfo
    wx.setStorageSync('userInfo', finalUserInfo)
    this.setData({
      showAuthModal: false
    })
    wx.showToast({ title: '已确认昵称头像', icon: 'success' })
  },

  onRoomIdInput(e) {
    this.setData({ joinRoomId: e.detail.value.trim() })
  },

  async onCreateRoom() {
    if (this.data.showAuthModal) return
    try {
      wx.showLoading({ title: '创建中...', mask: true })
      const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo') || {}
      const res = await wx.cloud.callFunction({
        name: 'createRoom',
        data: {
          nickName: userInfo.nickName || '我',
          avatarUrl: userInfo.avatarUrl || ''
        }
      })
      wx.hideLoading()

      // 便于排查：完整响应会打在控制台
      console.log('[createRoom] 云函数完整响应:', res)
      const result = res.result
      if (result === undefined || result === null) {
        console.error('[createRoom] result 为空，请确认云函数已部署且环境正确')
        wx.showToast({ title: '云函数未返回数据，请查看控制台', icon: 'none' })
        return
      }

      // 微信云函数报错时有时会放在 result 里
      if (result.errCode !== undefined && result.errCode !== 0) {
        const msg = result.errMsg || ('errCode: ' + result.errCode)
        console.error('[createRoom] 云函数错误:', result)
        wx.showToast({ title: msg, icon: 'none' })
        return
      }
      if (result.ok === false) {
        wx.showToast({ title: result.message || '创建失败', icon: 'none' })
        return
      }

      const roomId = result.roomId
      const openId = result.openId
      if (!roomId) {
        console.error('[createRoom] 返回无 roomId，result:', result)
        wx.showToast({ title: '创建失败，请查看控制台', icon: 'none' })
        return
      }
      if (openId) {
        app.globalData.openId = openId
      }
      wx.navigateTo({
        url: `/pages/room/room?roomId=${roomId}&isOwner=1`
      })
    } catch (e) {
      wx.hideLoading()
      console.error('[createRoom] 调用异常:', e)
      const msg = (e.errMsg || e.message || '创建失败').toString()
      wx.showToast({ title: msg.length > 20 ? '调用失败，请查看控制台' : msg, icon: 'none' })
    }
  },

  onJoinRoom() {
    if (this.data.showAuthModal) return
    // 第一次点击时只展开输入框
    if (!this.data.showJoinInput) {
      this.setData({ showJoinInput: true })
      return
    }
  },

  async onConfirmJoin() {
    if (this.data.showAuthModal) return
    const roomId = this.data.joinRoomId
    if (!roomId) {
      wx.showToast({ title: '请输入房间号', icon: 'none' })
      return
    }
    try {
      wx.showLoading({ title: '加入中...', mask: true })
      const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo') || {}
      const res = await wx.cloud.callFunction({
        name: 'joinRoom',
        data: {
          roomId,
          nickName: userInfo.nickName || '我',
          avatarUrl: userInfo.avatarUrl || ''
        }
      })
      wx.hideLoading()
      const result = res.result || {}
      if (!result.ok && result.code === 'ROOM_NOT_FOUND') {
        wx.showToast({ title: '房间号无效', icon: 'none' })
        return
      }
      if (!result.ok) {
        wx.showToast({ title: '加入失败', icon: 'none' })
        return
      }
      if (result.openId) {
        app.globalData.openId = result.openId
      }
      wx.navigateTo({
        url: `/pages/room/room?roomId=${roomId}&isOwner=0`
      })
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: '加入失败', icon: 'none' })
    }
  }
})

