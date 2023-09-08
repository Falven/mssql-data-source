import { build, BuildOptions } from 'esbuild';

const buildOptions: BuildOptions = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: true,
  target: 'node18',
  platform: 'node',
  plugins: [],
};

await build({
  ...buildOptions,
  format: 'esm',
  outfile: 'dist/esm/index.mjs',
});

await build({
  ...buildOptions,
  format: 'cjs',
  outfile: 'dist/cjs/index.js',
});
