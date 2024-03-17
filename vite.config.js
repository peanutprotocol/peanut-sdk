// vite.config.js
import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
	plugins: [
		dts({ rollupTypes: true }),
		visualizer({ open: true, filename: 'bundle-analysis.html' }), // Add this line
	],
	build: {
		lib: {
			// Could also be a dictionary or array of multiple entry points
			entry: resolve(__dirname, 'src/index.ts'),
			name: 'Peanut',
			fileName: 'index',
			formats: ['es'],
		},
		rollupOptions: {
			// Peer deps
			external: ['ethersv5'],
		},
	},
})
