const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createRequire } = require('node:module')
const root = path.resolve(__dirname, '..')
const folders = fs.readdirSync(root).filter(x => x.startsWith('【案例')).sort()
const project = n => path.join(root, folders[n], '案例实现')
function load(file, wx = {}, extras = {}, mocks = {}) {
  let definition
  const cache = new Map()
  const run = filename => {
    filename = path.resolve(filename)
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }
    cache.set(filename, module)
    const nativeRequire = createRequire(filename)
    const context = {
      console: { log() {}, error() {} }, module, exports: module.exports, __dirname: path.dirname(filename),
      setInterval, clearInterval, setTimeout, clearTimeout,
      wx, Page: value => { definition = value }, App: value => { definition = value },
      require: name => name in mocks ? mocks[name] : name.startsWith('.') ? run(nativeRequire.resolve(name)) : nativeRequire(name),
      ...extras
    }
    vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, { filename })
    return module.exports
  }
  run(file)
  if (definition) {
    definition.data = JSON.parse(JSON.stringify(definition.data || {}))
    definition.setData = updates => {
      for (const [key, value] of Object.entries(updates)) {
        const keys = key.split('.')
        let target = definition.data
        for (const part of keys.slice(0, -1)) target = target[part]
        target[keys.at(-1)] = value
      }
    }
  }
  return definition
}
const event = (name, value) => ({ currentTarget: { dataset: { [name]: value } } })
test('8 个项目的页面、include、图片及事件绑定完整', () => {
  assert.equal(folders.length, 8)
  for (let n = 0; n < folders.length; n++) {
    const dir = project(n)
    const config = JSON.parse(fs.readFileSync(path.join(dir, 'app.json')))
    const app = load(path.join(dir, 'app.js'))
    for (const page of config.pages) {
      const pageFile = path.join(dir, page)
      for (const ext of ['js', 'json', 'wxml', 'wxss']) assert.ok(fs.existsSync(pageFile + '.' + ext), pageFile + '.' + ext)
      const handlers = load(pageFile + '.js', {}, { getApp: () => app })
      const inspect = file => {
        const xml = fs.readFileSync(file, 'utf8')
        for (const [, handler] of xml.matchAll(/\bbind[\w:]*="([\w]+)"/g)) assert.equal(typeof handlers[handler], 'function', handler)
        for (const [, image] of xml.matchAll(/\bsrc="(\/images\/[^"{}]+)"/g)) assert.ok(fs.existsSync(path.join(dir, image)), image)
        for (const [, include] of xml.matchAll(/<include\s+src="([^"]+)"/g)) inspect(path.resolve(path.dirname(file), include))
      }
      inspect(pageFile + '.wxml')
    }
  }
})
test('音乐：标签联动、播放暂停、列表选择、循环下一曲、进度拖动', () => {
  const events = {}; let played = 0; let paused = 0; let sought
  const audio = { duration: 180, currentTime: 65, onError(fn) { events.error = fn }, onEnded(fn) { events.ended = fn }, onTimeUpdate(fn) { events.time = fn }, play() { played++ }, pause() { paused++ }, seek(s) { sought = s } }
  const p = load(path.join(project(0), 'pages/index/index.js'), { getBackgroundAudioManager: () => audio })
  p.onReady()
  assert.equal(p.data.play.title, '祝你生日快乐')
  assert.equal(audio.src, 'http://127.0.0.1:3000/1.mp3')
  p.changeItem(event('item', '2')); assert.equal(p.data.item, 2)
  p.changeTab({ detail: { current: 1 } }); assert.equal(p.data.item, 1)
  p.pause(); assert.equal(p.data.state, 'paused'); assert.equal(paused, 1)
  p.play(); assert.equal(p.data.state, 'running'); assert.equal(played, 1)
  p.change(event('index', 3)); events.ended(); assert.equal(p.data.playIndex, 0)
  events.time(); assert.equal(p.data.play.currentTime, '01:05'); assert.equal(p.data.play.duration, '03:00')
  p.sliderChanging({ detail: { value: 50 } }); assert.equal(p.data.play.currentTime, '01:30')
  audio.currentTime = 90; events.time(); assert.equal(p.data.play.currentTime, '01:30')
  p.sliderChange({ detail: { value: 50 } }); assert.equal(sought, 90)
  p.onUnload()
})
test('录音：未录音、计时、暂停继续、停止后播放及卸载清理', () => {
  const callbacks = {}; let ticks; let clears = 0; const calls = []
  const recorder = {
    onStop(fn) { callbacks.stop = fn }, offStop() { delete callbacks.stop },
    start() { calls.push('start') }, pause() { calls.push('pause') }, resume() { calls.push('resume') },
    stop() { calls.push('stop'); callbacks.stop?.({ tempFilePath: 'wxfile://record.mp3' }) }
  }
  const audio = { stop() {}, play() { calls.push('play') }, destroy() { calls.push('destroy') } }
  const p = load(path.join(project(1), 'pages/index/index.js'), { getRecorderManager: () => recorder, createInnerAudioContext: () => audio }, {
    setInterval(fn) { ticks = fn; return 1 }, clearInterval() { clears++ }
  })
  p.onLoad(); p.play(); assert.equal(p.data.time, '暂无录音')
  p.rec(); ticks(); assert.equal(p.data.time, '00:00:01')
  p.rec(); assert.equal(p.data.state, 2); ticks(); assert.equal(p.data.time, '00:00:01')
  p.rec(); ticks(); assert.equal(p.data.time, '00:00:02')
  p.play(); assert.equal(p.data.state, 0); assert.equal(p.data.time, '播放录音')
  assert.equal(audio.src, 'wxfile://record.mp3')
  assert.deepEqual(calls.slice(0, 5), ['start', 'pause', 'resume', 'stop', 'play'])
  p.rec(); ticks(); assert.equal(p.data.time, '00:00:01')
  p.stop(); p.play(); assert.equal(p.data.time, '播放录音')
  p.onUnload(); assert.ok(clears > 0); assert.equal(calls.at(-1), 'destroy')
})
test('头像：前置提示、选图、上传返回地址、下载并预览', () => {
  let toast; let download; let preview; let loading = false
  const p = load(path.join(project(2), 'pages/index/index.js'), {
    showToast(o) { toast = o.title },
    chooseMedia(o) { o.success({ tempFiles: [{ tempFilePath: 'wxfile://avatar.png' }] }) },
    uploadFile(o) { assert.equal(o.filePath, 'wxfile://avatar.png'); assert.equal(o.name, 'image'); o.success({ data: '{"file":"http://127.0.0.1:3000/upfile/avatar.png"}' }) },
    showLoading() { loading = true }, hideLoading() { loading = false },
    downloadFile(o) { download = o.url; o.success({ tempFilePath: 'wxfile://download.png' }); o.complete() },
    previewImage(o) { preview = o.urls[0] }
  })
  p.upload(); assert.match(toast, /更改头像/)
  p.download(); assert.match(toast, /上传头像/)
  p.changeImg(); assert.equal(p.data.imgUrl, 'wxfile://avatar.png')
  p.upload(); p.download(); assert.equal(download, p.uploadFileUrl); assert.equal(preview, 'wxfile://download.png'); assert.equal(loading, false)
})
test('模拟时钟：绘制表盘和三根指针、每秒刷新、卸载清理', () => {
  let tick; let cleared; const calls = []
  const ctx = new Proxy({}, { get(o, name) { return o[name] || ((...args) => calls.push([name, ...args])) }, set(o, n, v) { o[n] = v; return true } })
  const canvas = { getContext: () => ctx }
  const query = { select() { return this }, fields() { return this }, exec(fn) { fn([{ node: canvas, width: 375, height: 667 }]) } }
  const p = load(path.join(project(3), 'pages/index/index.js'), { createSelectorQuery: () => query }, { setInterval(fn, ms) { assert.equal(ms, 1000); tick = fn; return 5 }, clearInterval(id) { cleared = id } })
  p.onReady(); assert.equal(canvas.width, 375)
  assert.equal(calls.filter(x => x[0] === 'fillText').length, 12)
  assert.equal(calls.filter(x => x[0] === 'lineTo').length, 75)
  tick(); assert.equal(calls.filter(x => x[0] === 'clearRect').length, 2)
  p.onUnload(); assert.equal(cleared, 5)
})
test('罗盘：单项动画、同时与顺序组合、原状重置', () => {
  let steps = []; let pending = []
  const animation = { step(options) { steps.push({ ops: pending, options }); pending = []; return this }, export() { const result = steps; steps = []; return result } }
  for (const name of ['rotate', 'scale', 'translate', 'skew']) animation[name] = (...args) => { pending.push({ name, args }); return animation }
  const p = load(path.join(project(4), 'pages/compass/compass.js'), { createAnimation(o) { assert.equal(o.duration, 1000); return animation } })
  p.onReady()
  for (const method of ['rotate', 'scale', 'translate', 'skew']) { p[method](); assert.equal(p.data.animation.length, 1) }
  p.rotateAndScale(); assert.equal(p.data.animation.length, 1); assert.equal(p.data.animation[0].ops.length, 2)
  p.rotateThenScale(); assert.equal(p.data.animation.length, 2)
  p.all(); assert.equal(p.data.animation.length, 1); assert.equal(p.data.animation[0].ops.length, 4)
  p.allOrder(); assert.equal(p.data.animation.length, 4)
  p.reset(); assert.equal(p.data.animation[0].options.duration, 0)
  assert.deepEqual(p.data.animation[0].ops.map(x => x.args), [[0], [1], [0, 0], [0, 0]])
})
test('登录：无 token 登录、有效缓存复用、过期重登、积分及头像', () => {
  let stored = ''; let logins = 0; let valid = true; let creditToken; const results = []
  const wx = {
    getStorageSync: () => stored,
    setStorage(o) { stored = o.data },
    login(o) { logins++; o.success({ code: 'test-code' }) },
    request(o) {
      if (o.url.endsWith('/login')) o.success({ data: { token: 'test-token' } })
      else if (o.url.endsWith('/checklogin')) o.success({ data: { is_login: valid } })
      else { creditToken = o.data.token; o.success({ data: { credit: 100 } }) }
    }
  }
  const app = load(path.join(project(5), 'app.js'), wx)
  app.onLaunch(); assert.equal(logins, 1); assert.equal(stored, 'test-token')
  app.globalData.token = null; app.onLaunch(); assert.equal(logins, 1); assert.equal(app.globalData.token, stored)
  valid = false; app.onLaunch(); assert.equal(logins, 2)
  const p = load(path.join(project(5), 'pages/index/index.js'), wx, { getApp: () => app, console: { log: o => results.push(o) } })
  p.credit(); assert.equal(creditToken, 'test-token'); assert.equal(results[0].credit, 100)
  p.onChooseAvatar({ detail: { avatarUrl: 'wxfile://chosen.png' } }); assert.equal(p.data.avatarUrl, 'wxfile://chosen.png')
})
test('餐厅：gcj02 定位、附近搜索、中心标记、拖图重查、回定位及优惠券', () => {
  let searched; let moved = false; let destination
  class SDK { search(o) { searched = o; o.success({ data: [{ location: { lat: 30, lng: 120 } }] }) } }
  const map = { moveToLocation() { moved = true }, getCenterLocation(o) { o.success({ longitude: 121, latitude: 31 }) } }
  const p = load(path.join(project(6), 'pages/map/map.js'), {
    getLocation(o) { assert.equal(o.type, 'gcj02'); o.success({ longitude: 120, latitude: 30 }) },
    createMapContext: () => map, navigateTo(o) { destination = o.url }
  }, {}, { '../../libs/qqmap-wx-jssdk.js': SDK, '../../config.js': { key: 'test-only' } })
  p.onLoad(); p.onReady(); assert.equal(searched.keyword, '餐厅')
  assert.equal(p.data.markers.length, 2); assert.equal(p.data.markers[0].width, 30); assert.equal(p.data.markers[1].height, 40)
  p.regionChange({ type: 'begin' }); assert.equal(searched.location.longitude, 120)
  p.regionChange({ type: 'end' }); assert.equal(searched.location.longitude, 121)
  p.controlTap(); assert.equal(moved, true)
  p.bannerTap(); assert.equal(destination, '/pages/coupon/coupon')
})
test('聊天：空消息拦截、发送与接收、左右角色及清空输入、关闭连接', () => {
  let receive; let sent; let toast; let closed = false
  const ws = { onMessage(fn) { receive = fn }, onClose() {}, send(o) { sent = o.data; o.success() }, close() { closed = true } }
  const p = load(path.join(project(7), 'pages/index/index.js'), { connectSocket: () => ws, showToast(o) { toast = o.title } })
  p.onLoad(); p.send(); assert.equal(toast, '消息不能为空')
  p.input({ detail: { value: '我来自微信小程序端' } }); p.send()
  assert.equal(sent, '我来自微信小程序端'); assert.equal(p.data.list[0].role, 'me'); assert.equal(p.message, '')
  receive({ data: '{"content":"自动回复","date":"2026-10-21 12:00:00"}' })
  assert.equal(p.data.list[1].role, 'server'); assert.equal(p.data.list[1].content, '自动回复'); assert.equal(p.data.lastId, 1)
  p.onUnload(); assert.equal(closed, true)
})
