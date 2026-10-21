const app = getApp()
Page({
  data: { avatarUrl: '/images/avatar.png' },
  onChooseAvatar(e) { this.setData({ avatarUrl: e.detail.avatarUrl }) },
  credit() {
    wx.request({
      url: 'http://127.0.0.1:3000/credit',
      data: { token: app.globalData.token },
      success: res => console.log(res.data)
    })
  }
})
