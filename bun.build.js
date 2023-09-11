// // delete all files in dist folder
// const fs = require('fs');
// const path = require('path');

// const directory = 'dist';

// fs.readdir(directory, (err, files) => {
//   if (err) throw err;

//   for (const file of files) {
//     fs.unlink(path.join(directory, file), err => {
//       if (err) throw err;
//     });
//   }
// });

await Bun.build({
	entrypoints: ['./src/index.ts'],
	outdir: './dist/',
	target: 'browser',
	sourcemap: 'inline',
	minify: false,
	naming: './dist/peanut-sdk.browser.js',
	// plugins: ['@babel/plugin-syntax-dynamic-import', '@babel/plugin-syntax-import-assertions'],
})

// Path: node.build.js
await Bun.build({
	entrypoints: ['./src/index.ts'],
	outdir: './dist/',
	target: 'node',
	sourcemap: 'inline',
	minify: false,
	naming: './dist/peanut-sdk.node.js',
	// plugins: ['@babel/plugin-syntax-dynamic-import', '@babel/plugin-syntax-import-assertions'],
})
