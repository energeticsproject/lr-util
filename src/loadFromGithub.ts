import {build, ResolveResult} from './build'
import {SrcFile} from './Language'

const api = {
  remote: null,
  auth: null,
  cache: {},
  get: async (path: string) => {
    let c = api.cache
    if (c[path]) return c[path]
    if (Object.keys(c).length > 128) {
      for (let k in c) if (Math.random() > 0.5) delete c[k]
    }
    let params = {headers: {}} as any
    if (api.auth) params.headers.authorization = `token ${api.auth}`
    let res = await fetch(`https://api.github.com` + path, params)
    let json = res.status !== 200 ? null : await res.json()
    c[path] = json
    return json
  },
}

export const setGithubRemote = (remote: {
  language: string
  tree: string
  esbuild?: string
}) => {
  api.remote = remote
}

export const setGithubAuth = (token: string) => {
  api.auth = token
}

const parseURL = (url: string): [string, string, string] => {
  let reg = /^([\w\-]+\/[\w\-]+)(?:\/([\w\-\/\s%]+))?(?:@(.+))?$/
  let [, repo, path, tag] = url.match(reg) ?? []
  return [repo, path, tag]
}

interface Tag {
  type: 'tag' | 'branch'
  name: string
  sha: string
}

type GetTagParams = {repo: string; name?: string}
const getTag = async ({repo, name}: GetTagParams): Promise<Tag> => {
  let [repoGH, tags] = await Promise.all([
    api.get(`/repos/${repo}`),
    api.get(`/repos/${repo}/tags`),
  ])
  let t = (type: 'tag' | 'branch', t: any): Tag => {
    if (!t) return null
    return {type, name: t.name, sha: t.commit.sha}
  }
  if (!name && /^\d+\.\d+\.\d+$/.test(tags[0]?.name)) name = 'latest'
  if (name === 'latest') return t('tag', tags[0])
  for (let tag of tags) if (tag.name === name) return t('tag', tag)
  if (!name) name = repoGH.default_branch
  let branch = await api.get(`/repos/${repo}/branches/${name}`)
  return t('branch', branch)
}

type GetSrcParams = {repo: string; tag: Tag}
const getSrc = async ({
  repo,
  tag,
}: GetSrcParams): Promise<{src: SrcFile[]; prebuilt?: SrcFile}> => {
  let data = await api.get(`/repos/${repo}/git/trees/${tag.sha}?recursive=true`)
  let paths: string[] = [
    'package.json',
    ...data.tree
      .filter((f) => /^src.+\.(js|ts|grammar)$/.test(f.path))
      .filter((f) => !f.path.endsWith('.d.ts'))
      .map((f) => f.path),
  ]
  let [packageJSON, ...src] = await Promise.all(
    paths.map(async (path) => {
      let url = `https://raw.githubusercontent.com/${repo}/${tag.name}/${path}`
      let res = await fetch(url)
      let content = await res.text()
      return {path: '/' + path, content}
    })
  )
  src.push(packageJSON)
  let npm = JSON.parse(packageJSON.content)
  let prebuilt: SrcFile = null
  if (tag.type === 'tag') {
    let unpkg = `https://unpkg.com/${npm.name}@${tag.name}/${npm.main}`
    let bc = await fetch(unpkg).then((res) => res.status === 200 && res.text())
    if (bc) {
      prebuilt = {path: '/' + npm.name, content: bc}
    }
  }
  return {src, prebuilt}
}

const markEntry = (files: SrcFile[], isParser: boolean, fallback: string) => {
  if (files.length === 1) {
    let f = files[0]
    if (!f.entry) f.entry = {}
    f.entry[isParser ? 'parser' : 'support'] = true
    return
  }
  let fb = fallback
  let check = ['.grammar', 'index.ts', 'index.js', fb + '.ts', fb + '.js']
  if (!isParser) check.shift()
  for (let c of check) {
    let f = files.find((f) => f.path.endsWith(c))
    if (!f) continue
    if (!f.entry) f.entry = {}
    f.entry[isParser ? 'parser' : 'support'] = true
    return
  }
}

export type LoadFromGithubParams = {
  parser: string
  support: string
  config?: string
}

