module.exports = {
    coverageDirectory: 'coverage',
    testEnvironment: 'node',

    testMatch: [
        '**/?(*.)+(unit|integration).ts'
    ],

    transform: {
        '^.+\\.tsx?$': 'ts-jest'
    }
};
