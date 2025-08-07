import type { Config } from 'jest';
import { defaults } from 'jest-config';

const config: Config = {
  moduleFileExtensions: [...defaults.moduleFileExtensions, 'mts'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  verbose: true,
  coverageDirectory: 'coverage',
  collectCoverage: true,
  testPathIgnorePatterns: ['/node_modules'],
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },
  testMatch: ['<rootDir>/src/**/test/*.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/test/*.ts?(x)',
    '!**/node_modules/**',
    '!src/test-env-config.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 7,
      functions: 7,
      lines: 7,
      statements: 7,
    },
  },
  coverageReporters: ['text-summary', 'lcov'],
  moduleNameMapper: {
    '@global/(.*)': ['<rootDir>/src/shared/globals/$1'],
    '@services/(.*)': ['<rootDir>/src/shared/services/$1'],
    '@socket/(.*)': ['<rootDir>/src/shared/sockets/$1'],
    '@root/(.*)': ['<rootDir>/src/$1'],
  },
  setupFilesAfterEnv: ['<rootDir>/src/test-env-config.ts'],
};

export default config;
