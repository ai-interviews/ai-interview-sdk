// const NO_COVERAGE = process.env.NO_COVERAGE === '1';
// const CLEAR_CONSOLE = process.env.CLEAR_CONSOLE === '1';

// const notice = () => console.log('Using Jest config from `jest.config.js`');

// if (CLEAR_CONSOLE) {
//   require('clear')();
//   console.log();
//   notice();
//   console.log('Clearing console due to CLEAR_CONSOLE=1');
// } else {
//   notice();
// }

// if (NO_COVERAGE) {
//   console.log('Coverage not collected due to NO_COVERAGE=1');
// }

// console.log('Type checking is disabled during Jest for performance reasons, use `jest typecheck` when necessary.');

module.exports = {
  rootDir: '/Users/ralph/Desktop/Code/intern_project_proto/sdk',
  roots: ['<rootDir>'],
  cache: true,
  verbose: true,
  cacheDirectory: '<rootDir>/tmp/jest',
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],
  testMatch: ['**/__tests__/*.test.(ts|tsx)'],
  testPathIgnorePatterns: ['/node_modules/', '/tmp/', '/coverage/', '/stories/', '/\\.storybook/'],
  watchPathIgnorePatterns: ['/node_modules/'],
  automock: false,
  unmockedModulePathPatterns: ['/node_modules/'],
  collectCoverage: true,
  collectCoverageFrom: ['**/*.{ts,tsx}', '!**/*.d.ts', '!**/node_modules/**'],
  coveragePathIgnorePatterns: ['/node_modules/', '\\.json$', '/__tests__/', '/stories/', '/\\.storybook/'],
  transformIgnorePatterns: ['/node_modules/(?!(lodash-es|antd|[^/]+/es|rc-animate|rc-util)/).*'],
  transform: {
    '\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: '/Users/ralph/Desktop/Code/intern_project_proto/sdk/tsconfig.json',
        diagnostics: false,
        isolatedModules: true,
      },
    ],
    '/node_modules/((lodash-es|[^/]+/es)|rc-animate|rc-util)/.*': [
      'ts-jest',
      {
        tsconfig: '/Users/ralph/Desktop/Code/intern_project_proto/sdk/tsconfig.json',
        diagnostics: false,
        isolatedModules: true,
      },
    ],
  },
  preset: 'ts-jest',
};
