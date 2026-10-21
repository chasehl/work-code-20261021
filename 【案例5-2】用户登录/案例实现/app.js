App({
  globalData: { token: null },
  onLaunch() {
    this.checkLogin(res => {
      if (!res.is_login) this.login()
    })
  },
  login() {
    wx.login({
      success: res => {
        wx.request({
          url: 'http://127.0.0.1:3000/login',
          method: 'POST',
          data: { code: res.code },
          success: res => {
            this.globalData.token = res.data.token
            wx.setStorage({ key: 'token', data: res.data.token })
          }
        })
      }
    })
  },
  checkLogin(callback) {
    let token = this.globalData.token
    if (!token) {
      token = wx.getStorageSync('token')
      if (token) this.globalData.token = token
      else { callback({ is_login: false }); return }
    }
    wx.request({
      url: 'http://127.0.0.1:3000/checklogin',
      data: { token },
      success: res => callback({ is_login: res.data.is_login })
    })
  }
})
