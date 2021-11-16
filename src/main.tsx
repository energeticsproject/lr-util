import React, {useEffect, useRef, useState} from 'react'
import ReactDOM from 'react-dom'
import {setGithubAuth} from './loadFromGithub'
import {languageRegistryDefault} from './languageRegistryDefault'
import {CollectionEditor, LanguageEditor} from './LanguageEditor'

setGithubAuth('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')

const App = () => {
  const languageEditorViewContainer = useRef(null as HTMLDivElement)
  const sampleEditorViewContainer = useRef(null as HTMLDivElement)
  const [nonce, setNonce] = useState(0)
  const [languageEditor] = useState(new LanguageEditor(languageRegistryDefault))
  const [sampleEditor] = useState(new CollectionEditor(languageRegistryDefault))
  const {language, file, loading} = languageEditor

  useEffect(() => {
    languageEditor.mount(languageEditorViewContainer.current)
    languageEditor.addListener('all', () => setNonce(Math.random()))
    languageEditor.addListener('open-language', async () => {
      // let sample = await languageEditor.language.option.sample()
    })
    languageEditor.openLanguage('javascript')
    return () => languageEditor.destroy()
  }, [])

  useEffect(() => {
    sampleEditor.mount(sampleEditorViewContainer.current)
    sampleEditor.addListener('all', () => setNonce(Math.random()))
    languageRegistryDefault
      .get('javascript')
      .then((l) => l.option.sample())
      .then((src) => sampleEditor.openCollection({name: 'javascript', src}))
    return () => sampleEditor.destroy()
  }, [])

  return (
    <div>
      <ul
        style={{
          padding: 0,
          margin: '16px -5px',
          listStyle: 'none',
          display: 'flex',
          flexWrap: 'wrap',
        }}
      >
        {languageRegistryDefault.languageOptions.map((lo) => (
          <li
            key={lo.module.index}
            style={{display: 'block', padding: '3px 5px'}}
          >
            <button
              onClick={() => {
                languageEditor.openLanguage(lo.module.index)
              }}
              disabled={
                lo.module.index === (loading.language ?? language?.name)
              }
            >
              {lo.label}
            </button>
          </li>
        ))}
      </ul>
      <hr />
      {language && (
        <ul
          style={{
            padding: 0,
            margin: '16px -5px',
            listStyle: 'none',
            display: 'flex',
            flexWrap: 'wrap',
          }}
        >
          {language.src.map((f) => (
            <li key={f.path} style={{display: 'block', padding: '3px 5px'}}>
              <button
                onClick={() => {
                  languageEditor.openFile(f.path)
                }}
                disabled={f.path === (loading.file ?? file.path)}
              >
                {(() => {
                  return (
                    f.path.split('/').slice(-2).join('/').replace(/^\//, '') +
                    (f.entry ? ' (entry)' : '')
                  )
                })()}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div ref={languageEditorViewContainer}></div>
      <p>
        <button
          onClick={() => languageEditor.build()}
          disabled={
            !!(
              languageEditor.loading.language ||
              languageEditor.loading.file ||
              languageEditor.loading.build
            )
          }
        >
          Rebuild
        </button>
      </p>
      <hr />
      {sampleEditor.collection && (
        <ul
          style={{
            padding: 0,
            margin: '16px -5px',
            listStyle: 'none',
            display: 'flex',
            flexWrap: 'wrap',
          }}
        >
          {sampleEditor.collection.src.map((f) => (
            <li key={f.path} style={{display: 'block', padding: '3px 5px'}}>
              <button
                onClick={() => {
                  sampleEditor.openFile(f.path)
                }}
                disabled={
                  f.path ===
                  (sampleEditor.loading.file ?? sampleEditor.file.path)
                }
              >
                {f.path.split('/').slice(-1)[0]}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div ref={sampleEditorViewContainer}></div>
    </div>
  )
}

ReactDOM.render(<App />, document.getElementById('root'))
