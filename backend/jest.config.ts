import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  clearMocks: true,
  coverageThreshold: {
    // Global floor — catch major regressions
    global: {
      statements: 50,
      branches: 25,
      functions: 40,
      lines: 50,
    },
    // Strict thresholds on well-tested files
    './src/services/bookService.ts': {
      statements: 80,
      branches: 80,
      functions: 75,
      lines: 80,
    },
    './src/services/geminiService.ts': {
      statements: 50,
      branches: 30,
      functions: 80,
      lines: 50,
    },
    './src/services/googleBooksService.ts': {
      statements: 30,
      branches: 40,
      functions: 30,
      lines: 30,
    },
  },
};

export default config;
