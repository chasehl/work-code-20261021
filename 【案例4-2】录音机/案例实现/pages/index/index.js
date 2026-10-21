const timer = require('../../utils/timer.js')
Page({
  data: { time: '00:00:00', state: 0 },
  onLoad() {
    this.tempFilePath = null
    this.onStopCallback = null
    this.recorder = wx.getRecorderManager()
    this.audioCtx = wx.createInnerAudioContext()
    this.handleStop = res => {
      this.tempFilePath = res.tempFilePath
      timer.reset()
      this.setData({ state: 0 })
      if (this.onStopCallback) {
        const callback = this.onStopCallback
        this.onStopCallback = null
        callback(res.tempFilePath)
      }
    }
    this.recorder.onStop(this.handleStop)
    timer.onTimeUpdate(time => this.setData({ time }))
  },
  rec() {
    switch (this.data.state) {
      case 0:
        this.audioCtx.stop()
        this.recorder.start()
        timer.reset()
        timer.start()
        this.setData({ time: '00:00:00', state: 1 })
        break
      case 1:
        this.recorder.pause()
        timer.pause()
        this.setData({ state: 2 })
        break
      case 2:
        this.recorder.resume()
        timer.start()
        this.setData({ state: 1 })
        break
    }
  },
  stop() {
    this.recorder.stop()
    timer.reset()
    this.setData({ state: 0 })
  },
  play() {
    if (this.data.state > 0) {
      this.onStopCallback = path => this.playFile(path)
      this.stop()
    } else if (this.tempFilePath) {
      this.playFile(this.tempFilePath)
    } else {
      this.setData({ time: '暂无录音' })
    }
  },
  playFile(path) {
    this.audioCtx.src = path
    this.audioCtx.play()
    this.setData({ time: '播放录音' })
  },
  onUnload() {
    this.onStopCallback = null
    this.recorder.offStop(this.handleStop)
    if (this.data.state > 0) this.recorder.stop()
    timer.reset()
    timer.onTimeUpdate(null)
    this.audioCtx.destroy()
  }
})
