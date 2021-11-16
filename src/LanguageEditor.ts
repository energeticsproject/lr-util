import {basicSetup, EditorView, EditorState} from '@codemirror/basic-setup'
import {LanguageSupport} from '@codemirror/language'
import {Language, SrcFile} from './Language'
import {LanguageRegistry} from './LanguageRegistry'

export class CollectionEditor {
  editorView: EditorView
  registry: LanguageRegistry
  loading: {
    file?: string
  } = {}
  file: SrcFile
  collection: {name: string; src: SrcFile[]}
  constructor(registry: LanguageRegistry) {
    this.registry = registry
  }
  support: {[extension: string]: () => Promise<LanguageSupport>} = {
    js: async () => {
      let s = await this.registry.get('javascript')
      return s.module.support.javascript()
    },
    ts: async () => {
      let s = await this.registry.get('javascript')
      return s.module.support.javascript({typescript: true})
    },
    json: async () => (await this.registry.get('json')).support,
    grammar: async () => (await this.registry.get('lezer')).support,
  }
  mount(parent: HTMLElement) {
    this.editorView = new EditorView({
      state: EditorState.create({doc: 'loading...', extensions: [basicSetup]}),
      parent,
    })
  }
  destroy() {
    this.editorView.destroy()
    this.listeners = {}
  }
  async openCollection(collection: {name: string; src: SrcFile[]}) {
    console.log(collection)
    this.commit()
    this.collection = collection
    await this.openFile(this.collection.src[0].path, true)
    this.trigger('open-collection')
  }
  async openFile(path: string, skipCommit = false) {
    let {src, name: openCollection} = this.collection
    let f = src.find((f) => f.path === path)
    if (!f) return

    this.loading.file = path
    if (!skipCommit) this.commit()
    if (f.load) await f.load()
    this.file = f

    let extensions = [basicSetup]
    let support = await this.support[path.match(/\.([a-z]+)$/)?.[1]]?.()
    if (support) extensions.push(support)

    if (this.collection.name !== openCollection || this.loading.file !== path) {
      return
    }
    delete this.loading.file

    let doc = f.content
    this.editorView.setState(EditorState.create({doc, extensions}))
    this.trigger('open-file')
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

// class LanguageEditor extends CollectionEditor {
//   registry: LanguageRegistry
//   language: Language

//   async openLanguage(language: string) {
//     this.loading.language = language
//     this.commit()
//     let l = await this.registry.get(language)
//     if (this.loading.language !== language) return
//     this.language = l
//     await this.openFile(this.language.src[0].path, true)
//     if (this.loading.language !== language) return
//     delete this.loading.language
//     this.trigger('open-language')
//   }
//   async build() {
//     let key = Math.random().toString(36).slice(2, 10)
//     this.loading.build = key
//     this.commit()
//     await this.language.build()
//     if (this.loading.build === key) {
//       delete this.loading.build
//     }
//     this.trigger('build')
//   }
// }

export class LanguageEditor {
  registry: LanguageRegistry
  editorView: EditorView
  language: Language
  loading: {
    language?: string
    file?: string
    build?: string
  } = {}
  file: SrcFile
  constructor(registry: LanguageRegistry) {
    this.registry = registry
  }
  mount(parent: HTMLElement) {
    this.editorView = new EditorView({
      state: EditorState.create({doc: 'loading...', extensions: [basicSetup]}),
      parent,
    })
  }
  destroy() {
    this.editorView.destroy()
    this.listeners = {}
  }
  async openLanguage(language: string) {
    this.loading.language = language
    this.commit()
    let l = await this.registry.get(language)
    if (this.loading.language !== language) return
    this.language = l
    await this.openFile(this.language.src[0].path, true)
    if (this.loading.language !== language) return
    delete this.loading.language
    this.trigger('open-language')
  }
  async openFile(path: string, skipCommit = false) {
    let f = this.language.src.find((f) => f.path === path)
    if (!f) return

    let openLanguage = this.language.name
    this.loading.file = path
    if (!skipCommit) this.commit()
    this.file = f

    let extensions = [basicSetup]
    let end = path.match(/\.(grammar|ts|js)/)?.[1]
    if (end === 'grammar') {
      let l = await this.registry.get('lezer')
      extensions.push(l.support)
    } else if (end) {
      let l = await this.registry.get('javascript')
      let t = {typescript: end === 'ts'}
      let support: LanguageSupport = l.module.support.javascript(t)
      extensions.push(support)
    }
    let err = this.language.name !== openLanguage || this.loading.file !== path
    if (err) return
    delete this.loading.file

    let doc = f.content
    this.editorView.setState(EditorState.create({doc, extensions}))
    this.trigger('open-file')
  }
  async build() {
    let key = Math.random().toString(36).slice(2, 10)
    this.loading.build = key
    this.commit()
    await this.language.build()
    if (this.loading.build === key) {
      delete this.loading.build
    }
    this.trigger('build')
  }
  commit() {
    if (this.file) {
      let content = this.editorView.state.doc.sliceString(0)
      this.language.change(this.file.path, content)
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
    event: 'all' | 'open-language' | 'open-file' | 'build' | 'commit',
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
