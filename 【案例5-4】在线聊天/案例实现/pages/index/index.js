Page({
  data: { content: '', list: [], lastId: '' },
  message: '',
  ws: null,
  onLoad() {
    this.ws = wx.connectSocket({ url: 'ws://127.0.0.1:3000' })
    this.ws.onMessage(msg => {
      const data = JSON.parse(msg.data)
      const list = this.data.list
      const lastId = list.length
      list.push({ id: lastId, content: data.content, role: 'server' })
      this.setData({ list, lastId })
    })
    this.ws.onClose(res => console.log(res))
  },
  input(e) { this.message = e.detail.value },
  send() {
    if (!this.message) {
      wx.showToast({ title: '消息不能为空', icon: 'none', duration: 2000 })
      return
    }
    const content = this.message
    this.ws.send({
      data: content,
      success: () => {
        const list = this.data.list
        const lastId = list.length
        list.push({ id: lastId, content, role: 'me' })
        this.setData({ list, lastId, content: '' })
        this.message = ''
      }
    })
  },
  onUnload() { if (this.ws) this.ws.close() }
})
