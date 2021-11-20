let workerBlob: Blob, worker: Worker

let workerLoader = async () => {
  throw new Error('No BuildParserFileAsyncWorkerLoader configured')
  return ''
}
export const setBuildParserFileAsyncWorkerLoader = (
  loader: () => Promise<string>
) => {
  workerLoader = loader
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
        if (!worker) {
          // @ts-ignore
          let workerSrc: string = await workerLoader()
          workerBlob = new Blob([workerSrc], {type: 'application/javascript'})
          worker = new Worker(URL.createObjectURL(workerBlob))
        }
        worker.postMessage(grammar)
        worker.onmessage = (e: {data: string}) => {
          let {parser, terms, warnings, error} = JSON.parse(e.data)
          if (error) return reject(error)
          if (warnings.length) reject(warnings.join(', '))
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
