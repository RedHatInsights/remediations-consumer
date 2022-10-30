module.exports = {
    coverageDirectory: 'artifacts/coverage',
    testEnvironment: 'node',
    preset: 'ts-jest',
    // reporters: ['default', ['jest-junit', {JEST_JUNIT_OUTPUT_DIR: 'artifacts'}]],
    reporters: ['default', ['jest-junit', {outputDirectory: 'artifacts', outputName: 'junit.xml'}]],
    testMatch: ['**/?(*.)+(unit|integration).ts']
};