export const loadFromGithubRemote = async ({
  parser,
  support,
  config,
}: LoadFromGithubParams) => {
  let p = `?parser=${encodeURIComponent(parser)}`
  let s = `&support=${encodeURIComponent(support)}`
  let c = encodeURIComponent(config)
  if (!api.remote.esbuild) {
    let res = await fetch(`${api.remote.language}${p}${s}&config=${c}`)
    let data = await res.json()
    if (res.status !== 200) throw new Error(data)
    return data
  }
  let [{src, prebuilt}, prebuiltConfig] = await Promise.all([
    (async () => {
      let res = await fetch(`${api.remote.language}${p}${s}`)
      let data = await res.json()
      if (res.status !== 200) throw new Error(data)
      return data
    })(),
    (async () => {
      let res = await fetch(`${api.remote.esbuild}?src=${c}`)
      let data = await res.text()
      if (res.status !== 200) throw new Error(data)
      return data
    })(),
  ])
  src.unshift({path: '/config.js', content: config, entry: {index: true}})
  if (prebuilt && prebuiltConfig) {
    prebuilt.unshift({
      path: '/config.js',
      content: prebuiltConfig,
      entry: {index: true},
    })
  }
  return {src, prebuilt}
}

export const loadFromGithub = async ({
  parser,
  support,
  config,
}: LoadFromGithubParams): Promise<{src: SrcFile[]; prebuilt?: SrcFile[]}> => {
  if (api.remote?.language) {
    return loadFromGithubRemote({parser, support, config})
  }
  let [parserRepo, , parserTagName] = parseURL(parser)
  let [supportRepo, , supportTagName] = parseURL(support)
  let lang = parser.match(/\w+$/)[0]

  let src: SrcFile[]
  let prebuilt: SrcFile[] = null

  if (parser === support) {
    let tag = await getTag({repo: parserRepo, name: parserTagName})
    let c = await getSrc({repo: parserRepo, tag})
    markEntry(c.src, true, lang)
    markEntry(c.src, false, lang)
    src = c.src
    if (c.prebuilt) {
      markEntry([c.prebuilt], true, lang)
      markEntry([c.prebuilt], false, lang)
      prebuilt = [c.prebuilt]
    }
  } else {
    let [pTag, sTag] = await Promise.all([
      getTag({repo: parserRepo, name: parserTagName}),
      getTag({repo: supportRepo, name: supportTagName}),
    ])
    let [p, s] = await Promise.all([
      getSrc({repo: parserRepo, tag: pTag}),
      getSrc({repo: supportRepo, tag: sTag}),
    ])
    for (let f of p.src) f.path = '/parser' + f.path.replace(/^\/src/, '')
    for (let f of s.src) f.path = '/support' + f.path.replace(/^\/src/, '')
    markEntry(p.src, true, lang)
    markEntry(s.src, false, lang)
    src = [].concat(p.src, s.src)
    if (p.prebuilt && s.prebuilt) {
      markEntry([p.prebuilt], true, lang)
      markEntry([s.prebuilt], false, lang)
      prebuilt = [p.prebuilt, s.prebuilt]
    }
  }

  if (config && prebuilt) {
    prebuilt.unshift({
      path: '/config.js',
      content: await build(
        '/',
        (s): ResolveResult => {
          if (s === '/') return {load: Promise.resolve({contents: config})}
          else return {external: Promise.resolve(true)}
        },
        true
      ),
      entry: {index: true},
    })
  }
  if (config) {
    src.unshift({path: '/config.js', content: config, entry: {index: true}})
  }

  // entry first, rest unchanged
  src.sort((a, b) => +!!b.entry - +!!a.entry)

  return {src, prebuilt}
}

export const loadTreeFromGithub = async (tree: string, extension?: string) => {
  if (api.remote?.tree) {
    let t = `tree=${encodeURIComponent(tree)}`
    let e = `extension=${encodeURIComponent(extension)}`
    let res = await fetch(`${api.remote.tree}?${t}&${e}`)
    let data: SrcFile[] = await res.json()
    if (res.status !== 200) throw new Error(data as any)
    return data.map((f) => new SrcFile(f))
  }
  let [repo, path, tagName] = parseURL(tree)
  let tag = await getTag({repo, name: tagName})

  let data: {tree: {sha: string; path: string}[]}
  let sha = tag.sha
  if (path) {
    let pa = path.split('/')
    for (let i in pa) {
      data = await api.get(`/repos/${repo}/git/trees/${sha}`)
      sha = data.tree.find(({path}) => path === pa[i])?.sha
      if (!sha) throw new Error(`Could not load tree from github, "${tree}"`)
    }
  }
  data = await api.get(`/repos/${repo}/git/trees/${sha}?recursive=true`)

  return data.tree
    .filter((f) => !extension || f.path.endsWith(extension))
    .map((f) => (path ? `/${path}/${f.path}` : `/${f.path}`))
    .map((path) => {
      return new SrcFile({
        path,
        url: `https://raw.githubusercontent.com/${repo}/${tag.name}${path}`,
      })
    })
}
