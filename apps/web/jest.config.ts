import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  dir: './',
});

const config: Config = {
  testEnvironment: 'jest-environment-jsdom',
  testMatch: ['<rootDir>/tests/unit/**/*.test.ts', '<rootDir>/tests/unit/**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@gutachten/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],
  clearMocks: true,
};

export default createJestConfig(config);
