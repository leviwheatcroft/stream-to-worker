import streamToWorker from '../lib'
// import {
//   back as nockBack
// } from 'nock'
import vow from 'vow'
import assert from 'assert'
import debug from 'debug'
const dbg = debug('stream-to-worker')

// import debug from 'debug'
// const dbg = debug('metalsmith-google-drive')

// nockBack.setMode('record')
// nockBack.fixtures = 'test/fixtures/scrape'

describe('metalsmith-classeur test', () => {
  beforeEach(() => {
    // create spy
    // sinon.spy(cloudinary.api, 'resources')
  })
  afterEach(() => {
    // cloudinary.api.resources.restore()
  })
  // it('should be able to scrape a folder', (done) => {
  //   nockBack('scrape', (writeRequests) => {
  //     Metalsmith('test/fixtures/scrape')
  //     .use(classeur(Object.assign(
  //       {
  //         destPath: 'articles'
  //       },
  //       config.get('metalsmith-classeur')
  //     )))
  //     .use((files) => {
  //       assert.ok(files['articles/test-file'])
  //     })
  //     .build((err, files) => {
  //       if (err) return done(err)
  //       writeRequests()
  //       done()
  //     })
  //   })
  // }).timeout(0)
  it('should stream to workers', (done) => {
    streamToWorker({
      fetch: (retrieved) => {
        if (retrieved > 50) return [null]
        return vow.resolve(
          [...new Array(10)].map(() => Math.round(Math.random()))
        )
      },
      worker: (item) => {
        return vow.timeout(item, 50)
      }
    })
    .then(() => {
      assert.ok(true)
      done()
    })
    .catch(dbg)
  })
})
