// src/features/quiz/index.ts
// Barrel export for quiz feature

export * from './model';

// Re-export components for backward compatibility during migration
export { default as QuizRoutes } from '../../components/Quiz/QuizRoutes';
export { QuizSocketProvider } from '../../components/Quiz/sockets/QuizSocketProvider';

