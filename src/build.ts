import esbuild from 'esbuild-wasm'

export type ResolveResult =
  | {load: Promise<esbuild.OnLoadResult>}
  | {external: Promise<any>}

const makeResolverPlugin = (
  resolve: (path: string) => ResolveResult,
  loads: {[x: string]: Promise<esbuild.OnLoadResult>},
  externals: {[x: string]: Promise<any>}
) => {
  const resolvePath = (base: string, path: string): string => {
    let n = base.split('/').slice(0, -1)
    for (let p of path.split('/')) {
      if (p === '..') n.pop()
      if (p === '...') n.pop(), n.pop()
      if (/^\.{1,3}$/.test(p)) continue
      n.push(p)
    }
    let p = n.join('/')
    if (p[0] !== '/') p = '/' + p
    return p
  }

  const plugin: esbuild.Plugin = {
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

let esbuildInitialiser = null
export const build = async (
  entry: string,
  resolve: (path: string) => ResolveResult
): Promise<any> => {
  if (!esbuildInitialiser) {
    const wasmURL = 'https://unpkg.com/esbuild-wasm@0.13.13/esbuild.wasm'
    esbuildInitialiser = esbuild.initialize({wasmURL})
  }
  await esbuildInitialiser
  let loads: {[key: string]: Promise<esbuild.OnLoadResult>} = {}
  let externals: {[key: string]: Promise<any>} = {}
  let build = await esbuild.build({
    bundle: true,
    format: 'iife',
    globalName: '__exports',
    entryPoints: [entry],
    plugins: [makeResolverPlugin(resolve, loads, externals)],
  })

  let keys = Object.keys(externals)
  let vals = await Promise.all(keys.map((k) => externals[k]))
  let map = {}
  for (let i in keys) map[keys[i]] = vals[i]

  let out = new Function(
    'require',
    build.outputFiles[0].text + '\nreturn __exports\n'
  )((path: string) => map[path])
  return out
}
