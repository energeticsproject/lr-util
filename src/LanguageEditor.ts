import {EditorState, Extension} from '@codemirror/state'
import {EditorView} from '@codemirror/view'
import {LanguageSupport} from '@codemirror/language'
import {Language, SrcFile} from './Language'
import {LanguageRegistry} from './LanguageRegistry'
import {basicSetup} from './_basicSetup'

/**
 * If, before something is loaded, the user starts loading a second thing,
 * then only the second thing should cause visible effects
 **/
const createInflightManager = () => {
  let inflights = {}
  let add = <T = any, U = any, V = any, X = any, Y = any, W = any>(
    namespace: string,
    key: string,
    action0: () => Promise<T>,
    action1?: (value: T) => Promise<U>,
    action2?: (value: U) => Promise<V>,
    action3?: (value: V) => Promise<X>,
    action4?: (value: X) => Promise<Y>,
    action5?: (value: Y) => Promise<W>
  ) => {
    inflights[namespace] = key
    ;(async () => {
      let v = (await action0()) as any
      let aa = [action1, action2, action3, action4, action5].filter((a) => a)

      for (let i in aa) {
        if (inflights[namespace] !== key) return
        if (+i === aa.length - 1) delete inflights[namespace]
        v = await aa[i](v)
      }
    })()
  }
  return {inflights, add}
}

export class CollectionEditor {
  file: SrcFile
  collection: {name: string; src: SrcFile[]}
  support: (path: string) => Promise<LanguageSupport>
  loading: {[key: string]: string}
  inflight = createInflightManager()
  extensions: Extension[] = [basicSetup]
  registry: LanguageRegistry
  editorView: EditorView
  constructor(registry: LanguageRegistry) {
    this.registry = registry
    this.inflight = createInflightManager()
    this.loading = this.inflight.inflights
  }
  mount(parent: HTMLElement) {
    this.editorView = new EditorView({
      state: EditorState.create({
        doc: 'loading...',
        extensions: [...this.extensions],
      }),
      parent,
    })
  }
  destroy() {
    this.editorView.destroy()
    this.listeners = {}
  }
  async openCollection(
    collection: {name: string; src: SrcFile[]},
    support: (path: string) => Promise<LanguageSupport>,
    skipCommit = false
  ) {
    if (!skipCommit) this.commit()
    this.inflight.add(
      `collection`,
      collection.name,
      async () => {
        this.collection = collection
        this.support = support
        let p = this.collection.src[0]?.path
        await this.openFile(p, true)
      },
      async () => this.trigger(`open-collection`)
    )
  }
  async openFile(path: string, skipCommit = false) {
    let {src, name: openCollection} = this.collection
    let f = src.find((f) => f.path === path)
    if (!f) return
    if (!skipCommit) this.commit()

    this.inflight.add(
      `file`,
      `${openCollection}:${path}`,
      async () => {
        if (f.load) await f.load()
      },
      async () => {
        this.file = f
        let extensions = [...this.extensions]
        let support = await this.support?.(path)
        if (support) extensions.push(support)
        return extensions
      },
      async (extensions) => {
        let doc = f.content
        this.editorView.setState(EditorState.create({doc, extensions}))
        this.trigger('open-file')
      }
    )
  }
  commit() {
    if (this.file) {
      let content = this.editorView.state.doc.sliceString(0)
      this.file.content = content
    }
    this.trigger('commit')
  }
  listeners: {[id: string]: {event: string; listener: () => void}} = {}
  trigger(event: string) {
    for (let k in this.listeners) {
      let v = this.listeners[k]
      if (v.event === 'all' || v.event === event) v.listener()
    }
  }
  addListener(
    event: 'all' | 'open-collection' | 'open-file' | 'build' | 'commit',
    listener: () => void
  ) {
    let id = Math.random().toFixed(36).slice(2, 10)
    this.listeners[id] = {event, listener}
    return id
  }
  removeListener(id: string) {
    delete this.listeners[id]
  }
}

export class LanguageEditor extends CollectionEditor {
  language: Language
  async openLanguage(language: string) {
    this.commit()
    this.inflight.add(
      `language`,
      language,
      async () => this.registry.get(language),
      async (l) => {
        this.language = l
        let support = async (path) => {
          let l = await this.registry.getByFilePath(path)
          return l.support
        }
        await this.openCollection(l, support, true)
      },
      async () => this.trigger('open-language')
    )
  }
  async build() {
    this.commit()
    this.inflight.add(
      `build`,
      Math.random().toString(36).slice(2, 10),
      async () => this.language.build(),
      async () => this.trigger('build')
    )
  }
  addListener: (
    event:
      | 'all'
      | 'open-language'
      | 'build'
      | 'open-collection'
      | 'open-file'
      | 'build'
      | 'commit',
    listener: () => void
  ) => string
}

export class SampleEditor extends CollectionEditor {
  language: Language
  async openSample(sample: SrcFile[], language: string) {
    this.commit()
    let name = `${language}.${Math.random().toString(36).slice(2, 10)}`
    this.inflight.add(
      `sample`,
      name,
      async () => this.registry.get(language),
      async (l) => {
        this.language = l
        let support = async () => l.support
        await this.openCollection({name, src: sample}, support, true)
      },
      async () => this.trigger('open-sample')
    )
  }
  addListener: (
    event:
      | 'all'
      | 'open-sample'
      | 'open-collection'
      | 'open-file'
      | 'build'
      | 'commit',
    listener: () => void
  ) => string
}
