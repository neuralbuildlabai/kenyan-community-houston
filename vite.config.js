var _a;
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
var pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
export default defineConfig({
    define: {
        __KIGH_APP_VERSION__: JSON.stringify((_a = pkg.version) !== null && _a !== void 0 ? _a : '0.0.0'),
    },
    plugins: [react()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
});
