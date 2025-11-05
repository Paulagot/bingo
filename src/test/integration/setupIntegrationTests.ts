// src/test/integration/setupIntegrationTests.ts
import '@testing-library/jest-dom';

// DO NOT mock socket.io-client for integration tests
// We want to use the real socket connections

console.log('🔌 Integration test setup - using REAL socket.io connections');