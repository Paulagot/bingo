//server/quiz/gameplayEngines/services/QuestionEmissionService.js
export class QuestionEmissionService {
  static emitQuestionToPlayer(socket, room, question, recoveryState = null) {
    const roundConfig = room.config.roundDefinitions[room.currentRound - 1];
    const timeLimit = roundConfig?.config?.timePerQuestion || 25;
    
    const questionData = {
      id: question.id,
      text: question.text,
      options: question.options || [],
      timeLimit,
      questionStartTime: room.questionStartTime,
      questionNumber: room.currentQuestionIndex + 1,
      totalQuestions: room.questions.length,
      currentQuestionIndex: room.currentQuestionIndex
    };
    
    socket.emit('question', questionData);
    
    // If recovery state provided, emit it separately
    if (recoveryState) {
      socket.emit('player_state_recovery', recoveryState);
    }
  }
}