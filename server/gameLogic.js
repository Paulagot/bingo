import { AUTO_CALL_INTERVAL } from './config.js';

let autoPlayIntervals = new Map();

export function clearAutoPlayInterval(roomId) {
  if (autoPlayIntervals.has(roomId)) {
    clearInterval(autoPlayIntervals.get(roomId));
    autoPlayIntervals.delete(roomId);
  }
}

export function startAutoPlay(roomId, room, io) {
  if (!room) return;

  clearAutoPlayInterval(roomId);

  const intervalId = setInterval(() => {
    if (!room.gameStarted || !room.autoPlay) {
      clearAutoPlayInterval(roomId);
      return;
    }

    callNextNumber(room, roomId, io);
  }, AUTO_CALL_INTERVAL);

  autoPlayIntervals.set(roomId, intervalId);
}

export function callNextNumber(room, roomId, io) {
  const availableNumbers = Array.from({ length: 75 }, (_, i) => i + 1)
    .filter(num => !room.calledNumbers.includes(num));
  
  if (availableNumbers.length === 0) {
    clearAutoPlayInterval(roomId);
    return null;
  }
  
  const randomIndex = Math.floor(Math.random() * availableNumbers.length);
  const newNumber = availableNumbers[randomIndex];
  
  room.currentNumber = newNumber;
  room.calledNumbers.push(newNumber);
  
  io.to(roomId).emit('number_called', {
    currentNumber: newNumber,
    calledNumbers: room.calledNumbers
  });

  return newNumber;
}