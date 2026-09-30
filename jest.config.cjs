module.exports = {
    testEnvironment: 'node',
    transform: {
        '^.+\\.js$': 'babel-jest',
    },
    testMatch: ['**/Tests/**/*.test.js'],
    clearMocks: true,
    setupFiles: ['<rootDir>/src/Tests/TestSetup.js'],
    collectCoverageFrom: [
        'src/Logic/Services/**/*.js',
        'src/Data Access/Repositories/**/*.js',
        'src/Presentation/Controllers/**/*.js',
        'src/Logic/Monads/**/*.js',
        'src/Helpers/**/*.js',
    ],
};