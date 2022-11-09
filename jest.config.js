module.exports = {
    coverageDirectory: 'artifacts/coverage',
    testEnvironment: 'node',
    preset: 'ts-jest',
    roots: ['src'],
    reporters: ['default', ['jest-junit', {outputDirectory: 'artifacts', outputName: 'junit-remediations.xml'}]],
    testMatch: ['**/?(*.)+(unit|integration).ts']
};
