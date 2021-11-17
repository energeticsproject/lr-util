// @ts-ignore
import workerSrc from './buildParserFileAsyncWorker'

let workerBlob: Blob, worker: Worker

if (typeof window !== 'undefined') {
  workerBlob = new Blob([workerSrc], {type: 'application/javascript'})
  worker = new Worker(URL.createObjectURL(workerBlob))
}

const cache: {[key: string]: Promise<{parser: string; terms: string}>} = {}
export const buildParserFileAsync = (grammar: string) => {
  if (cache[grammar]) return cache[grammar]
  if (Object.keys(cache).length > 128) {
    for (let k in cache) if (Math.random() > 0.5) delete cache[k]
  }
  let p = new Promise<{parser: string; terms: string}>(
    async (resolve, reject) => {
      if (typeof window !== 'undefined') {
        worker.postMessage(grammar)
        worker.onmessage = (e: {data: string}) => {
          let {parser, terms, error} = JSON.parse(e.data)
          if (error) return reject(error)
          resolve({parser, terms})
        }
      } else {
        const {NodeProp} = await import('@lezer/common')
        const {ExternalTokenizer} = await import('@lezer/lr')
        const {buildParserFile} = await import('@lezer/generator')
        let {parser, terms} = buildParserFile(grammar, {
          externalTokenizer: () => new ExternalTokenizer(() => {}),
          externalSpecializer: () => (value, stack) => 0,
          externalProp: () => new NodeProp({deserialize: (x) => x}),
        })
        return {parser, terms}
      }
    }
  )
  cache[grammar] = p
  return p
}
