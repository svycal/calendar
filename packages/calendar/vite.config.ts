import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import dts from 'vite-plugin-dts';
import path from 'path';
import { readFileSync, copyFileSync, mkdirSync } from 'fs';

const isWatch = process.argv.includes('--watch');

// Read package.json to get dependencies for externalization
const pkg = JSON.parse(
  readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')
);
const externalDeps = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
];

/**
 * Plugin to copy CSS files to dist without processing through Tailwind.
 * These CSS files are meant to be consumed by the host app's Tailwind build.
 */
function copyCssPlugin() {
  return {
    name: 'copy-css',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      mkdirSync(distDir, { recursive: true });

      // Copy preset.css and components.css to dist
      const cssFiles = ['preset.css', 'components.css'];
      for (const file of cssFiles) {
        const src = path.resolve(__dirname, 'src', file);
        const dest = path.resolve(distDir, file);
        copyFileSync(src, dest);
        console.log(`Copied ${file} to dist/`);
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Skip dts in watch mode to avoid incremental build errors
    !isWatch &&
      dts({
        insertTypesEntry: true,
        // Don't roll up types - keep them as separate files to match preserveModules
        rollupTypes: false,
      }),
    // Copy CSS files to dist without Tailwind processing
    copyCssPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    lib: {
      entry: {
        index: path.resolve(__dirname, 'src/index.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      // Externalize all dependencies - they should be installed by consumers
      external: (id) => {
        // Always externalize react
        if (
          id === 'react' ||
          id === 'react-dom' ||
          id === 'react/jsx-runtime'
        ) {
          return true;
        }
        // Externalize all dependencies and their subpaths
        return externalDeps.some(
          (dep) => id === dep || id.startsWith(`${dep}/`)
        );
      },
      output: {
        // Preserve module structure for tree-shaking
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
        // Don't output processed CSS - we copy raw files instead
        assetFileNames: (assetInfo) => {
          // Skip CSS assets - we handle them with copyCssPlugin
          if (assetInfo.name?.endsWith('.css')) return 'ignored-[name].css';
          return assetInfo.name || '';
        },
      },
    },
    // Don't bundle CSS through Vite's pipeline
    cssCodeSplit: false,
  },
});
