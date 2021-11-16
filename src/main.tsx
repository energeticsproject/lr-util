import React, {useEffect, useRef, useState} from 'react'
import ReactDOM from 'react-dom'
import {setGithubAuth} from './loadFromGithub'
import {languageRegistryDefault} from './languageRegistryDefault'
import {LanguageEditor, SampleEditor} from './LanguageEditor'

setGithubAuth('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')

const PseudoList = <T extends any>(props: {
  values: T[]
  children: (value: T) => any
  maxLengthCollapsed?: number
}) => {
  let {values, children, maxLengthCollapsed = 999} = props
  let [expanded, setExpanded] = useState(false)
  useEffect(() => setExpanded(false), [values])
  if (!values?.length) return null
  let showMoreButton = false
  if (!expanded && values.length > maxLengthCollapsed) {
    values = values.slice(0, maxLengthCollapsed - 1)
    showMoreButton = true
  }

  return (
    <ul
      style={{
        padding: 0,
        margin: '16px -5px',
        listStyle: 'none',
        display: 'flex',
        flexWrap: 'wrap',
      }}
    >
      {values.map((value, i) => (
        <li key={i} style={{display: 'block', padding: '3px 5px'}}>
          {children(value)}
        </li>
      ))}
      {showMoreButton && (
        <li style={{display: 'block', padding: '3px 5px'}}>
          <button onClick={() => setExpanded(true)}>More</button>
        </li>
      )}
    </ul>
  )
}

const App = () => {
  const languageEditorViewContainer = useRef(null as HTMLDivElement)
  const sampleEditorViewContainer = useRef(null as HTMLDivElement)
  const [nonce, setNonce] = useState(0)
  const [languageEditor] = useState(new LanguageEditor(languageRegistryDefault))
  const [sampleEditor] = useState(new SampleEditor(languageRegistryDefault))

  useEffect(() => {
    languageEditor.mount(languageEditorViewContainer.current)
    languageEditor.addListener('all', () => setNonce(Math.random()))
    languageEditor.openLanguage('markdown')

    sampleEditor.mount(sampleEditorViewContainer.current)
    sampleEditor.addListener('all', () => setNonce(Math.random()))

    let updateSample = async () => {
      let l = languageEditor.language
      let s = await l.option.sample()
      sampleEditor.openSample(s, l.name)
    }
    languageEditor.addListener('open-language', updateSample)
    languageEditor.addListener('build', updateSample)

    return () => {
      languageEditor.destroy()
      sampleEditor.destroy()
    }
  }, [])

  return (
    <div>
      <h1>Lezer Sandbox</h1>
      <PseudoList values={languageRegistryDefault.languageOptions}>
        {(lo) => (
          <button
            onClick={() => languageEditor.openLanguage(lo.module.index)}
            disabled={
              lo.module.index ===
              (languageEditor.loading.language ?? languageEditor.language?.name)
            }
          >
            {lo.label}
          </button>
        )}
      </PseudoList>
      <hr />
      <PseudoList values={languageEditor.language?.src}>
        {(f) => (
          <button
            onClick={() => languageEditor.openFile(f.path)}
            disabled={
              f.path ===
              (languageEditor.loading.file?.split?.(':')?.[1] ??
                languageEditor.file.path)
            }
          >
            {(() => {
              return (
                f.path.split('/').slice(-2).join('/').replace(/^\//, '') +
                (f.entry ? ' (entry)' : '')
              )
            })()}
          </button>
        )}
      </PseudoList>
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
      <PseudoList values={sampleEditor.collection?.src} maxLengthCollapsed={10}>
        {(f) => (
          <button
            onClick={() => sampleEditor.openFile(f.path)}
            disabled={
              f.path ===
              (sampleEditor.loading.file?.split?.(':')?.[1] ??
                sampleEditor.file.path)
            }
          >
            {f.path.split('/').slice(-1)[0]}
          </button>
        )}
      </PseudoList>
      <div ref={sampleEditorViewContainer}></div>
    </div>
  )
}

ReactDOM.render(<App />, document.getElementById('root'))
