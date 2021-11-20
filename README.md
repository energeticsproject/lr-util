# lr-util

TODO:

- move playground out
-

lr-util has some dependencies that like to kick build toolchains in the arse

1. big filesize
2. depend on browser/node environment

```js
const setEsbuildLoader = () => {
  return import('esbuild-wasm')
}
```
