import { BuildOptions, build, context } from 'esbuild';
import { nodeExternalsPlugin } from 'esbuild-node-externals';
import { glob } from 'glob';

const args = process.argv.slice(2);

const esmOptions: Partial<BuildOptions> = {
  format: 'esm',
};

const cjsOptions: Partial<BuildOptions> = {
  format: 'cjs',
};

const appOptions: Partial<BuildOptions> = {
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  plugins: [
    nodeExternalsPlugin({
      dependencies: false,
      peerDependencies: true,
      devDependencies: true,
      optionalDependencies: true,
    }),
  ],
  external: ['tiktoken'],
};

const libOptions: Partial<BuildOptions> = {
  entryPoints: await glob('src/**/*.ts'),
  outdir: args.includes('--esm') ? 'dist/esm/' : 'dist/cjs/',
};

const devOptions: Partial<BuildOptions> = {
  sourcemap: 'external',
  logLevel: 'info',
};

const prodOptions: Partial<BuildOptions> = {
  minify: true,
};

const commonOptions: BuildOptions = {
  target: 'node18',
  platform: 'node',
  keepNames: true,
  ...(args.includes('--esm') ? esmOptions : cjsOptions),
  ...(args.includes('--lib') ? libOptions : appOptions),
  ...(args.includes('--dev') ? devOptions : prodOptions),
};

await build(commonOptions);

if (args.includes('--watch')) {
  const buildContext = await context({
    ...commonOptions,
    sourcemap: true,
    logLevel: 'info',
  });
  await buildContext.watch();
}
