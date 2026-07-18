/** @type {import('jest').Config} */
module.exports = {
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testEnvironment: 'node',
  testMatch: [
    '**/src/security/__tests__/**/*.test.ts',
    '**/services/__tests__/**/*.test.ts',
  ],
};
