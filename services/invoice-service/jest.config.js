module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleNameMapper: {
    '^application/(.*)$': '<rootDir>/src/application/$1',
    '^api/(.*)$': '<rootDir>/src/api/$1',
    '^domain/(.*)$': '<rootDir>/src/domain/$1'
  }
};
