module.exports = {
    coverageDirectory: 'coverage',
    testEnvironment: 'node',
    preset: 'ts-jest',
    modulePathIgnorePatterns: ['<rootDir>/package.json'],
    testMatch: ['**/?(*.)+(unit|integration).ts']
};
