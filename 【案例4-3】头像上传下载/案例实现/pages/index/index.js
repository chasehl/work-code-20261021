Page({
  data: { imgUrl: '/images/guest.png', tempFilePath: null },
  uploadFileUrl: null,
  changeImg() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: res => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this.setData({ tempFilePath, imgUrl: tempFilePath })
      }
    })
  },
  upload() {
    if (!this.data.tempFilePath) {
      wx.showToast({ title: '请您更改头像之后再进行上传操作', icon: 'none', duration: 2000 })
      return
    }
    wx.uploadFile({
      filePath: this.data.tempFilePath,
      name: 'image',
      url: 'http://localhost:3000/upload',
      success: res => {
        this.uploadFileUrl = JSON.parse(res.data).file
        console.log('上传成功')
      }
    })
  },
  download() {
    if (!this.uploadFileUrl) {
      wx.showToast({ title: '请您上传头像之后再进行下载操作', icon: 'none', duration: 2000 })
      return
    }
    wx.showLoading({ title: '图片下载中，请稍后……' })
    wx.downloadFile({
      url: this.uploadFileUrl,
      success: res => {
        wx.previewImage({ urls: [res.tempFilePath] })
      },
      complete: () => wx.hideLoading()
    })
  }
})
