const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['dist/lambda.js'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: 'dist-bundle/lambda.js',
  external: ['@aws-sdk/*', '.prisma/*', 'mock-aws-s3', 'aws-sdk'],
  minify: false,
  sourcemap: true,
  loader: {
    '.html': 'text',
  },
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
