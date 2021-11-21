import type * as es from 'esbuild-wasm'

export interface EsbuildExport {
  initialize: (options: es.InitializeOptions) => Promise<void>
  build: (options: es.BuildOptions) => Promise<es.BuildResult>
}

let esbuildLoader: () => Promise<EsbuildExport> = async () => null
export const setEsbuildLoader = (loader: () => Promise<EsbuildExport>) => {
  esbuildLoader = () => {
    let p = loader()
    esbuildLoader = () => p
    return p
  }
}

export type ResolveResult =
  | {load: Promise<es.OnLoadResult>}
  | {external: Promise<any>}

export const resolvePath = (base: string, path: string): string => {
  if (!path.startsWith('.')) return path
  let n = base.split('/').slice(0, -1)
  for (let p of path.split('/')) {
    if (p === '..') n.pop()
    if (p === '...') n.pop(), n.pop()
    if (/^\.{1,3}$/.test(p)) continue
    n.push(p)
  }
  let p = ('/' + n.join('/')).replace(/\/+/g, '/')
  return p
}

const makeResolverPlugin = (
  resolve: (path: string) => ResolveResult,
  loads: {[x: string]: Promise<es.OnLoadResult>},
  externals: {[x: string]: Promise<any>}
) => {
  const plugin: es.Plugin = {
    name: 'ResolverPlugin',
    setup(build) {
      build.onResolve({filter: /./}, (args) => {
        let {importer, path} = args
        path = path.startsWith('.') ? resolvePath(importer, path) : path
        let r = resolve(path)
        if ('load' in r) loads[path] = r.load
        else externals[path] = r.external
        return {
          namespace: 'resolve',
          external: 'external' in r,
          path,
        }
      })
      build.onLoad({filter: /./, namespace: 'resolve'}, async (args) => {
        let {contents, loader} = await loads[args.path]
        return {contents, loader}
      })
    },
  }

  return plugin
}

export const build = async (
  entry: string,
  resolve: (path: string) => ResolveResult,
  skipExec = false
): Promise<any> => {
  let {build: esbuild} = await esbuildLoader()
  let loads: {[key: string]: Promise<es.OnLoadResult>} = {}
  let externals: {[key: string]: Promise<any>} = {}
  let build = await esbuild({
    bundle: true,
    format: 'iife',
    globalName: 'exports',
    entryPoints: [entry],
    plugins: [makeResolverPlugin(resolve, loads, externals)],
    write: false,
  })

  let keys = Object.keys(externals)
  let vals = await Promise.all(keys.map((k) => externals[k]))
  let map = {}
  for (let i in keys) map[keys[i]] = vals[i]

  let src = build.outputFiles[0].text
  if (skipExec) return src

  src += '\nreturn exports;\n'
  let out = new Function('require', src)((path: string) => map[path])
  return out
}
