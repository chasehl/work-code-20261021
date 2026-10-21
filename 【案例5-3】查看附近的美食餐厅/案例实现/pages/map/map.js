const QQMapWX = require('../../libs/qqmap-wx-jssdk.js')
const { key } = require('../../config.js')
Page({
  data: { scale: 18, longitude: 0, latitude: 0, markers: [] },
  mapCtx: null,
  onLoad() {
    this.qqmapsdk = key ? new QQMapWX({ key }) : null
    wx.getLocation({
      type: 'gcj02',
      success: res => {
        this.setData({ longitude: res.longitude, latitude: res.latitude })
        this.getFood(res.longitude, res.latitude)
      }
    })
  },
  onReady() { this.mapCtx = wx.createMapContext('myMap') },
  bannerTap() { wx.navigateTo({ url: '/pages/coupon/coupon' }) },
  getFood(longitude, latitude) {
    if (!this.qqmapsdk) { console.error('请在 config.js 中填写腾讯地图 Key'); return }
    this.qqmapsdk.search({
      keyword: '餐厅',
      location: { longitude, latitude },
      success: res => {
        const markers = res.data.map((item, id) => ({
          iconPath: '/images/food.png', id,
          latitude: item.location.lat, longitude: item.location.lng,
          width: 30, height: 30
        }))
        markers.push({ iconPath: '/images/center.png', id: res.data.length, latitude, longitude, width: 15, height: 40 })
        this.setData({ markers })
      }
    })
  },
  regionChange(e) {
    if (e.type === 'end' && this.mapCtx) {
      this.mapCtx.getCenterLocation({ success: res => this.getFood(res.longitude, res.latitude) })
    }
  },
  controlTap() { this.mapCtx.moveToLocation() }
})
