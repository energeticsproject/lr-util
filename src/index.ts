import {setEsbuildLoader, build} from './build'
import {
  setBuildParserFileAsyncWorkerLoader,
  buildParserFileAsync,
} from './buildParserFileAsync'
import {SrcFile, Language} from './Language'
import {LanguageEditor, SampleEditor, CollectionEditor} from './LanguageEditor'
import {LanguageRegistry} from './LanguageRegistry'
import {languageRegistryDefault} from './languageRegistryDefault'
import {
  setGithubAuth,
  setGithubRemote,
  loadFromGithub,
  loadTreeFromGithub,
} from './loadFromGithub'
import {print, parse, printOnly} from './print'

export {
  setEsbuildLoader,
  build,
  setBuildParserFileAsyncWorkerLoader,
  buildParserFileAsync,
  SrcFile,
  Language,
  LanguageEditor,
  SampleEditor,
  CollectionEditor,
  LanguageRegistry,
  languageRegistryDefault,
  setGithubAuth,
  setGithubRemote,
  loadFromGithub,
  loadTreeFromGithub,
  print,
  parse,
  printOnly,
}

export default {
  setEsbuildLoader,
  build,
  setBuildParserFileAsyncWorkerLoader,
  buildParserFileAsync,
  SrcFile,
  Language,
  LanguageEditor,
  SampleEditor,
  CollectionEditor,
  LanguageRegistry,
  languageRegistryDefault,
  setGithubAuth,
  setGithubRemote,
  loadFromGithub,
  loadTreeFromGithub,
  print,
  parse,
  printOnly,
}
