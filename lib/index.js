import vow from 'vow'
import debug from 'debug'
import {
  Readable
} from 'stream'

const dbg = debug('stream-to-worker')

export default function streamToWorker (options) {
  if (!options.fetch && !options.stream) {
    throw new Error('fetch fn or stream required')
  }
  if (options.fetch && typeof options.fetch !== 'function') {
    throw new Error('fetch must be fn')
  }
  if (!options.worker) throw new Error('worker fn required')
  if (typeof options.worker !== 'function') throw new Error('worker must be fn')
  if (!options.concurrency) options.concurrency = 2
  if (!options.highWaterMark) options.highWaterMark = 2
  let stream = options.stream
  if (!stream) stream = new Stream(options.highWaterMark, options.fetch)
  const spool = new Spool(options.worker, stream, options.concurrency)
  stream.on('readable', spool.tick.bind(spool))
  return spool.defer.promise()
  .then(() => {
    if (options.callback) process.nextTick(options.callback)
  })
  .catch((err) => {
    if (options.callback) process.nextTick(() => options.callback(err))
  })
}

class Stream extends Readable {
  constructor (highWaterMark, fetch) {
    super({
      objectMode: true,
      highWaterMark
    })
    this.retrieved = 0
    this.fetch = fetch
  }
  _read () {
    if (this.requestPending) return
    this.requestPending = true
    let defer = vow.defer()
    let fetchValue = this.fetch(this.retrieved, deferCallback(defer))
    if (fetchValue && fetchValue.then) {
      fetchValue
      .then((res) => defer.resolve(res))
      .catch((err) => defer.reject(err))
    }
    if (fetchValue) defer.resolve(fetchValue)
    defer.promise()
    .then((res) => {
      this.retrieved += res.length
      this.requestPending = false
      res.forEach((item) => this.push(item))
    })
    .catch((err) => { throw err })
  }
}

class Spool {
  constructor (worker, stream, concurrency) {
    this.concurrency = concurrency
    this.worker = worker
    this.stream = stream
    this.defer = vow.defer()
    this.workers = 0
    this.count = 0
  }
  tick () {
    let state = this.stream._readableState
    if (this.workers === this.concurrency) return
    if (state.ended && this.workers === 0) return this.defer.resolve()
    if (!state.length) return
    this.workers++
    let read = this.stream.read()
    this.worker(read, this.retry.bind(this))
    .then(() => {
      this.count++
      this.workers--
      // dbg(`${this.workers}/${this.count}`)
      process.nextTick(this.tick.bind(this))
    })
    if (this.workers < this.concurrency) process.nextTick(this.tick.bind(this))
  }
  retry (item) {
    this.stream.unshift(item)
    this.count--
  }
}

function deferCallback (deferred) {
  return (err, value) => {
    if (err) return deferred.reject(err)
    deferred.resolve(value)
  }
}
