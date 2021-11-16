import {Parser} from '@lezer/common'
import {LanguageSupport} from '@codemirror/language'
import {build, ResolveResult} from './build'
import {LanguageOption, LanguageRegistry} from './LanguageRegistry'
import {buildParserFileAsync} from './buildParserFileAsync'

// use as interface for sync, use as class for async
export class SrcFile {
  path: string
  content: string
  entry?: {index?: true; parser?: true; support?: true}
  constructor(props: {
    path: string
    content: string | (() => Promise<string>)
    entry?: {index?: true; parser?: true; support?: true}
  }) {
    this.path = props.path
    if (typeof props.content === 'function') {
      this.content = 'Loading...'
      this.loader = props.content
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
}

export class Language {
  name: string
  src: SrcFile[]
  prebuilt?: SrcFile[]
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
    registry?: any
  }) {
    this.src = props.src
    this.prebuilt = props.prebuilt
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
      let index = this.src.find((f) => f?.entry?.index)
      let src = this.prebuilt ? [index, ...this.prebuilt] : this.src
      let out = await buildLanguage(
        src,
        {
          index: (exports: {parser: any; support: any}, errors: any) => {
            this.module.index = exports
            this.errors.index = errors
            this.parser = exports.parser
            this.support = exports.support
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
  emit?: {
    index: (exports: {parser: any; support: any}, errors?: any) => void
    parser: (exports: any, errors?: any) => void
    support: (exports: any, errors?: any) => void
  },
  registry?: LanguageRegistry
) => {
  let parser: string
  let terms: string

  const resolve = (path: string): ResolveResult => {
    if (path === '/parser') {
      return {external: Promise.resolve(parserExports)}
    } else if (path === '/support') {
      return {external: Promise.resolve(supportExports)}
    } else if (path.endsWith('.grammar')) {
      return {
        load: new Promise(async (resolve) => {
          if (parser) return resolve({contents: parser, loader: 'js'})
          let grammar = src.find((f) => f.path.endsWith('.grammar'))?.content
          let out = await buildParserFileAsync(grammar)
          parser = out.parser
          terms = out.terms
          resolve({contents: parser, loader: 'js'})
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
      external: new Promise(async (resolve) => {
        if (registry) {
          let content = await registry.get(path, true, true)
          if (content) return resolve(content)
        }
        if (externals[path]) {
          let content = await externals[path]()
          return resolve(content)
        }
        resolve(null)
      }),
    }
  }

  let parserEntry = src.find((f) => f?.entry?.parser).path
  let parserExports = await build(parserEntry, resolve)
  emit.parser(parserExports)

  let supportEntry = src.find((f) => f?.entry?.support).path
  let supportExports = await build(supportEntry, resolve)
  emit.support(supportExports)

  let indexEntry = src.find((f) => f?.entry?.index).path
  let indexExports = await build(indexEntry, resolve)
  emit.index(indexExports)

  return indexExports as {parser: Parser; support: LanguageSupport}
}
