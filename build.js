const typescript = require('typescript')
const esbuild = require('esbuild')
const path = require('path')
const fs = require('fs')

const build = async () => {
  if (fs.existsSync('build-temp')) {
    fs.rmSync('build-temp', {recursive: true})
  }

  fs.mkdirSync('build-temp')

  let worker = esbuild.buildSync({
    bundle: true,
    format: 'iife',
    minify: true,
    entryPoints: ['src/buildParserFileAsyncWorker.ts'],
    write: false,
  })
  let workerSrc = worker.outputFiles[0].text
  workerSrc = workerSrc.replace(/[\\"']/g, '\\$&').replace(/\n/g, '\\n')
  fs.writeFileSync(
    'build-temp/buildParserFileAsyncWorker.js',
    `var buildParserFileAsyncWorker_default = '${workerSrc}';\n` +
      `export {buildParserFileAsyncWorker_default as default};\n`
  )

  let workerPlugin = {
    name: 'WorkerPlugin',
    setup(build) {
      build.onResolve({filter: /./}, (args) => {
        if (!args.path.startsWith('.') || args.path.endsWith('Worker')) {
          return {external: true}
        }
        let p = path.resolve(path.dirname(args.importer), args.path)
        if (!/\.(js|ts)$/.test(p)) p += '.ts'
        return {path: p}
      })
    },
  }

  let shared = {
    entryPoints: ['src/index.ts'],
    bundle: true,
    sourcemap: true,
    target: ['esnext'],
    plugins: [workerPlugin],
  }
  await esbuild
    .build({...shared, outfile: 'build-temp/index.esm.js', format: 'esm'})
    .catch(() => process.exit(1))

  await esbuild
    .build({...shared, outfile: 'build-temp/index.js', format: 'cjs'})
    .catch(() => process.exit(1))

  typescript
    .createProgram(['src/index.ts'], {
      outDir: 'build-temp',
      declaration: true,
      emitDeclarationOnly: true,
    })
    .emit()

  fs.writeFileSync(
    'build-temp/buildParserFileAsyncWorker.d.ts',
    `declare const value: string\n` + `export default value`
  )

  fs.rmSync('build', {recursive: true})
  fs.renameSync('build-temp', 'build')

  // dev
  if (fs.existsSync('dev/build')) {
    fs.rmSync('dev/build', {recursive: true})
  }

  fs.mkdirSync('dev/build')

  fs.copyFileSync('dev/src/index.html', 'dev/build/index.html')

  esbuild
    .build({
      format: 'iife',
      entryPoints: ['dev/src/index.tsx'],
      bundle: true,
      outfile: 'dev/build/index.js',
    })
    .catch(() => process.exit(1))
}

build()
