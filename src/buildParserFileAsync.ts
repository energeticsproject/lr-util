// @ts-ignore
import workerSrc from './buildParserFileAsyncWorker'

let workerBlob = new Blob([workerSrc], {type: 'application/javascript'})
let worker = new Worker(URL.createObjectURL(workerBlob))

const cache: {[key: string]: Promise<{parser: string; terms: string}>} = {}
export const buildParserFileAsync = (grammar: string) => {
  if (cache[grammar]) return cache[grammar]
  if (Object.keys(cache).length > 128) {
    for (let k in cache) if (Math.random() > 0.5) delete cache[k]
  }
  let p = new Promise<{parser: string; terms: string}>((resolve, reject) => {
    worker.postMessage(grammar)
    worker.onmessage = (e) => {
      let {parser, terms, error} = JSON.parse(e.data)
      if (error) return reject(error)
      resolve({parser, terms})
    }
  })
  cache[grammar] = p
  return p
}
