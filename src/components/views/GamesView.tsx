import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../contexts/AppContext';
import { ArrowLeft, Trophy } from 'lucide-react';

export function GamesView() {
  const { games, setCurrentView, setSelectedGame } = useApp();

  const handleGameClick = (game: typeof games[0]) => {
    setSelectedGame(game);
    setCurrentView('game');
  };

  return (
    <div className="px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-['Orbitron'] text-white flex items-center gap-3">
          <span className="text-4xl">🎮</span>
          Play & Earn
        </h1>
        <p className="text-purple-300 mt-2">Complete games to earn 4-8 points!</p>
      </div>

      {/* Daily Challenge */}
      <div className="glass-card p-4 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 text-6xl opacity-30">🏆</div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="text-gold-400" size={24} />
            <h3 className="text-white font-bold text-lg">Daily Challenge</h3>
            <span className="badge-gold text-purple-900">+10 BONUS</span>
          </div>
          <p className="text-gray-400 text-sm mb-4">Complete today's challenge for extra rewards!</p>
          <button className="btn-neon-gold w-full">Start Challenge</button>
        </div>
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-2 gap-4">
        {games.map((game) => (
          <div
            key={game.id}
            onClick={() => handleGameClick(game)}
            className="game-card aspect-square"
          >
            <div className="game-icon text-5xl">{game.icon}</div>
            <h3 className="text-white font-bold text-center">{game.name}</h3>
            <p className="text-gray-400 text-xs text-center">{game.description}</p>
            <div className="flex items-center justify-center gap-1 mt-2">
              <span className="text-gold-400 text-sm font-bold">{game.reward_range_min}-{game.reward_range_max}</span>
              <span className="text-gray-400 text-xs">pts</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GamePlayView() {
  const { selectedGame, setCurrentView, addPoints, haptic } = useApp();

  if (!selectedGame) {
    setCurrentView('games');
    return null;
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="glass-card rounded-none p-4 flex items-center gap-4">
        <button
          onClick={() => setCurrentView('games')}
          className="text-white p-2 rounded-full bg-white/10"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <h2 className="text-white font-bold text-xl flex items-center gap-2">
            <span className="text-3xl">{selectedGame.icon}</span>
            {selectedGame.name}
          </h2>
        </div>
        <div className="text-right">
          <p className="text-gold-400 font-bold text-lg">+{selectedGame.reward_range_min}-{selectedGame.reward_range_max}</p>
          <p className="text-gray-400 text-xs">points</p>
        </div>
      </div>

      {/* Game Area */}
      <div className="flex-1 overflow-auto">
        {selectedGame.game_type === '2048' && <Game2048 />}
        {selectedGame.game_type === 'memory' && <GameMemory />}
        {selectedGame.game_type === 'color' && <GameColorMatch />}
        {selectedGame.game_type === 'blocks' && <GameBlockPuzzle />}
        {selectedGame.game_type === 'sudoku' && <GameSudoku />}
        {selectedGame.game_type === 'connect' && <GameTileConnect />}
        {selectedGame.game_type === 'maze' && <GameMaze />}
      </div>
    </div>
  );
}

function Game2048() {
  const [grid, setGrid] = useState<number[][]>(() => initializeGrid());
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const { addPoints, setCurrentView, haptic } = useApp();

  const gridRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  function initializeGrid(): number[][] {
    const newGrid = Array(4).fill(null).map(() => Array(4).fill(0));
    addRandomTile(newGrid);
    addRandomTile(newGrid);
    return newGrid;
  }

  function addRandomTile(grid: number[][]) {
    const emptyCells: [number, number][] = [];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (grid[i][j] === 0) emptyCells.push([i, j]);
      }
    }
    if (emptyCells.length > 0) {
      const [i, j] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      grid[i][j] = Math.random() < 0.9 ? 2 : 4;
    }
  }

  function move(direction: 'up' | 'down' | 'left' | 'right') {
    if (gameOver) return;

    const newGrid = JSON.parse(JSON.stringify(grid));
    let moved = false;
    let points = 0;

    const rotateGrid = (times: number) => {
      let rotated = newGrid;
      for (let t = 0; t < times; t++) {
        const result = Array(4).fill(null).map(() => Array(4).fill(0));
        for (let i = 0; i < 4; i++) {
          for (let j = 0; j < 4; j++) {
            result[j][3 - i] = rotated[i][j];
          }
        }
        rotated = result;
      }
      return rotated;
    };

    const slideLeft = (g: number[][]) => {
      const grid = g.map(row => {
        const filtered = row.filter(cell => cell !== 0);
        const merged: number[] = [];
        const result: number[] = [];

        for (let i = 0; i < filtered.length; i++) {
          if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
            merged.push(filtered[i] * 2);
            points += filtered[i] * 2;
            i++;
          } else {
            merged.push(filtered[i]);
          }
        }

        while (merged.length < 4) merged.push(0);
        return merged;
      });
      return grid;
    };

    const rotations = { left: 0, down: 1, right: 2, up: 3 };
    const rotatedGrid = rotateGrid(rotations[direction]);
    const slidedGrid = slideLeft(rotatedGrid);
    const finalGrid = rotateGrid((4 - rotations[direction]) % 4);

    // Check if moved
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (finalGrid[i][j] !== grid[i][j]) {
          moved = true;
          break;
        }
      }
    }

    if (moved) {
      addRandomTile(finalGrid);
      setGrid(finalGrid);
      setScore(score + points);
      haptic('light');

      // Check for game over
      if (!canMove(finalGrid)) {
        setGameOver(true);
        const reward = Math.floor(Math.random() * 5) + 4;
        addPoints(reward);
        haptic('success');
      }
    }
  }

  function canMove(grid: number[][]): boolean {
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (grid[i][j] === 0) return true;
        if (i < 3 && grid[i][j] === grid[i + 1][j]) return true;
        if (j < 3 && grid[i][j] === grid[i][j + 1]) return true;
      }
    }
    return false;
  }

  // Handle touch
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current) return;

      const deltaX = e.changedTouches[0].clientX - touchStart.current.x;
      const deltaY = e.changedTouches[0].clientY - touchStart.current.y;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        move(deltaX > 0 ? 'right' : 'left');
      } else {
        move(deltaY > 0 ? 'down' : 'up');
      }

      touchStart.current = null;
    };

    const el = gridRef.current;
    if (el) {
      el.addEventListener('touchstart', handleTouchStart);
      el.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      if (el) {
        el.removeEventListener('touchstart', handleTouchStart);
        el.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [grid, gameOver]);

  // Handle keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': move('up'); break;
        case 'ArrowDown': move('down'); break;
        case 'ArrowLeft': move('left'); break;
        case 'ArrowRight': move('right'); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [grid, gameOver]);

  const getTileClass = (value: number) => {
    if (value === 0) return 'bg-white/5';
    return `tile-${value}`;
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 h-full">
      {/* Score */}
      <div className="text-center mb-4">
        <p className="text-gray-400 text-sm">Score</p>
        <p className="text-3xl font-bold text-gold-400">{score}</p>
      </div>

      {/* Grid */}
      <div ref={gridRef} className="grid-game grid-cols-4 w-full max-w-xs">
        {grid.map((row, i) =>
          row.map((cell, j) => (
            <div
              key={`${i}-${j}`}
              className={`grid-cell aspect-square text-xl font-bold ${getTileClass(cell)}`}
            >
              {cell !== 0 && cell}
            </div>
          ))
        )}
      </div>

      {/* Game Over */}
      {gameOver && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/70 animate-fade-in">
          <div className="modal-content text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-white mb-2">Game Over!</h3>
            <p className="text-gold-400 font-bold text-xl mb-4">Score: {score}</p>
            <div className="flex gap-3">
              <button onClick={() => setCurrentView('games')} className="btn-neon flex-1">
                Back to Games
              </button>
              <button
                onClick={() => {
                  setGrid(initializeGrid());
                  setScore(0);
                  setGameOver(false);
                }}
                className="btn-neon-gold flex-1"
              >
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GameMemory() {
  const [cards, setCards] = useState<string[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const { addPoints, setCurrentView, haptic } = useApp();

  const emojis = ['🧠', '💎', '💰', '🎮', '🏆', '⭐', '🚀', '💫'];

  useEffect(() => {
    initializeGame();
  }, []);

  function initializeGame() {
    const pairs = [...emojis, ...emojis];
    const shuffled = pairs.sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setGameComplete(false);
  }

  function handleCardClick(index: number) {
    if (flipped.length === 2 || flipped.includes(index) || matched.includes(index)) return;

    haptic('light');
    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(moves + 1);

      setTimeout(() => {
        if (cards[newFlipped[0]] === cards[newFlipped[1]]) {
          setMatched([...matched, ...newFlipped]);
          haptic('success');

          if (matched.length + 2 === cards.length) {
            setGameComplete(true);
            const reward = Math.floor(Math.random() * 5) + 4;
            addPoints(reward);
          }
        }
        setFlipped([]);
      }, 500);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 h-full">
      {/* Moves counter */}
      <div className="text-center mb-4">
        <p className="text-gray-400 text-sm">Moves</p>
        <p className="text-3xl font-bold text-gold-400">{moves}</p>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-4 gap-3 w-full max-w-xs">
        {cards.map((emoji, index) => (
          <button
            key={index}
            onClick={() => handleCardClick(index)}
            className={`aspect-square rounded-xl text-3xl flex items-center justify-center transition-all duration-300 ${
              flipped.includes(index) || matched.includes(index)
                ? 'bg-gradient-to-br from-purple-500 to-blue-500'
                : 'bg-white/10'
            } ${matched.includes(index) ? 'opacity-50' : ''}`}
          >
            {(flipped.includes(index) || matched.includes(index)) ? emoji : '?'}
          </button>
        ))}
      </div>

      {/* Game Complete */}
      {gameComplete && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/70 animate-fade-in">
          <div className="modal-content text-center">
            <div className="text-6xl mb-4">🎊</div>
            <h3 className="text-2xl font-bold text-white mb-2">You Won!</h3>
            <p className="text-gray-400 mb-4">Moves: {moves}</p>
            <div className="flex gap-3">
              <button onClick={() => setCurrentView('games')} className="btn-neon flex-1">
                Back
              </button>
              <button onClick={initializeGame} className="btn-neon-gold flex-1">
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GameColorMatch() {
  const colors = [
    { name: 'Red', hex: '#ef4444' },
    { name: 'Orange', hex: '#f97316' },
    { name: 'Yellow', hex: '#eab308' },
    { name: 'Green', hex: '#22c55e' },
    { name: 'Blue', hex: '#3b82f6' },
    { name: 'Purple', hex: '#a855f7' },
    { name: 'Pink', hex: '#ec4899' },
  ];

  const [targetColor, setTargetColor] = useState<typeof colors[0]>(colors[0]);
  const [options, setOptions] = useState<typeof colors>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameOver, setGameOver] = useState(false);
  const { addPoints, setCurrentView, haptic } = useApp();

  useEffect(() => {
    newRound();
  }, []);

  useEffect(() => {
    if (timeLeft > 0 && !gameOver) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !gameOver) {
      setGameOver(true);
      const reward = Math.floor(Math.random() * 5) + 4;
      addPoints(reward);
    }
  }, [timeLeft, gameOver]);

  function newRound() {
    const target = colors[Math.floor(Math.random() * colors.length)];
    setTargetColor(target);

    const shuffled = [...colors].sort(() => Math.random() - 0.5).slice(0, 4);
    if (!shuffled.find(c => c.hex === target.hex)) {
      shuffled[Math.floor(Math.random() * 4)] = target;
    }
    setOptions(shuffled);
  }

  function handleAnswer(color: typeof colors[0]) {
    if (gameOver) return;

    if (color.hex === targetColor.hex) {
      haptic('success');
      setScore(score + 1);
      newRound();
    } else {
      haptic('error');
    }
  }

  function startGame() {
    setScore(0);
    setTimeLeft(30);
    setGameOver(false);
    newRound();
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 h-full">
      {/* Timer and Score */}
      <div className="flex justify-between w-full max-w-xs mb-6">
        <div className="text-center">
          <p className="text-gray-400 text-sm">Time</p>
          <p className={`text-3xl font-bold ${timeLeft <= 10 ? 'text-red-400' : 'text-white'}`}>
            {timeLeft}s
          </p>
        </div>
        <div className="text-center">
          <p className="text-gray-400 text-sm">Score</p>
          <p className="text-3xl font-bold text-gold-400">{score}</p>
        </div>
      </div>

      {!gameOver && (
        <>
          {/* Target color */}
          <div className="text-center mb-6">
            <p className="text-gray-400 text-sm mb-2">Find this color:</p>
            <div className="text-4xl font-bold text-white">{targetColor.name}</div>
          </div>

          {/* Color options */}
          <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
            {options.map((color, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(color)}
                className="aspect-square rounded-2xl transition-transform hover:scale-105 active:scale-95"
                style={{ backgroundColor: color.hex }}
              />
            ))}
          </div>
        </>
      )}

      {/* Game Over */}
      {gameOver && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/70 animate-fade-in">
          <div className="modal-content text-center">
            <div className="text-6xl mb-4">🎨</div>
            <h3 className="text-2xl font-bold text-white mb-2">Time's Up!</h3>
            <p className="text-gold-400 font-bold text-xl mb-4">Score: {score}</p>
            <div className="flex gap-3">
              <button onClick={() => setCurrentView('games')} className="btn-neon flex-1">
                Back
              </button>
              <button onClick={startGame} className="btn-neon-gold flex-1">
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GameBlockPuzzle() {
  const [grid, setGrid] = useState<number[][]>(() => createEmptyGrid());
  const [currentPiece, setCurrentPiece] = useState<number[][] | null>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const { addPoints, setCurrentView, haptic } = useApp();

  const pieces = [
    [[1]], // Single
    [[1, 1]], // Horizontal line
    [[1], [1]], // Vertical line
    [[1, 1], [1, 1]], // Square
    [[1, 0], [1, 1]], // L-shape
    [[0, 1], [1, 1]], // Reverse L
    [[1, 1, 1]], // Triple horizontal
  ];

  function createEmptyGrid(): number[][] {
    return Array(8).fill(null).map(() => Array(8).fill(0));
  }

  useEffect(() => {
    spawnPiece();
  }, []);

  function spawnPiece() {
    const piece = pieces[Math.floor(Math.random() * pieces.length)];
    setCurrentPiece(piece);
  }

  function canPlace(piece: number[][], startRow: number, startCol: number): boolean {
    for (let i = 0; i < piece.length; i++) {
      for (let j = 0; j < piece[i].length; j++) {
        if (piece[i][j] === 1) {
          const row = startRow + i;
          const col = startCol + j;
          if (row >= 8 || col >= 8 || row < 0 || col < 0) return false;
          if (grid[row][col] === 1) return false;
        }
      }
    }
    return true;
  }

  function placePiece(startRow: number, startCol: number) {
    if (!currentPiece || !canPlace(currentPiece, startRow, startCol)) {
      haptic('error');
      return;
    }

    const newGrid = grid.map(row => [...row]);
    for (let i = 0; i < currentPiece.length; i++) {
      for (let j = 0; j < currentPiece[i].length; j++) {
        if (currentPiece[i][j] === 1) {
          newGrid[startRow + i][startCol + j] = 1;
        }
      }
    }

    // Check for completed rows/cols
    let points = 0;

    // Check rows
    for (let i = 0; i < 8; i++) {
      if (newGrid[i].every(cell => cell === 1)) {
        newGrid[i] = Array(8).fill(0);
        points += 10;
      }
    }

    // Check columns
    for (let j = 0; j < 8; j++) {
      if (newGrid.every(row => row[j] === 1)) {
        for (let i = 0; i < 8; i++) {
          newGrid[i][j] = 0;
        }
        points += 10;
      }
    }

    haptic('success');
    setScore(score + points);
    setGrid(newGrid);
    spawnPiece();

    // Check game over
    let canPlaceAny = false;
    const nextPiece = pieces[Math.floor(Math.random() * pieces.length)];
    for (let i = 0; i < 8 && !canPlaceAny; i++) {
      for (let j = 0; j < 8 && !canPlaceAny; j++) {
        if (canPlaceWithGrid(nextPiece, i, j, newGrid)) {
          canPlaceAny = true;
        }
      }
    }

    if (!canPlaceAny) {
      setGameOver(true);
      const reward = Math.floor(Math.random() * 5) + 4;
      addPoints(reward);
    }
  }

  function canPlaceWithGrid(piece: number[][], startRow: number, startCol: number, testGrid: number[][]): boolean {
    for (let i = 0; i < piece.length; i++) {
      for (let j = 0; j < piece[i].length; j++) {
        if (piece[i][j] === 1) {
          const row = startRow + i;
          const col = startCol + j;
          if (row >= 8 || col >= 8 || row < 0 || col < 0) return false;
          if (testGrid[row][col] === 1) return false;
        }
      }
    }
    return true;
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 h-full">
      {/* Score */}
      <div className="text-center mb-4">
        <p className="text-gray-400 text-sm">Score</p>
        <p className="text-3xl font-bold text-gold-400">{score}</p>
      </div>

      {/* Grid */}
      <div className="grid-game grid-cols-8 gap-1 w-full max-w-xs mb-6">
        {grid.map((row, i) =>
          row.map((cell, j) => (
            <button
              key={`${i}-${j}`}
              onClick={() => {
                // Find top-left most position for this piece
                if (currentPiece) {
                  placePiece(i, j);
                }
              }}
              className={`aspect-square rounded transition-all ${
                cell === 1 ? 'bg-gradient-to-br from-purple-500 to-blue-500' : 'bg-white/10'
              }`}
            />
          ))
        )}
      </div>

      {/* Current Piece */}
      {currentPiece && (
        <div className="glass-card p-4">
          <p className="text-gray-400 text-sm text-center mb-2">Next Piece</p>
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${currentPiece[0].length}, 1fr)` }}>
            {currentPiece.map((row, i) =>
              row.map((cell, j) => (
                <div
                  key={`${i}-${j}`}
                  className={`w-8 h-8 rounded ${
                    cell === 1 ? 'bg-gradient-to-br from-purple-500 to-blue-500' : 'bg-transparent'
                  }`}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Game Over */}
      {gameOver && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/70 animate-fade-in">
          <div className="modal-content text-center">
            <div className="text-6xl mb-4">🧩</div>
            <h3 className="text-2xl font-bold text-white mb-2">Game Over!</h3>
            <p className="text-gold-400 font-bold text-xl mb-4">Score: {score}</p>
            <div className="flex gap-3">
              <button onClick={() => setCurrentView('games')} className="btn-neon flex-1">
                Back
              </button>
              <button
                onClick={() => {
                  setGrid(createEmptyGrid());
                  setScore(0);
                  setGameOver(false);
                  spawnPiece();
                }}
                className="btn-neon-gold flex-1"
              >
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GameSudoku() {
  // Simple 4x4 Sudoku for mini app
  const [grid, setGrid] = useState<number[][]>(() => generateSudoku());
  const [fixed, setFixed] = useState<boolean[][]>(Array(4).fill(null).map(() => Array(4).fill(false)));
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [complete, setComplete] = useState(false);
  const { addPoints, setCurrentView, haptic } = useApp();

  function generateSudoku(): number[][] {
    const base = [
      [1, 2, 3, 4],
      [3, 4, 1, 2],
      [2, 1, 4, 3],
      [4, 3, 2, 1],
    ];

    // Shuffle rows and columns
    const shuffled = base.map(row => [...row]);

    // Random swaps
    for (let i = 0; i < 10; i++) {
      const r1 = Math.floor(Math.random() * 4);
      const r2 = Math.floor(Math.random() * 4);
      [shuffled[r1], shuffled[r2]] = [shuffled[r2], shuffled[r1]];
    }

    // Remove some numbers
    const puzzle = shuffled.map(row => [...row]);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const posRow = Math.floor(Math.random() * 4);
        const posCol = Math.floor(Math.random() * 4);
        puzzle[posRow][posCol] = 0;
      }
    }

    return puzzle;
  }

  useEffect(() => {
    const newFixed = grid.map(row => row.map(cell => cell !== 0));
    setFixed(newFixed);
  }, []);

  function handleCellClick(row: number, col: number) {
    if (fixed[row][col]) return;
    setSelectedCell([row, col]);
    haptic('light');
  }

  function handleNumberInput(num: number) {
    if (!selectedCell) return;

    const newGrid = grid.map(row => [...row]);
    newGrid[selectedCell[0]][selectedCell[1]] = num;
    setGrid(newGrid);
    haptic('light');

    // Check if complete
    if (checkComplete(newGrid)) {
      setComplete(true);
      addPoints(Math.floor(Math.random() * 5) + 4);
      haptic('success');
    }
  }

  function checkComplete(g: number[][]): boolean {
    // Check all cells filled
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (g[i][j] === 0) return false;
      }
    }

    // Check rows
    for (let i = 0; i < 4; i++) {
      const set = new Set(g[i]);
      if (set.size !== 4) return false;
    }

    // Check columns
    for (let j = 0; j < 4; j++) {
      const set = new Set(g.map(row => row[j]));
      if (set.size !== 4) return false;
    }

    // Check 2x2 boxes
    for (let box = 0; box < 4; box++) {
      const startRow = Math.floor(box / 2) * 2;
      const startCol = (box % 2) * 2;
      const nums = [
        g[startRow][startCol], g[startRow][startCol + 1],
        g[startRow + 1][startCol], g[startRow + 1][startCol + 1],
      ];
      if (new Set(nums).size !== 4) return false;
    }

    return true;
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 h-full">
      <div className="text-center mb-4">
        <p className="text-white font-bold text-xl">4x4 Sudoku</p>
        <p className="text-gray-400 text-sm">Fill with numbers 1-4</p>
      </div>

      {/* Grid */}
      <div className="grid gap-2 grid-cols-2">
        {[0, 1].map(blockRow => (
          [0, 1].map(blockCol => (
            <div key={`${blockRow}-${blockCol}`} className="grid-game grid-cols-2 gap-1">
              {[0, 1].map(cellRow => (
                [0, 1].map(cellCol => {
                  const row = blockRow * 2 + cellRow;
                  const col = blockCol * 2 + cellCol;
                  const isSelected = selectedCell?.[0] === row && selectedCell?.[1] === col;

                  return (
                    <button
                      key={`${row}-${col}`}
                      onClick={() => handleCellClick(row, col)}
                      className={`aspect-square w-12 rounded text-xl font-bold ${
                        isSelected ? 'bg-purple-500' :
                        fixed[row][col] ? 'bg-white/5 text-gray-400' :
                        'bg-white/10 text-white'
                      }`}
                    >
                      {grid[row][col] || ''}
                    </button>
                  );
                })
              ))}
            </div>
          ))
        ))}
      </div>

      {/* Number pad */}
      <div className="flex gap-3 mt-6">
        {[1, 2, 3, 4].map(num => (
          <button
            key={num}
            onClick={() => handleNumberInput(num)}
            className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 text-white text-2xl font-bold"
          >
            {num}
          </button>
        ))}
      </div>

      {/* Complete */}
      {complete && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/70 animate-fade-in">
          <div className="modal-content text-center">
            <div className="text-6xl mb-4">🔢</div>
            <h3 className="text-2xl font-bold text-white mb-2">Solved!</h3>
            <button onClick={() => setCurrentView('games')} className="btn-neon w-full">
              Back to Games
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function GameTileConnect() {
  const [tiles, setTiles] = useState<{ id: number; emoji: string; matched: boolean }[]>([]);
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [lines, setLines] = useState<{ from: number; to: number }[]>([]);
  const [score, setScore] = useState(0);
  const { addPoints, setCurrentView, haptic } = useApp();

  const emojis = ['💎', '💰', '🧠', '⚡', '🚀', '⭐', '🎮', '🏆'];

  useEffect(() => {
    initializeGame();
  }, []);

  function initializeGame() {
    const pairs = [...emojis, ...emojis];
    const shuffled = pairs.sort(() => Math.random() - 0.5);
    setTiles(shuffled.map((emoji, index) => ({ id: index, emoji, matched: false })));
    setLines([]);
    setScore(0);
    setSelectedTile(null);
  }

  function handleTileClick(id: number) {
    if (tiles[id].matched) return;

    haptic('light');

    if (selectedTile === null) {
      setSelectedTile(id);
    } else if (selectedTile === id) {
      setSelectedTile(null);
    } else {
      // Check if tiles match
      if (tiles[selectedTile].emoji === tiles[id].emoji) {
        // Match found
        setLines([...lines, { from: selectedTile, to: id }]);

        const newTiles = tiles.map((tile, index) => {
          if (index === selectedTile || index === id) {
            return { ...tile, matched: true };
          }
          return tile;
        });

        setTiles(newTiles);
        setScore(score + 10);
        haptic('success');

        // Check if all matched
        if (newTiles.every(t => t.matched)) {
          setTimeout(() => {
            addPoints(Math.floor(Math.random() * 5) + 4);
          }, 500);
        }
      }
      setSelectedTile(null);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 h-full">
      {/* Score */}
      <div className="text-center mb-4">
        <p className="text-gray-400 text-sm">Score</p>
        <p className="text-3xl font-bold text-gold-400">{score}</p>
      </div>

      {/* Tiles */}
      <div className="grid grid-cols-4 gap-2">
        {tiles.map((tile) => (
          <button
            key={tile.id}
            onClick={() => handleTileClick(tile.id)}
            className={`w-16 h-16 rounded-xl text-3xl flex items-center justify-center transition-all ${
              tile.matched
                ? 'bg-green-500/30 opacity-50'
                : selectedTile === tile.id
                ? 'bg-gradient-to-br from-purple-500 to-blue-500 scale-110'
                : 'bg-white/10'
            }`}
          >
            {tile.emoji}
          </button>
        ))}
      </div>

      {/* All matched */}
      {tiles.every(t => t.matched) && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/70 animate-fade-in">
          <div className="modal-content text-center">
            <div className="text-6xl mb-4">🔗</div>
            <h3 className="text-2xl font-bold text-white mb-4">All Connected!</h3>
            <div className="flex gap-3">
              <button onClick={() => setCurrentView('games')} className="btn-neon flex-1">
                Back
              </button>
              <button onClick={initializeGame} className="btn-neon-gold flex-1">
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GameMaze() {
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });
  const [maze, setMaze] = useState<number[][]>([]);
  const [moves, setMoves] = useState(0);
  const [complete, setComplete] = useState(false);
  const { addPoints, setCurrentView, haptic } = useApp();
  const mazeRef = useRef<HTMLDivElement>(null);

  const MAZE_SIZE = 8;
  const WALL = 1;
  const PATH = 0;
  const END = 2;

  useEffect(() => {
    generateMaze();
  }, []);

  function generateMaze() {
    // Simple maze generation
    const newMaze = Array(MAZE_SIZE).fill(null).map(() => Array(MAZE_SIZE).fill(PATH));

    // Add some walls
    for (let i = 0; i < MAZE_SIZE * 2; i++) {
      const x = Math.floor(Math.random() * (MAZE_SIZE - 2)) + 1;
      const y = Math.floor(Math.random() * (MAZE_SIZE - 2)) + 1;
      newMaze[y][x] = WALL;
    }

    // Ensure start and end are open
    newMaze[0][0] = PATH;
    newMaze[MAZE_SIZE - 1][MAZE_SIZE - 1] = END;

    // Ensure there's a path (simple: clear a diagonal)
    for (let i = 0; i < MAZE_SIZE; i++) {
      newMaze[i][Math.min(i, MAZE_SIZE - 1)] = PATH;
    }

    setMaze(newMaze);
    setPlayerPos({ x: 0, y: 0 });
    setMoves(0);
    setComplete(false);
  }

  function movePlayer(dx: number, dy: number) {
    const newX = playerPos.x + dx;
    const newY = playerPos.y + dy;

    if (
      newX >= 0 &&
      newX < MAZE_SIZE &&
      newY >= 0 &&
      newY < MAZE_SIZE &&
      maze[newY][newX] !== WALL
    ) {
      haptic('light');
      setPlayerPos({ x: newX, y: newY });
      setMoves(moves + 1);

      if (maze[newY][newX] === END) {
        setComplete(true);
        addPoints(Math.floor(Math.random() * 5) + 4);
        haptic('success');
      }
    }
  }

  // Handle keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          movePlayer(0, -1);
          break;
        case 'ArrowDown':
        case 's':
          movePlayer(0, 1);
          break;
        case 'ArrowLeft':
        case 'a':
          movePlayer(-1, 0);
          break;
        case 'ArrowRight':
        case 'd':
          movePlayer(1, 0);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerPos, maze]);

  return (
    <div className="flex flex-col items-center justify-center p-4 h-full">
      {/* Moves counter */}
      <div className="text-center mb-4">
        <p className="text-gray-400 text-sm">Moves</p>
        <p className="text-3xl font-bold text-gold-400">{moves}</p>
      </div>

      {/* Maze */}
      <div ref={mazeRef} className="grid gap-1 mb-6" style={{ gridTemplateColumns: `repeat(${MAZE_SIZE}, 1fr)` }}>
        {maze.map((row, y) =>
          row.map((cell, x) => (
            <div
              key={`${x}-${y}`}
              className={`w-8 h-8 rounded ${
                cell === WALL
                  ? 'bg-purple-800'
                  : cell === END
                  ? 'bg-green-500'
                  : playerPos.x === x && playerPos.y === y
                  ? 'bg-gold-400'
                  : 'bg-white/10'
              }`}
            >
              {playerPos.x === x && playerPos.y === y && (
                <span className="flex items-center justify-center h-full text-xl">🏃</span>
              )}
              {cell === END && !(playerPos.x === x && playerPos.y === y) && (
                <span className="flex items-center justify-center h-full text-xl">🏁</span>
              )}
            </div>
          ))
        )}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-3 gap-2">
        <div />
        <button
          onClick={() => movePlayer(0, -1)}
          className="w-14 h-14 rounded-xl bg-white/15 text-white text-2xl"
        >
          ↑
        </button>
        <div />
        <button
          onClick={() => movePlayer(-1, 0)}
          className="w-14 h-14 rounded-xl bg-white/15 text-white text-2xl"
        >
          ←
        </button>
        <div className="w-14 h-14" />
        <button
          onClick={() => movePlayer(1, 0)}
          className="w-14 h-14 rounded-xl bg-white/15 text-white text-2xl"
        >
          →
        </button>
        <div />
        <button
          onClick={() => movePlayer(0, 1)}
          className="w-14 h-14 rounded-xl bg-white/15 text-white text-2xl"
        >
          ↓
        </button>
        <div />
      </div>

      {/* Complete */}
      {complete && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/70 animate-fade-in">
          <div className="modal-content text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-2xl font-bold text-white mb-2">Maze Completed!</h3>
            <p className="text-gray-400 mb-4">Moves: {moves}</p>
            <div className="flex gap-3">
              <button onClick={() => setCurrentView('games')} className="btn-neon flex-1">
                Back
              </button>
              <button onClick={generateMaze} className="btn-neon-gold flex-1">
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
