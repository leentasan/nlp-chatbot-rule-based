// jest.config.js - Jest Test Configuration
module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],

  // Test timeout (increased for integration tests)
  testTimeout: 10000,

  // Coverage settings
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary', 
    'lcov',
    'html',
    'json'
  ],

  // Files to include in coverage
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/whatsapp.js', // Exclude WhatsApp integration
    '!src/index.js',    // Exclude CLI interface
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/tests/**'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/bot.js': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/utils/nlpHelper.js': {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js'
  ],

  // Module paths
  moduleDirectories: [
    'node_modules',
    'src'
  ],

  // File ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/data/',
    '/backups/',
    '/exports/'
  ],

  // Verbose output for detailed test results
  verbose: true,

  // Detect open handles (useful for debugging)
  detectOpenHandles: false,

  // Force exit after tests complete
  forceExit: true,

  // Clear mocks between tests
  clearMocks: true,

  // Reset mocks between tests
  resetMocks: false,

  // Restore mocks between tests
  restoreMocks: true,

  // Test result processor for custom formatting
  // testResultsProcessor: '<rootDir>/tests/results-processor.js',

  // Global test configuration
  globals: {
    'ts-jest': {
      useESM: false
    }
  },

  // Transform configuration (if needed for TypeScript or modern JS)
  transform: {},

  // Module name mapping for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },

  // Reporters configuration
  reporters: [
    'default',
    [
      'jest-html-reporters', 
      {
        publicPath: './coverage',
        filename: 'test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'ScheduleBot Test Report',
        logoImgPath: undefined,
        includeFailureMsg: true,
        includeSuiteFailure: true
      }
    ]
  ],

  // Test sequencer for custom test ordering
  // testSequencer: '<rootDir>/tests/test-sequencer.js',

  // Maximum worker processes
  maxWorkers: '50%',

  // Bail after first test failure (useful for CI)
  bail: false,

  // Silent mode (reduce console output during tests)
  silent: false,

  // Error on deprecated features
  errorOnDeprecated: true,

  // Notify mode for watch runs
  notify: false,

  // Watch mode ignore patterns
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/data/',
    '/backups/',
    '/exports/'
  ]
};