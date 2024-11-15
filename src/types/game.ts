export interface BingoCell {
  number: number;
  marked: boolean;
}

export interface GameState {
  card: BingoCell[];
  calledNumbers: number[];
  currentNumber: number | null;
  hasWon: boolean;
}

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  card: BingoCell[] | null;
}

export interface RoomState {
  players: Player[];
  gameStarted: boolean;
  currentNumber: number | null;
  calledNumbers: number[];
  autoPlay: boolean;
  winnerId: string | null;
}