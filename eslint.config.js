import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'src/data'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // TypeScript already enforces these via strict tsconfig
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      // Allow explicit any where necessary (existing codebase uses it sparingly)
      '@typescript-eslint/no-explicit-any': 'warn',
      // TanStack Virtual is not yet declared React Compiler-compatible; suppress the noise
      'react-hooks/incompatible-library': 'off',
    },
  },
)
