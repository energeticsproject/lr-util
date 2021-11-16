const esbuild = require('esbuild')
const fs = require('fs')

const build = async () => {
  if (fs.existsSync('build')) {
    fs.rmSync('build', {recursive: true})
  }

  fs.mkdirSync('build')

  let worker = esbuild.buildSync({
    bundle: true,
    format: 'iife',
    minify: true,
    entryPoints: ['src/buildParserFileAsyncWorker.ts'],
    write: false,
  })

  let workerSrc = worker.outputFiles[0].text

  await esbuild
    .build({
      bundle: true,
      format: 'iife',
      globalName: '__exports',
      entryPoints: ['src/main.tsx'],
      sourcemap: true,
      plugins: [
        {
          name: 'WorkerPlugin',
          setup(build) {
            build.onLoad({filter: /Worker\.ts/}, () => {
              return {contents: workerSrc, loader: 'text'}
            })
          },
        },
      ],
      outdir: 'build',
    })
    .catch(() => process.exit(1))

  fs.copyFileSync('public/index.html', 'build/index.html')
}

build()
