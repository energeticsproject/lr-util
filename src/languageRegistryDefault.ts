import {SrcFile} from './Language'
import {LanguageRegistry} from './LanguageRegistry'
import {loadFromGithub, loadTreeFromGithub} from './loadFromGithub'

let gh = 'https://raw.githubusercontent.com/'
let sp = 'TheRenegadeCoder/sample-programs/archive/'

let fa = async (a: string[]) => {
  let f: SrcFile[] = await Promise.all(
    a.map(async (path) => {
      let res = await fetch(path)
      let content = await res.text()
      return res.status === 200 && {path, content}
    })
  )
  f = f.filter((v) => v)
  return f
}

export const languageRegistryDefault = new LanguageRegistry([
  {
    label: 'Basic Example',
    module: {
      index: 'basic-example',
    },
    files: () => {
      return loadFromGithub({
        parser: 'codemirror/lang-example',
        support: 'codemirror/lang-example',
        config:
          `export {parser} from './parser'\n` +
          `export {EXAMPLELanguage as support} from './support'\n`,
      })
    },
    sample: () => fa(['/examples/example.basic-example']),
  },
  {
    label: 'CSS',
    module: {
      index: 'css',
      parser: '@lezer/css',
      support: '@codemirror/lang-css',
    },
    files: () => {
      return loadFromGithub({
        parser: 'lezer-parser/css',
        support: 'codemirror/lang-css',
        config:
          `export {parser} from './parser'\n` +
          `export {cssLanguage as support} from './support'\n`,
      })
    },
    sample: () => fa(['/examples/example.css']),
  },
  {
    label: 'C++',
    module: {
      index: 'cpp',
      parser: '@lezer/cpp',
      support: '@codemirror/lang-cpp',
    },
    files: () => {
      return loadFromGithub({
        parser: 'lezer-parser/cpp',
        support: 'codemirror/lang-cpp',
        config:
          `export {parser} from './parser'\n` +
          `export {cppLanguage as support} from './support'\n`,
      })
    },
    sample: () => loadTreeFromGithub(sp + 'c/c-plus-plus', '.cpp'),
  },
  {
    label: 'HTML',
    module: {
      index: 'html',
      parser: '@lezer/html',
      support: '@codemirror/lang-html',
    },
    files: () => {
      return loadFromGithub({
        parser: 'lezer-parser/html',
        support: 'codemirror/lang-html',
        config:
          `export {parser} from './parser'\n` +
          `import {html} from './support'\n` +
          `\n` +
          `export const support = html({matchClosingTags: false, autoCloseTags: true})\n`,
      })
    },
    sample: () => fa(['/examples/example.html']),
  },
  {
    label: 'Java',
    module: {
      index: 'java',
      parser: '@lezer/java',
      support: '@codemirror/lang-java',
    },
    files: () => {
      return loadFromGithub({
        parser: 'lezer-parser/java',
        support: 'codemirror/lang-java',
        config:
          `export {parser} from './parser'\n` +
          `export {javaLanguage as support} from './support'\n`,
      })
    },
    sample: () => loadTreeFromGithub(sp + 'j/java', '.java'),
  },
  {
    label: 'JavaScript',
    module: {
      index: 'javascript',
      parser: '@lezer/javascript',
      support: '@codemirror/lang-javascript',
    },
    files: () => {
      return loadFromGithub({
        parser: 'lezer-parser/javascript',
        support: 'codemirror/lang-javascript',
        config:
          `import {parser as p} from './parser'\n` +
          `import {javascript} from './support'\n` +
          `\n` +
          `export const parser = p.configure({dialect: 'jsx ts'})\n` +
          `export const support = javascript({jsx: true, typescript: true})\n`,
      })
    },
    sample: () => loadTreeFromGithub(sp + 'j/javascript', '.js'),
  },
  {
    label: 'JSON',
    module: {
      index: 'json',
      parser: '@lezer/json',
      support: '@codemirror/lang-json',
    },
    files: () => {
      return loadFromGithub({
        parser: 'lezer-parser/json',
        support: 'codemirror/lang-json',
        config:
          `export {parser} from './parser'\n` +
          `export {jsonLanguage as support} from './support'\n`,
      })
    },
    sample: () => fa(['/examples/example.json']),
  },
  {
    label: 'Lezer',
    module: {
      index: 'lezer',
      parser: '@lezer/lezer',
      support: '@codemirror/lang-lezer',
    },
    files: () => {
      return loadFromGithub({
        parser: 'lezer-parser/lezer-grammar',
        support: 'codemirror/lang-lezer',
        config:
          `export {parser} from './parser'\n` +
          `export {lezerLanguage as support} from './support'\n`,
      })
    },
    sample: () => fa([gh + 'codemirror/lang-example/main/src/syntax.grammar']),
  },
  {
    label: 'Markdown',
    module: {
      index: 'markdown',
      parser: '@lezer/markdown',
      support: '@codemirror/lang-markdown',
    },
    files: () => {
      return loadFromGithub({
        parser: 'lezer-parser/markdown',
        support: 'codemirror/lang-markdown',
        config:
          `export {parser} from './parser'\n` +
          `export {markdownLanguage as support} from './support'\n`,
      })
    },
    sample: () => fa(['/examples/example.md']),
  },
  {
    label: 'PHP',
    module: {
      index: 'php',
      parser: '@lezer/php',
      support: '@codemirror/lang-php',
    },
    files: () => {
      return loadFromGithub({
        parser: 'lezer-parser/php',
        support: 'codemirror/lang-php',
        config:
          `export {parser} from './parser'\n` +
          `import {php} from './support'\n` +
          `\n` +
          `export const support = php({basesupport: null, plain: false})\n`,
      })
    },
    sample: () => loadTreeFromGithub(sp + 'p/php', '.php'),
  },
  {
    label: 'Python',
    module: {
      index: 'python',
      parser: '@lezer/python',
      support: '@codemirror/lang-python',
    },
    files: () => {
      return loadFromGithub({
        parser: 'lezer-parser/python',
        support: 'codemirror/lang-python',
        config:
          `export {parser} from './parser'\n` +
          `export {pythonLanguage as support} from './support'\n`,
      })
    },
    sample: () => loadTreeFromGithub(sp + 'p/python', '.py'),
  },
  {
    label: 'Rust',
    module: {
      index: 'rust',
      parser: '@lezer/rust',
      support: '@codemirror/lang-rust',
    },
    files: () => {
      return loadFromGithub({
        parser: 'lezer-parser/rust',
        support: 'codemirror/lang-rust',
        config:
          `export {parser} from './parser'\n` +
          `export {rustLanguage as support} from './support'\n`,
      })
    },
    sample: () => loadTreeFromGithub(sp + 'r/rust', '.rs'),
  },
  {
    label: 'SQL',
    module: {
      index: 'sql',
      parser: '@lezer/sql',
      support: '@codemirror/lang-sql',
    },
    files: async () => {
      const {src, prebuilt} = await loadFromGithub({
        parser: 'codemirror/lang-sql',
        support: 'codemirror/lang-sql',
        config:
          `export {parser} from './parser'\n` +
          `export {PostgreSQL as support} from './support'\n`,
      })
      prebuilt[0].content += `\nexport {parser}\n`
      return {src, prebuilt}
    },
    sample: () => fa(['/examples/example.sql']),
  },
  {
    label: 'WebAssembly',
    module: {
      index: 'wast',
      parser: '@lezer/wast',
      support: '@codemirror/lang-wast',
    },
    files: async () => {
      const {src, prebuilt} = await loadFromGithub({
        parser: 'codemirror/lang-wast',
        support: 'codemirror/lang-wast',
        config:
          `export {parser} from './parser'\n` +
          `export {wastLanguage as support} from './support'\n`,
      })
      prebuilt[0].content += `\nexport {parser}\n`
      return {src, prebuilt}
    },
    sample: () => loadTreeFromGithub('WAVM/WAVM/Examples', '.wast'),
  },
  {
    label: 'XML',
    module: {
      index: 'xml',
      parser: '@lezer/xml',
      support: '@codemirror/lang-xml',
    },
    files: () => {
      return loadFromGithub({
        parser: 'lezer-parser/xml',
        support: 'codemirror/lang-xml',
        config:
          `export {parser} from './parser'\n` +
          `export {xmlLanguage as support} from './support'\n`,
      })
    },
    sample: () => fa(['/examples/example.xml']),
  },
])
