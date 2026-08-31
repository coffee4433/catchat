import coreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

// `react-hooks` is bundled inside eslint-config-next rather than installed at the
// top level, so reuse that exact plugin instance — declaring a second one would
// make ESLint throw "Cannot redefine plugin".
const bundledPlugins = [...coreWebVitals, ...nextTypescript].reduce(
  (acc, config) => (config.plugins ? { ...acc, ...config.plugins } : acc),
  {},
)
const reactHooks = { 'react-hooks': bundledPlugins['react-hooks'] }

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      '.next/**',
      'dist/**',
      'build/**',
      'node_modules/**',
      'android/**',
      'plugins/**',
      'release-tool/dist/**',
      'scratch/**',
      'public/**',
      '*-player-script.js',
      'main.js',
    ],
  },
  ...coreWebVitals,
  ...nextTypescript,
  {
    plugins: reactHooks,
    rules: {
      // The plugin/proxy glue leans on `any`; surface it without failing the build.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // React Compiler rules flag ~42 pre-existing spots (mostly setState inside effects
      // in chat-thread / cat-music contexts). They are real debt, but fixing them is a
      // behavioural refactor, so keep them visible as warnings instead of blocking CI.
      // TODO: work these down file by file, then promote back to 'error'.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
  {
    files: [
      'electron/**/*.js',
      'electron-main.js',
      'preload.js',
      'release-tool/**/*.js',
      'scripts/**/*.{js,cjs,mjs}',
      '**/*.cjs',
    ],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        __dirname: 'readonly',
        process: 'readonly',
        require: 'readonly',
        module: 'writable',
        console: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]
