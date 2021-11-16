import {Parser} from '@lezer/common'
import {LanguageSupport} from '@codemirror/language'
import {Language, SrcFile} from './Language'

export interface LanguageOption {
  label: string
  module: {
    index: string
    parser?: string
    support?: string
  }
  files: () => Promise<{
    src: SrcFile[]
    prebuilt?: SrcFile[]
  }>
  sample: () => Promise<SrcFile[]>
}

export interface FileExtension {
  extension: string[]
  index: (registry: LanguageRegistry) => Promise<{
    parser: Parser
    support: LanguageSupport
  }>
}

export class LanguageRegistry {
  languageOptions: LanguageOption[] = []
  modules: {
    [module: string]: {
      languageOption: LanguageOption
      inflight?: Promise<{src: SrcFile[]; prebuilt?: SrcFile[]}>
      language: Language
    }
  } = {}
  extensions: FileExtension[]
  constructor(languageOptions: LanguageOption[], extensions?: FileExtension[]) {
    for (let lo of languageOptions) this.push(lo)
    this.extensions = extensions ?? []
  }
  push(languageOption: LanguageOption) {
    this.languageOptions.push(languageOption)
    this.index(languageOption)
  }
  unshift(languageOption: LanguageOption) {
    this.languageOptions.unshift(languageOption)
    this.index(languageOption)
  }
  index(languageOption: LanguageOption) {
    let {index, parser, support} = languageOption.module
    let m = `Cannot add module.$type ("$name") to registry, it is already defined`
    let e = (t, n) => new Error(m.replace('$type', t).replace('$name', n))
    if (this.modules[index]) throw e('index', index)
    if (this.modules[parser] && parser) throw e('parser', parser)
    if (this.modules[support] && support) throw e('support', support)
    let value = {languageOption, language: null}
    this.modules[index] = value
    if (parser) this.modules[parser] = value
    if (support) this.modules[support] = value
  }
  async get(module: string, initialBuild?: boolean): Promise<Language>
  // prettier-ignore
  async get(module: string, initialBuild: boolean, includeModules: true): Promise<any>
  async get(module: string, initialBuild = true, includeModules?: boolean) {
    let r = this.modules[module]
    if (!r) return null
    if (!includeModules && module !== r.languageOption.module.index) return null

    if (!r.language) {
      r.inflight = r.inflight ?? r.languageOption.files()
      let {src, prebuilt} = await r.inflight
      delete r.inflight
      r.language = new Language({
        src,
        prebuilt,
        registry: this,
        option: r.languageOption,
      })
      if (initialBuild) await r.language.build()
    }

    if (module === r.languageOption.module.index) {
      return r.language
    } else if (module === r.languageOption.module.parser) {
      return r.language.module.parser
    } else if (module === r.languageOption.module.support) {
      return r.language.module.support
    }

    return null
  }
  getByFilePath(path: string) {
    let matches: [string, FileExtension['index']][] = []
    for (let e of this.extensions)
      for (let o of e.extension)
        if (path.endsWith(o)) matches.push([o, e.index])

    return matches.sort(([a], [b]) => b.length - a.length)[0]?.[1]?.(this)
  }
}
