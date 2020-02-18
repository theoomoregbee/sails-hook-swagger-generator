const typescript = require('@rollup/plugin-typescript');

module.exports = {
    input: './index.ts',
    output: {
      file: './index.js',
      format: 'cjs'
    },
    plugins: [typescript({compilerOptions: {
      typeRoots: ["./types", "./node_modules/@types"]
    }})]
  };