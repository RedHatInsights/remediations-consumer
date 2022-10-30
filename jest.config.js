module.exports = {
    coverageDirectory: 'artifacts/coverage',
    testEnvironment: 'node',
    preset: 'ts-jest',
    // reporters: ['default', ['jest-junit', {JEST_JUNIT_OUTPUT_DIR: 'artifacts'}]],
    reporters: ['default', ['jest-junit', {outputDirectory: 'artifacts'}]],
    testMatch: ['**/?(*.)+(unit|integration).ts']
};
