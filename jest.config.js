module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    roots: ["<rootDir>/src"],
    testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
    moduleFileExtensions: ["ts", "js", "json"],
    
    // CRITICAL: Run tests sequentially to prevent database conflicts
    maxWorkers: 1,
    
    // Setup files
    setupFilesAfterEnv: ["<rootDir>/src/tests/setup.ts"],
    
    // Timeouts
    testTimeout: 30000,
    
    // Transform
    transform: {
        "^.+\\.tsx?$": [
            "ts-jest",
            {
                tsconfig: {
                    esModuleInterop: true,
                    allowSyntheticDefaultImports: true,
                },
            },
        ],
    },
    
    // Bail on first failure (helps identify cascade failures)
    bail: false,
    
    // Verbose output
    verbose: true,
    
    // Coverage
    collectCoverageFrom: [
        "src/**/*.ts",
        "!src/**/*.spec.ts",
        "!src/**/*.test.ts",
        "!src/**/tests/**",
    ],
};