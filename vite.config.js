import { build } from 'esbuild';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const ENTRY = resolve(import.meta.dirname, 'src/bookmarklet/index.js');
const VIRTUAL_ID = 'virtual:bookmarklet';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

// Bundles src/bookmarklet into one minified IIFE and exposes it as a string:
//   import code from 'virtual:bookmarklet'
function bookmarklet() {
  return {
    name: 'bookmarklet',
    resolveId: (id) => (id === VIRTUAL_ID ? RESOLVED_ID : null),
    async load(id) {
      if (id !== RESOLVED_ID) return null;
      const out = await build({
        entryPoints: [ENTRY],
        bundle: true,
        format: 'iife',
        minify: true,
        target: 'es2020',
        charset: 'ascii', // \u-escape symbols so the code survives any page encoding
        legalComments: 'none',
        write: false,
        metafile: true,
      });
      for (const file of Object.keys(out.metafile.inputs)) this.addWatchFile(resolve(file));
      return `export default ${JSON.stringify(out.outputFiles[0].text.trim())};`;
    },
    // Dev: rebuild the bookmarklet and reload the page when its sources change
    handleHotUpdate({ file, server }) {
      if (!file.includes('/src/bookmarklet/')) return;
      const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
      if (mod) server.moduleGraph.invalidateModule(mod);
      server.ws.send({ type: 'full-reload' });
      return [];
    },
  };
}

// Output is a single self-contained dist/index.html, so it can be shared as one file like before
export default defineConfig({
  plugins: [bookmarklet(), viteSingleFile()],
  test: {
    environment: 'node',
  },
});
