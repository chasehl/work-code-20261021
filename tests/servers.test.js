const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { spawn } = require('node:child_process')
const { once } = require('node:events')
const { createRequire } = require('node:module')
const root = path.resolve(__dirname, '..')
const folders = fs.readdirSync(root).filter(x => x.startsWith('【案例')).sort()
const serverDir = n => path.join(root, folders[n], '服务器端')
async function start(n, t) {
  const child = spawn(process.execPath, ['index.js'], { cwd: serverDir(n), stdio: ['pipe', 'pipe', 'pipe'] })
  t.after(async () => { if (child.exitCode === null) { child.kill(); await once(child, 'exit') } })
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('服务启动超时')), 5000)
    child.once('error', e => { clearTimeout(timeout); reject(e) })
    child.once('exit', code => { clearTimeout(timeout); reject(new Error('服务提前退出：' + code)) })
    child.stderr.on('data', output => { if (String(output).includes('EADDRINUSE')) { clearTimeout(timeout); reject(new Error('3000 端口已被占用')) } })
    child.stdout.once('data', () => { clearTimeout(timeout); resolve() })
  })
  return child
}
test('音乐服务：4 首 MP3 内容及 Range 请求', async t => {
  await start(0, t)
  for (let n = 1; n <= 4; n++) {
    const res = await fetch(`http://127.0.0.1:3000/${n}.mp3`)
    assert.equal(res.status, 200)
    assert.match(res.headers.get('content-type'), /audio/)
    const bytes = Buffer.from(await res.arrayBuffer())
    assert.deepEqual(bytes, fs.readFileSync(path.join(serverDir(0), 'htdocs', `${n}.mp3`)))
  }
  const part = await fetch('http://127.0.0.1:3000/1.mp3', { headers: { Range: 'bytes=0-31' } })
  assert.equal(part.status, 206); assert.equal((await part.arrayBuffer()).byteLength, 32)
})
test('头像服务：真实 multipart 上传、下载字节一致', async t => {
  await start(2, t)
  const bytes = fs.readFileSync(path.join(root, folders[2], '案例实现/images/guest.png'))
  const form = new FormData()
  form.append('image', new Blob([bytes], { type: 'image/png' }), 'avatar.png')
  const res = await fetch('http://127.0.0.1:3000/upload', { method: 'POST', body: form })
  assert.equal(res.status, 200)
  const uploaded = await res.json()
  assert.equal(uploaded.success, true)
  const file = path.join(serverDir(2), 'htdocs/upfile', path.basename(uploaded.file))
  t.after(() => fs.rmSync(file, { force: true }))
  const download = await fetch(uploaded.file)
  assert.equal(download.status, 200)
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), bytes)
})
test('登录服务：未登录状态与积分拒绝', async t => {
  await start(5, t)
  const status = await (await fetch('http://127.0.0.1:3000/checklogin?token=missing')).json()
  assert.equal(status.is_login, false)
  const credit = await (await fetch('http://127.0.0.1:3000/credit?token=missing')).json()
  assert.equal(credit.err, '用户不存在，或未登录。')
})
test('登录服务：模拟微信 code 换取会话后，真实 HTTP token/100 积分流程', async t => {
  const file = path.join(serverDir(5), 'index.js')
  const nativeRequire = createRequire(file)
  const express = nativeRequire('express')
  let server
  const fakeExpress = () => {
    const app = express()
    app.listen = () => { server = require('node:http').createServer(app).listen(0, '127.0.0.1'); return server }
    return app
  }
  const upstream = (url, callback) => {
    assert.match(url, /js_code=test-code/)
    callback(null, { statusCode: 200 }, JSON.stringify({ openid: 'test-openid', session_key: 'test-session' }))
  }
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
    require: name => name === 'express' ? fakeExpress : name === 'request' ? upstream : nativeRequire(name),
    console: { log() {} }
  }, { filename: file })
  t.after(() => new Promise(resolve => server.close(resolve)))
  await once(server, 'listening')
  const base = `http://127.0.0.1:${server.address().port}`
  const login = await (await fetch(base + '/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"code":"test-code"}' })).json()
  assert.match(login.token, /^token_/)
  assert.equal((await (await fetch(base + '/checklogin?token=' + login.token)).json()).is_login, true)
  assert.equal((await (await fetch(base + '/credit?token=' + login.token)).json()).credit, 100)
})
test('聊天服务：真实 WebSocket 自动回复与控制台主动发送', async t => {
  const child = await start(7, t)
  const socket = new WebSocket('ws://127.0.0.1:3000')
  t.after(() => socket.close())
  await once(socket, 'open')
  const reply = once(socket, 'message')
  socket.send('我来自微信小程序端')
  const data = JSON.parse((await reply)[0].data)
  assert.equal(data.content, '自动回复')
  assert.match(data.date, /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/)
  const push = once(socket, 'message')
  child.stdin.write('我来自服务器端\n')
  assert.equal(JSON.parse((await push)[0].data).content, '我来自服务器端')
  const closed = once(socket, 'close'); socket.close(); await closed
})
