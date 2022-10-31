module.exports = {
    coverageDirectory: 'artifacts/coverage',
    testEnvironment: 'node',
    preset: 'ts-jest',
    reporters: ['default', ['jest-junit', {outputDirectory: 'artifacts', outputName: 'junit-remediations_consumer.xml'}]],
    testMatch: ['**/?(*.)+(unit|integration).ts']
};
