App({
  globalData: {
    userInfo: null,
    openId: ''
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用基础库 2.2.3 或以上以使用云能力')
      return
    }
    wx.cloud.init({
      env: 'cloud1-2gytrceb3105a929',
      traceUser: true
    })
  }
})

