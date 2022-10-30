module.exports = {
    coverageDirectory: 'artifacts/coverage',
    testEnvironment: 'node',
    preset: 'ts-jest',
    reporters: ['default', 'jest-junit'],
    testMatch: ['**/?(*.)+(unit|integration).ts']
};
