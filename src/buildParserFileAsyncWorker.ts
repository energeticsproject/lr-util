import {NodeProp} from '@lezer/common'
import {ExternalTokenizer} from '@lezer/lr'
import {buildParserFile} from '@lezer/generator'

onmessage = (e) => {
  let grammar = e.data
  let cw = console.warn
  try {
    let warnings = []
    console.warn = (warning) => warnings.push(warning)
    // use dummy externals here, and real externals later
    let {parser, terms} = buildParserFile(grammar, {
      externalTokenizer: () => new ExternalTokenizer(() => {}),
      externalSpecializer: () => (value, stack) => 0,
      externalProp: () => new NodeProp({deserialize: (x) => x}),
    })
    console.warn = cw
    let result = JSON.stringify({parser, terms, warnings})
    postMessage(result, undefined as any)
  } catch (e) {
    console.error(e)
    console.warn = cw
    let result = JSON.stringify({error: e.message})
    postMessage(result, undefined as any)
  }
}
