const typescript = require('typescript')
const esbuild = require('esbuild')
const path = require('path')
const fs = require('fs')

const build = async () => {
  if (fs.existsSync('temp')) {
    fs.rmSync('temp', {recursive: true})
  }

  fs.mkdirSync('temp')

  let worker = esbuild.buildSync({
    bundle: true,
    format: 'iife',
    minify: true,
    entryPoints: ['src/buildParserFileAsyncWorker.ts'],
    write: false,
  })

  let workerSrc = worker.outputFiles[0].text
  let workerPlugin = {
    name: 'WorkerPlugin',
    setup(build) {
      build.onResolve({filter: /./}, (args) => {
        if (!args.path.startsWith('.')) return {external: true}
        let p = path.resolve(path.dirname(args.importer), args.path)
        if (!p.endsWith('.ts')) p += '.ts'
        return {path: p}
      })
      build.onLoad({filter: /Worker\.ts/}, () => {
        return {contents: workerSrc, loader: 'text'}
      })
    },
  }

  await esbuild
    .build({
      entryPoints: ['src/index.ts'],
      outdir: 'temp',
      bundle: true,
      sourcemap: true,
      // minify: true,
      format: 'esm',
      target: ['esnext'],
      plugins: [workerPlugin],
    })
    .catch(() => process.exit(1))

  typescript
    .createProgram(['src/index.ts'], {
      outDir: 'temp',
      declaration: true,
      emitDeclarationOnly: true,
    })
    .emit()

  fs.rmSync('dist', {recursive: true})
  fs.renameSync('temp', 'dist')
}

build()
