Page({
  data: { animation: {} },
  onReady() { this.animation = wx.createAnimation({ duration: 1000, timingFunction: 'ease' }) },
  rotate() {
    this.animation.rotate(Math.random() * 720 - 360).step()
    this.setData({ animation: this.animation.export() })
  },
  scale() {
    this.animation.scale(Math.random() * 2).step()
    this.setData({ animation: this.animation.export() })
  },
  translate() {
    this.animation.translate(Math.random() * 100 - 50, Math.random() * 100 - 50).step()
    this.setData({ animation: this.animation.export() })
  },
  skew() {
    this.animation.skew(Math.random() * 90, Math.random() * 90).step()
    this.setData({ animation: this.animation.export() })
  },
  rotateAndScale() {
    this.animation.rotate(Math.random() * 720 - 360)
    this.animation.scale(Math.random() * 2).step()
    this.setData({ animation: this.animation.export() })
  },
  rotateThenScale() {
    this.animation.rotate(Math.random() * 720 - 360).step()
    this.animation.scale(Math.random() * 2).step()
    this.setData({ animation: this.animation.export() })
  },
  all() {
    this.animation.rotate(Math.random() * 720 - 360)
    this.animation.scale(Math.random() * 2)
    this.animation.translate(Math.random() * 100 - 50, Math.random() * 100 - 50)
    this.animation.skew(Math.random() * 90, Math.random() * 90).step()
    this.setData({ animation: this.animation.export() })
  },
  allOrder() {
    this.animation.rotate(Math.random() * 720 - 360).step()
    this.animation.scale(Math.random() * 2).step()
    this.animation.translate(Math.random() * 100 - 50, Math.random() * 100 - 50).step()
    this.animation.skew(Math.random() * 90, Math.random() * 90).step()
    this.setData({ animation: this.animation.export() })
  },
  reset() {
    this.animation.rotate(0).scale(1).translate(0, 0).skew(0, 0).step({ duration: 0 })
    this.setData({ animation: this.animation.export() })
  }
})
