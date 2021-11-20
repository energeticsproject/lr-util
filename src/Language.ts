import {Parser} from '@lezer/common'
import {LanguageSupport} from '@codemirror/language'
import {build, ResolveResult} from './build'
import {LanguageOption, LanguageRegistry} from './LanguageRegistry'
import {buildParserFileAsync} from './buildParserFileAsync'

/** Use as interface for sync, use as class for async */
export class SrcFile {
  path: string
  url?: string
  content: string
  entry?: {index?: true; parser?: true; support?: true}
  constructor(props: {
    path: string
    url?: string
    content?: string | (() => Promise<string>)
    entry?: {index?: true; parser?: true; support?: true}
  }) {
    this.path = props.path
    if (typeof props.content === 'function') {
      this.loader = props.content
      this.content = 'loading...'
    } else if (props.url) {
      this.url = props.url
      this.content = 'loading...'
      this.loader = async () => {
        let res = await fetch(props.url)
        let content = await res.text()
        return res.status === 200 && content
      }
    } else {
      this.content = props.content
    }
    this.entry = props.entry
  }
  loader?: () => Promise<string>
  load?: () => Promise<void> = async () => {
    if (!this.loader) return
    let p = this.loader()
    this.loader = () => p
    this.content = await p
    delete this.loader
  }
  toPlainObject?: () => SrcFile = () => {
    let {path, url, content, entry} = this
    let o: any = {path, content}
    if (url) o.url = url
    if (entry) o.entry = entry
    return o
  }
}

export class Language {
  name: string
  src: SrcFile[]
  prebuilt?: SrcFile[]
  sample?: SrcFile[]
  registry: LanguageRegistry
  option: LanguageOption
  parser: Parser
  support: LanguageSupport
  module: {
    index?: {parser?: Parser; support?: LanguageSupport}
    parser?: any
    support?: any
  } = {index: {}}
  errors: {
    index?: any
    parser?: any
    support?: any
  } = {}
  inflight: Promise<{parser: Parser; support: LanguageSupport}>
  constructor(props: {
    option: LanguageOption
    src: SrcFile[]
    prebuilt?: SrcFile[]
    sample?: SrcFile[]
    registry?: any
  }) {
    this.src = props.src
    this.prebuilt = props.prebuilt
    this.sample = props.sample
    this.registry = props.registry
    this.option = props.option
    this.name = props.option.module.index
  }
  change(path: string, content: string) {
    let f = this.src.find((f) => f.path === path)
    if (!f || f.content === content) return
    f.content = content
    delete this.inflight
    delete this.prebuilt
  }
  async build() {
    if (this.inflight) return this.inflight
    this.inflight = new Promise(async (resolve) => {
      let src = this.prebuilt ?? this.src
      let out = await buildLanguage(
        src,
        !!this.prebuilt,
        {
          index: (exports: {parser: any; support: any}, errors: any) => {
            this.module.index = exports
            this.errors.index = errors
            this.parser = exports?.parser
            this.support = exports?.support
          },
          parser: (exports: any, errors: any) => {
            this.module.parser = exports
            this.errors.parser = errors
          },
          support: (exports: any, errors: any) => {
            this.module.support = exports
            this.errors.support = errors
          },
        },
        this.registry
      )
      resolve(out)
    })
    let out = await this.inflight
    delete this.inflight
    return out
  }
}

const externals = {
  '@lezer/lr': () => import('@lezer/lr'),
  '@lezer/common': () => import('@lezer/common'),
  '@lezer/generator': () => import('@lezer/generator'),
  '@codemirror/autocomplete': () => import('@codemirror/autocomplete'),
  '@codemirror/highlight': () => import('@codemirror/highlight'),
  '@codemirror/language': () => import('@codemirror/language'),
  '@codemirror/lint': () => import('@codemirror/lint'),
  '@codemirror/state': () => import('@codemirror/state'),
  '@codemirror/view': () => import('@codemirror/view'),
}

export const buildLanguage = async (
  src: SrcFile[],
  prebuilt: boolean,
  emit?: {
    index: (exports: {parser: any; support: any}, errors?: any) => void
    parser: (exports: any, errors?: any) => void
    support: (exports: any, errors?: any) => void
  },
  registry?: LanguageRegistry
) => {
  let parser: string
  let terms: string
  let parserExports: any
  let supportExports: any
  let indexExports: {parser: Parser; support: LanguageSupport}

  const resolve = (path: string): ResolveResult => {
    if (path === '/parser') {
      return {external: Promise.resolve(parserExports)}
    } else if (path === '/support') {
      return {external: Promise.resolve(supportExports)}
    } else if (path.endsWith('.grammar')) {
      return {
        load: new Promise(async (resolve, reject) => {
          try {
            if (parser) return resolve({contents: parser, loader: 'js'})
            let grammar = src.find((f) => f.path.endsWith('.grammar'))?.content
            let out = await buildParserFileAsync(grammar)
            parser = out.parser
            terms = out.terms
            resolve({contents: parser, loader: 'js'})
          } catch (e) {
            reject(e)
          }
        }),
      }
    } else if (/\.terms(\.js)?$/.test(path)) {
      return {load: Promise.resolve({contents: terms, loader: 'js'})}
    }

    if (path.startsWith('/')) {
      let f =
        src.find((f) => f.path === path) ??
        src.find((f) => f.path === path + '.ts') ??
        src.find((f) => f.path === path + '.js')

      return {
        load: Promise.resolve({
          contents: f.content,
          loader: f.path.endsWith('.ts') ? 'ts' : 'js',
        }),
      }
    }

    return {
      external: new Promise(async (resolve, reject) => {
        try {
          if (registry) {
            let content = await registry.get(path, true, true)
            if (content) return resolve(content)
          }
          if (externals[path]) {
            let content = await externals[path]()
            return resolve(content)
          }
          resolve(null)
        } catch (e) {
          reject(e)
        }
      }),
    }
  }

  const exec = async (path: string) => {
    if (!prebuilt) return build(path, resolve)

    // the first time build() is called it initialises esbuild-wasm, which
    // can take a few seconds - an unnecessary step for prebuilt files -
    // these 15-ish lines of JavaScript suffice
    let r = resolve(path)
    if ('external' in r) return null
    let src = (await r.load).contents.toString()
    if (!/exports\s*=/.test(src)) src = 'var exports = {};\n\n' + src
    src += '\nreturn exports;\n'
    let externals = {}
    await Promise.all(
      src.match(/require\(['"][^'"]+['"]\)/g).map(async (r) => {
        let path = r.match(/require\(['"]([^'"]+)['"]\)/)?.[1]
        let ex = resolve(path)
        if ('external' in ex) externals[path] = await ex.external
      })
    )
    return new Function('require', src)((path: string) => externals[path])
  }

  let parserEntry = src.find((f) => f?.entry?.parser).path
  try {
    parserExports = await exec(parserEntry)
    emit.parser(parserExports, null)
  } catch (error) {
    emit.parser(null, error)
  }

  let supportEntry = src.find((f) => f?.entry?.support).path
  try {
    supportExports = await exec(supportEntry)
    emit.support(supportExports, null)
  } catch (error) {
    emit.support(null, error)
  }

  let indexEntry = src.find((f) => f?.entry?.index).path
  try {
    indexExports = await exec(indexEntry)
    emit.index(indexExports, null)
  } catch (error) {
    emit.index(null, error)
  }

  return indexExports
}
