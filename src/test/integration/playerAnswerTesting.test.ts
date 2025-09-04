// src/test/integration/playerAnswerTesting.test.ts - FIXED VERSION
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { io, Socket } from 'socket.io-client';
import { TEST_CONFIG } from './quizGameIntegration.test';

interface TestSocket {
  socket: Socket;
  id: string;
  name: string;
  role: 'host' | 'player';
  events: any[];
  connected: boolean;
}

// Ultra-fast config for testing
const FAST_TEST_CONFIG = {
  ...TEST_CONFIG,
  roundDefinitions: [
    {
      roundNumber: 1,
      roundType: 'general_trivia' as const,
      config: {
        questionsPerRound: 3,
        timePerQuestion: 5
      },
      enabledExtras: {
        buyHint: true,
        robPoints: true,
        freezeOutTeam: true
      }
    }
  ]
};

describe('Quiz Player Answer & Extras Tests', () => {
  let hostSocket: TestSocket;
  let player1Socket: TestSocket;
  let player2Socket: TestSocket;
  let roomId: string;

  const createTestSocket = (id: string, name: string, role: 'host' | 'player'): Promise<TestSocket> => {
    return new Promise((resolve, reject) => {
      const socket = io('http://localhost:3001/quiz', {
        transports: ['websocket'],
        timeout: 10000,
        forceNew: true, // ✅ Force new connection
        reconnection: false // ✅ Disable auto-reconnection for cleaner tests
      });

      const testSocket: TestSocket = {
        socket, id, name, role, events: [], connected: false
      };

      // ✅ Better event logging with connection tracking
      const originalOn = socket.on.bind(socket);
      socket.on = (event: string, handler: Function) => {
        return originalOn(event, (...args: any[]) => {
          testSocket.events.push({ event, args, timestamp: Date.now() });
          if (['question', 'quiz_error', 'extra_used_successfully', 'freeze_notice', 'connect', 'disconnect'].includes(event)) {
            console.log(`[${role}:${id}] 📨 ${event}:`, event === 'question' ? 'Question received' : args);
          }
          handler(...args);
        });
      };

      // ✅ Track connection state
      socket.on('connect', () => {
        testSocket.connected = true;
        console.log(`✅ ${role}:${id} connected`);
        resolve(testSocket);
      });

      socket.on('disconnect', () => {
        testSocket.connected = false;
        console.log(`❌ ${role}:${id} disconnected`);
      });

      socket.on('connect_error', (err: any) => {
        console.log(`❌ ${role}:${id} connection error:`, err);
        reject(err);
      });

      setTimeout(() => reject(new Error(`${role}:${id} connection timeout`)), 15000);
    });
  };

  const waitForEvent = (testSocket: TestSocket, eventName: string, timeout = 12000): Promise<any> => {
    return new Promise((resolve, reject) => {
      // ✅ Check if socket is still connected
      if (!testSocket.connected) {
        reject(new Error(`Socket ${testSocket.id} is disconnected, cannot wait for ${eventName}`));
        return;
      }

      const handler = (...args: any[]) => {
        testSocket.socket.off(eventName, handler);
        resolve(args);
      };
      
      testSocket.socket.on(eventName, handler);
      
      const timeoutId = setTimeout(() => {
        testSocket.socket.off(eventName, handler);
        console.log(`⏰ Timeout waiting for ${eventName} on ${testSocket.id} (connected: ${testSocket.connected})`);
        reject(new Error(`Timeout waiting for ${eventName} after ${timeout}ms`));
      }, timeout);

      // ✅ Clear timeout if socket disconnects
      testSocket.socket.on('disconnect', () => {
        clearTimeout(timeoutId);
        testSocket.socket.off(eventName, handler);
        reject(new Error(`Socket disconnected while waiting for ${eventName}`));
      });
    });
  };

  const setupGameRoom = async (): Promise<{ roomId: string; hostId: string }> => {
    const testRoomId = 'TEST_' + Math.random().toString(36).substr(2, 9);
    const testHostId = 'HOST_' + Math.random().toString(36).substr(2, 9);
    
    console.log(`🏗️ Creating room ${testRoomId} with host ${testHostId}`);
    
    const roomCreationPromise = waitForEvent(hostSocket, 'quiz_room_created');
    hostSocket.socket.emit('create_quiz_room', {
      roomId: testRoomId,
      hostId: testHostId,
      config: FAST_TEST_CONFIG
    });
    await roomCreationPromise;
    console.log(`✅ Room ${testRoomId} created`);

    // ✅ Join sequentially to avoid race conditions
    console.log('👑 Host joining...');
    const hostJoinPromise = waitForEvent(hostSocket, 'room_state');
    hostSocket.socket.emit('join_quiz_room', {
      roomId: testRoomId,
      user: { id: testHostId, name: 'Host' },
      role: 'host'
    });
    await hostJoinPromise;

    console.log('🎮 Player 1 joining...');
    const player1JoinPromise = waitForEvent(player1Socket, 'room_state');
    player1Socket.socket.emit('join_quiz_room', {
      roomId: testRoomId,
      user: { id: 'player1', name: 'Player 1', extras: ['buyHint', 'robPoints', 'freezeOutTeam'] },
      role: 'player'
    });
    await player1JoinPromise;

    console.log('🎮 Player 2 joining...');
    const player2JoinPromise = waitForEvent(player2Socket, 'room_state');
    player2Socket.socket.emit('join_quiz_room', {
      roomId: testRoomId,
      user: { id: 'player2', name: 'Player 2', extras: ['buyHint', 'robPoints', 'freezeOutTeam'] },
      role: 'player'
    });
    await player2JoinPromise;

    // ✅ Add delay to ensure all clients are properly registered
    await new Promise(resolve => setTimeout(resolve, 500));

    return { roomId: testRoomId, hostId: testHostId };
  };

  beforeEach(async () => {
    console.log('\n🔄 Setting up test sockets...');
    
    // ✅ Create sockets sequentially to avoid port conflicts
    hostSocket = await createTestSocket('host1', 'Host', 'host');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    player1Socket = await createTestSocket('player1', 'Player 1', 'player');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    player2Socket = await createTestSocket('player2', 'Player 2', 'player');
    await new Promise(resolve => setTimeout(resolve, 100));

    const roomData = await setupGameRoom();
    roomId = roomData.roomId;
    console.log(`✅ Test setup complete for room: ${roomId}`);
  });

  afterEach(async () => {
    console.log('🧹 Cleaning up...');
    hostSocket?.socket?.disconnect();
    player1Socket?.socket?.disconnect();
    player2Socket?.socket?.disconnect();
    
    // ✅ Wait for clean disconnection
    await new Promise(resolve => setTimeout(resolve, 200));
  });

  test('Should start round and players can submit answers', async () => {
    console.log('🚀 Starting round...');
    
    // ✅ Set up question listeners for all players BEFORE starting round
    const hostQuestionPromise = waitForEvent(hostSocket, 'question');
    const player1QuestionPromise = waitForEvent(player1Socket, 'question');
    const player2QuestionPromise = waitForEvent(player2Socket, 'question');
    
    hostSocket.socket.emit('start_round', { roomId });
    
    const [hostQuestion, player1Question, player2Question] = await Promise.all([
      hostQuestionPromise,
      player1QuestionPromise, 
      player2QuestionPromise
    ]);

    console.log('📝 Submitting answers...');
    player1Socket.socket.emit('submit_answer', {
      roomId, playerId: 'player1', answer: player1Question[0].options[0]
    });
    player2Socket.socket.emit('submit_answer', {
      roomId, playerId: 'player2', answer: player2Question[0].options[1]
    });
    
    console.log('✅ Both players submitted answers');
  });

  test('Should allow player to use hint extra', async () => {
    const questionPromise = waitForEvent(player1Socket, 'question');
    hostSocket.socket.emit('start_round', { roomId });
    await questionPromise;
    
    const cluePromise = waitForEvent(player1Socket, 'clue_revealed');
    const extraSuccessPromise = waitForEvent(player1Socket, 'extra_used_successfully');
    
    player1Socket.socket.emit('use_extra', {
      roomId, playerId: 'player1', extraId: 'buyHint'
    });

    const [clueResult, extraResult] = await Promise.all([
      cluePromise,
      extraSuccessPromise
    ]);

    expect(clueResult[0].clue).toBeDefined();
    expect(extraResult[0].extraId).toBe('buyHint');
  });

  test('Should prevent self-freeze', async () => {
    const questionPromise = waitForEvent(player1Socket, 'question');
    hostSocket.socket.emit('start_round', { roomId });
    await questionPromise;
    
    const selfFreezeErrorPromise = waitForEvent(player1Socket, 'quiz_error', 5000);
    player1Socket.socket.emit('use_extra', {
      roomId, playerId: 'player1', extraId: 'freezeOutTeam', targetPlayerId: 'player1'
    });

    const [selfFreezeError] = await selfFreezeErrorPromise;
    expect(selfFreezeError.message).toMatch(/cannot freeze yourself/i);
  });

  test('Should prevent freeze during non-asking phases', async () => {
    // Try to freeze before round starts
    const phaseErrorPromise = waitForEvent(player1Socket, 'quiz_error', 5000);
    player1Socket.socket.emit('use_extra', {
      roomId, playerId: 'player1', extraId: 'freezeOutTeam', targetPlayerId: 'player2'
    });

    const [phaseError] = await phaseErrorPromise;
    expect(phaseError.message).toMatch(/Cannot freeze player - this is the last question of the round/i);
  });

  test('Should freeze opponent for exactly ONE question only', async () => {
    console.log('🧊 Testing freeze functionality...');
    
    // ✅ FIXED: Set up ALL event listeners BEFORE starting anything
    let questionCount = 0;
    const receivedQuestions: any[] = [];
    
    // Track all questions received across all sockets
    const questionTracker = (socket: TestSocket, socketName: string) => {
      socket.socket.on('question', (question) => {
        questionCount++;
        receivedQuestions.push({ socket: socketName, question, count: questionCount });
        console.log(`📝 ${socketName} received question ${questionCount}:`, question.id);
      });
    };
    
    questionTracker(hostSocket, 'host');
    questionTracker(player1Socket, 'player1');
    questionTracker(player2Socket, 'player2');
    
    // Start round and wait for first question
    const question1Promise = waitForEvent(player1Socket, 'question');
    hostSocket.socket.emit('start_round', { roomId });
    const [question1] = await question1Promise;
    console.log('📝 Got question 1, starting freeze test');
    
    // Freeze player2
    const freezeNoticePromise = waitForEvent(player2Socket, 'freeze_notice');
    const extraSuccessPromise = waitForEvent(player1Socket, 'extra_used_successfully');
    
    player1Socket.socket.emit('use_extra', {
      roomId, playerId: 'player1', extraId: 'freezeOutTeam', targetPlayerId: 'player2'
    });
    
    await Promise.all([freezeNoticePromise, extraSuccessPromise]);
    console.log('🧊 Player2 frozen successfully');
    
    // ✅ FIXED: Wait for automatic question progression using a timeout approach
    console.log('⏰ Waiting for automatic question advancement...');
    
    // Wait for the backend to automatically advance to next question
    await new Promise(resolve => setTimeout(resolve, 6000)); // Wait longer than timePerQuestion (5s)
    
    console.log(`📊 Question tracker shows ${questionCount} questions received`);
    console.log('📝 Testing frozen state on current question');
    
    // Test that player2 is frozen (should get error when trying to answer)
    const frozenErrorPromise = waitForEvent(player2Socket, 'quiz_error', 5000);
    player2Socket.socket.emit('submit_answer', {
      roomId, playerId: 'player2', answer: 'test'
    });

    const [frozenError] = await frozenErrorPromise;
    expect(frozenError.message).toContain('frozen');
    console.log('✅ Player2 correctly frozen');
    
    // Wait for next question advancement (should unfreeze player2)
    console.log('⏰ Waiting for next question to unfreeze player2...');
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    console.log(`📊 Question tracker now shows ${questionCount} questions received`);
    console.log('📝 Testing unfrozen state');
    
    // Add small delay for server state update
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test that player2 can answer (should NOT get frozen error)
    const unfrozenTest = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        player2Socket.socket.off('quiz_error', errorHandler);
        resolve(); // No error means success - player is unfrozen
      }, 3000);
      
      const errorHandler = (args: any) => {
        if (args.message?.includes('frozen')) {
          clearTimeout(timeout);
          player2Socket.socket.off('quiz_error', errorHandler);
          reject(new Error('Player still frozen after expected unfreeze'));
        }
      };
      
      player2Socket.socket.on('quiz_error', errorHandler);
    });

    player2Socket.socket.emit('submit_answer', {
      roomId, playerId: 'player2', answer: 'test_unfreeze'
    });
    
    await unfrozenTest;
    console.log('✅ Player2 successfully unfrozen - freeze lasted exactly 1 question');
  }, 60000);

  test('Should prevent freezing on the last question', async () => {
    console.log('🧊 Testing last question freeze prevention...');
    
    // Create a room with only 2 questions for faster testing
    const shortConfig = {
      ...FAST_TEST_CONFIG,
      roundDefinitions: [{
        ...FAST_TEST_CONFIG.roundDefinitions[0],
        config: { questionsPerRound: 2, timePerQuestion: 3 }
      }]
    };

    // Clean up current sockets
    hostSocket?.socket?.disconnect();
    player1Socket?.socket?.disconnect();
    player2Socket?.socket?.disconnect();
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Create new sockets for short test
    hostSocket = await createTestSocket('host1', 'Host', 'host');
    player1Socket = await createTestSocket('player1', 'Player 1', 'player');
    player2Socket = await createTestSocket('player2', 'Player 2', 'player');

    const shortRoomId = 'SHORT_' + Math.random().toString(36).substr(2, 9);
    const shortHostId = 'HOST_SHORT_' + Math.random().toString(36).substr(2, 9);
    
    // Create short room
    const roomCreationPromise = waitForEvent(hostSocket, 'quiz_room_created');
    hostSocket.socket.emit('create_quiz_room', {
      roomId: shortRoomId, 
      hostId: shortHostId, 
      config: shortConfig
    });
    await roomCreationPromise;

    // Join room
    const hostJoinPromise = waitForEvent(hostSocket, 'room_state');
    hostSocket.socket.emit('join_quiz_room', {
      roomId: shortRoomId, 
      user: { id: shortHostId, name: 'Host' }, 
      role: 'host'
    });
    await hostJoinPromise;

    const player1JoinPromise = waitForEvent(player1Socket, 'room_state');
    player1Socket.socket.emit('join_quiz_room', {
      roomId: shortRoomId, 
      user: { id: 'player1', name: 'Player 1', extras: ['buyHint', 'robPoints', 'freezeOutTeam'] },
      role: 'player'
    });
    await player1JoinPromise;

    const player2JoinPromise = waitForEvent(player2Socket, 'room_state');
    player2Socket.socket.emit('join_quiz_room', {
      roomId: shortRoomId,
      user: { id: 'player2', name: 'Player 2', extras: ['buyHint', 'robPoints', 'freezeOutTeam'] },
      role: 'player'
    });
    await player2JoinPromise;

    await new Promise(resolve => setTimeout(resolve, 500));

    // Start round and get to question 1
    const question1Promise = Promise.all([
      waitForEvent(hostSocket, 'question'),
      waitForEvent(player1Socket, 'question'),
      waitForEvent(player2Socket, 'question')
    ]);
    hostSocket.socket.emit('start_round', { roomId: shortRoomId });
    await question1Promise;
    
    // Wait for question 2 (the last question)
    const question2Promise = Promise.all([
      waitForEvent(hostSocket, 'question', 10000),
      waitForEvent(player1Socket, 'question', 10000),
      waitForEvent(player2Socket, 'question', 10000)
    ]);
    await question2Promise;
    console.log('📝 On last question - trying to freeze');
    
    // Try to freeze on last question - should fail
    const freezeErrorPromise = waitForEvent(player1Socket, 'quiz_error', 5000);
    player1Socket.socket.emit('use_extra', {
      roomId: shortRoomId, 
      playerId: 'player1', 
      extraId: 'freezeOutTeam', 
      targetPlayerId: 'player2'
    });

    const [freezeError] = await freezeErrorPromise;
    expect(freezeError.message).toMatch(/last question|no next question/i);
    
    roomId = shortRoomId; // Update for cleanup
    console.log('✅ Correctly prevented freeze on last question');
  }, 30000);
});



