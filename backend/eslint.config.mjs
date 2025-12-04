import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import { FlatCompat } from '@eslint/eslintrc';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default tseslint.config(
  // Base configurations
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,

  // Global settings
  {
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
        sourceType: 'module',
      },
      globals: {
        node: true,
        jest: true,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      import: importPlugin,
    },
  },

  // Ignore patterns
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', '.eslintrc.js', 'eslint.config.mjs'],
  },

  // Main rules
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'no-console': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
    },
  },

  // Domain layer rules (Hexagonal Architecture enforcement)
  {
    files: ['src/modules/*/domain/**/*.ts'],
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/modules/*/domain',
              from: './src/modules/*/application',
              message: 'Domain layer should not import from Application layer',
            },
            {
              target: './src/modules/*/domain',
              from: './src/modules/*/infrastructure',
              message:
                'Domain layer should not import from Infrastructure layer',
            },
            {
              target: './src/modules/*/domain',
              from: './node_modules/@nestjs',
              message: 'Domain layer should not import NestJS framework',
            },
            {
              target: './src/modules/*/domain',
              from: './node_modules/typeorm',
              message: 'Domain layer should not import TypeORM',
            },
            {
              target: './src/modules/*/domain',
              from: './node_modules/express',
              message: 'Domain layer should not import Express',
            },
          ],
        },
      ],
    },
  },

  // Application layer rules (Hexagonal Architecture enforcement)
  {
    files: ['src/modules/*/application/**/*.ts'],
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/modules/*/application',
              from: './src/modules/*/infrastructure',
              message:
                'Application layer should not import from Infrastructure layer',
            },
            {
              target: './src/modules/*/application',
              from: './node_modules/typeorm',
              message: 'Application layer should not import TypeORM directly',
            },
            {
              target: './src/modules/*/application',
              from: './node_modules/express',
              message: 'Application layer should not import Express',
            },
          ],
        },
      ],
    },
  },

  // Test files rules
  {
    files: ['**/*.spec.ts', '**/*.test.ts', 'test/**/*.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  }
);
