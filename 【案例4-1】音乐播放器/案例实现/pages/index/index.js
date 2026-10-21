function formatTime(time) {
  const minute = Math.floor(time / 60) % 60
  const second = Math.floor(time) % 60
  return (minute < 10 ? '0' + minute : minute) + ':' + (second < 10 ? '0' + second : second)
}
Page({
  data: {
    item: 0,
    playlist: [
      { id: 1, title: '祝你生日快乐', singer: '小丽', src: 'http://127.0.0.1:3000/1.mp3', coverImgUrl: '/images/cover.jpg' },
      { id: 2, title: '劳动最光荣', singer: '小明', src: 'http://127.0.0.1:3000/2.mp3', coverImgUrl: '/images/cover.jpg' },
      { id: 3, title: '龙的传人', singer: '小华', src: 'http://127.0.0.1:3000/3.mp3', coverImgUrl: '/images/cover.jpg' },
      { id: 4, title: '小星星', singer: '小红', src: 'http://127.0.0.1:3000/4.mp3', coverImgUrl: '/images/cover.jpg' }
    ],
    state: 'running',
    playIndex: 0,
    play: { currentTime: '00:00', duration: '00:00', percent: 0, title: '', singer: '', coverImgUrl: '/images/cover.jpg' }
  },
  audioBam: null,
  sliderChangeLock: false,
  onReady() {
    this.audioBam = wx.getBackgroundAudioManager()
    this.audioBam.onError(() => console.log('播放失败：' + this.audioBam.src))
    this.audioBam.onEnded(() => this.next())
    let updateTime = -1
    this.audioBam.onTimeUpdate(() => {
      const currentTime = Math.floor(this.audioBam.currentTime || 0)
      const duration = this.audioBam.duration || 0
      if (!this.sliderChangeLock && currentTime !== updateTime) {
        updateTime = currentTime
        this.setData({
          'play.duration': formatTime(duration),
          'play.currentTime': formatTime(currentTime),
          'play.percent': duration ? currentTime / duration * 100 : 0
        })
      }
    })
    this.setMusic(0)
  },
  changeItem(e) { this.setData({ item: Number(e.currentTarget.dataset.item) }) },
  changeTab(e) { this.setData({ item: e.detail.current }) },
  setMusic(index) {
    const music = this.data.playlist[index]
    this.audioBam.title = music.title
    this.audioBam.src = music.src
    this.setData({
      playIndex: index,
      'play.title': music.title,
      'play.singer': music.singer,
      'play.coverImgUrl': music.coverImgUrl,
      'play.currentTime': '00:00',
      'play.duration': '00:00',
      'play.percent': 0,
      state: 'running'
    })
  },
  play() { this.audioBam.play(); this.setData({ state: 'running' }) },
  pause() { this.audioBam.pause(); this.setData({ state: 'paused' }) },
  next() { this.setMusic((this.data.playIndex + 1) % this.data.playlist.length) },
  change(e) { this.setMusic(Number(e.currentTarget.dataset.index)) },
  sliderChanging(e) {
    this.sliderChangeLock = true
    this.setData({ 'play.currentTime': formatTime(e.detail.value * (this.audioBam.duration || 0) / 100) })
  },
  sliderChange(e) {
    this.audioBam.seek(e.detail.value * (this.audioBam.duration || 0) / 100)
    clearTimeout(this.seekTimer)
    this.seekTimer = setTimeout(() => { this.sliderChangeLock = false }, 1000)
  },
  onUnload() { clearTimeout(this.seekTimer) }
})
