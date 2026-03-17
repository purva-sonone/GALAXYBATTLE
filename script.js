document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const gameBoard = document.getElementById('game-board');
    const movesDisplay = document.getElementById('moves-count');
    const timerDisplay = document.getElementById('timer-display');
    const bestScoreDisplay = document.getElementById('best-score');
    const restartBtn = document.getElementById('restart-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const winModal = document.getElementById('win-modal');
    const playAgainBtn = document.getElementById('play-again-btn');
    const finalMoves = document.getElementById('final-moves');
    const finalTime = document.getElementById('final-time');
    const finalScoreDisplay = document.getElementById('final-score');
    const modeSelection = document.getElementById('mode-selection');
    const modeCards = document.querySelectorAll('.mode-card');
    const singleStats = document.getElementById('single-stats');
    const bestScoreContainer = document.getElementById('best-score-container');
    const p1Stat = document.querySelector('.p1-stat');
    const p2Stat = document.querySelector('.p2-stat');
    const p1ScoreDisplay = document.getElementById('p1-score');
    const p2ScoreDisplay = document.getElementById('p2-score');
    const turnIndicator = document.getElementById('turn-indicator');

    const startScreen = document.getElementById('start-screen');
    const mainApp = document.getElementById('main-app');
    const themeBtns = document.querySelectorAll('.theme-btn');

    // Theme Data Mapping
    const themeMaps = {
        galaxy: ['🌍', '🚀', '⭐', '🪐', '🌙', '🌌', '🛸', '🛰️', '☄️'],
        fashion: ['👟', '🧥', '⌚', '👜', '🧢', '👠', '🕶️', '💎', '🧤'],
        tech: ['💻', '📱', '⌨️', '🖱️', '🔋', '🔌', '📡', '💾', '🖥️'],
        emojis: ['😎', '🤗', '👻', '🔥', '🐼', '😘', '❤️', '🙂‍↔️', '🤩'],
        numbers: ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'],
        anime: ['🌸', '🍜', '🍱', '⛩️', '🏮', '🎐', '🦊', '🎋', '👺']
    };

    // Game State
    let currentCardTheme = 'galaxy';
    let flippedCards = [];
    let matchedPairs = 0;
    let moves = 0;
    let timer = null;
    let seconds = 0;
    let isLocked = false;
    let gameStarted = false;
    let gameMode = 'single'; // 'single', 'pvp', 'ai'
    let currentPlayer = 1; // 1 or 2
    let scores = { 1: 0, 2: 0 };
    const TIME_LIMIT = 120; // 2 minutes limit

    // Audio Context (for sound effects only)
    let audioCtx = null;
    const initAudio = () => {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    };

    const playSound = (type) => {
        initAudio();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = 'sine';
        if (type === 'match') {
            oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(783.99, audioCtx.currentTime + 0.1);
        } else {
            oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.2);
        }

        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
    };

    // Core Functions
    const shuffle = (array) => {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    };

    const formatTime = (totalSeconds) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const startTimer = () => {
        if (!gameStarted) {
            gameStarted = true;
            timer = setInterval(() => {
                seconds++;
                timerDisplay.textContent = formatTime(seconds);

                // Time Up Reminder Logic
                if (seconds >= TIME_LIMIT) {
                    handleGameOver('timeup');
                }
            }, 1000);
        }
    };

    const stopTimer = () => {
        clearInterval(timer);
        timer = null;
    };

    const createBoard = () => {
        gameBoard.innerHTML = '';
        const icons = themeMaps[currentCardTheme];
        const gameCards = shuffle([...icons, ...icons]);

        gameCards.forEach((icon, index) => {
            const card = document.createElement('div');
            card.classList.add('card');
            card.dataset.icon = icon;
            card.innerHTML = `
                <div class="card-face card-back">
                    <i class='bx bx-question-mark'></i>
                </div>
                <div class="card-face card-front">
                    <span class="emoji-icon">${icon}</span>
                </div>
            `;
            card.addEventListener('click', flipCard);
            gameBoard.appendChild(card);
        });

        updateUIForMode();
    };

    const updateUIForMode = () => {
        if (gameMode === 'single') {
            singleStats.classList.remove('hidden');
            bestScoreContainer.classList.remove('hidden');
            p1Stat.classList.add('hidden');
            p2Stat.classList.add('hidden');
            turnIndicator.classList.add('hidden');
        } else {
            singleStats.classList.add('hidden');
            bestScoreContainer.classList.add('hidden');
            p1Stat.classList.remove('hidden');
            p2Stat.classList.remove('hidden');
            turnIndicator.classList.remove('hidden');
            updateTurnDisplay();
        }
    };

    const updateTurnDisplay = () => {
        if (gameMode === 'pvp') {
            const pName = currentPlayer === 1 ? 'Player 1' : 'Player 2';
            turnIndicator.textContent = `${pName}'s Turn`;
            p1Stat.classList.toggle('active-player', currentPlayer === 1);
            p2Stat.classList.toggle('active-player', currentPlayer === 2);
        } else if (gameMode === 'ai') {
            const pName = currentPlayer === 1 ? 'Your Turn' : "Computer's Turn";
            turnIndicator.textContent = pName;
            p1Stat.classList.toggle('active-player', currentPlayer === 1);
            p2Stat.classList.toggle('active-player', currentPlayer === 2);
        }
    };

    function flipCard() {
        if (isLocked) return;
        if (this.classList.contains('flipped') || this.classList.contains('matched')) return;
        if (gameMode === 'ai' && currentPlayer === 2) return;

        handleFlip(this);
    }

    const handleFlip = (card) => {
        startTimer();
        card.classList.add('flipped');
        flippedCards.push(card);

        if (flippedCards.length === 2) {
            isLocked = true;
            if (gameMode === 'single') {
                moves++;
                movesDisplay.textContent = moves;
            }
            setTimeout(checkMatch, 600);
        }
    };

    const checkMatch = () => {
        const [card1, card2] = flippedCards;
        const isMatch = card1.dataset.icon === card2.dataset.icon;

        if (isMatch) {
            card1.classList.add('matched');
            card2.classList.add('matched');
            matchedPairs++;

            if (gameMode !== 'single') {
                scores[currentPlayer]++;
                p1ScoreDisplay.textContent = scores[1];
                p2ScoreDisplay.textContent = scores[2];
            }

            flippedCards = [];
            playSound('match');

            // Sparkle effect on match
            const rect = card2.getBoundingClientRect();
            confetti({
                particleCount: 15,
                startVelocity: 15,
                spread: 360,
                origin: {
                    x: (rect.left + rect.width / 2) / window.innerWidth,
                    y: (rect.top + rect.height / 2) / window.innerHeight
                },
                colors: ['#22d3ee', '#a855f7', '#ffffff'],
                shapes: ['circle'],
                gravity: 0.5,
                scalar: 0.7
            });

            if (matchedPairs === 9) {
                setTimeout(handleWin, 500);
            } else {
                isLocked = false;
                if (gameMode === 'ai' && currentPlayer === 2) {
                    setTimeout(aiTurn, 800);
                }
            }
        } else {
            setTimeout(() => {
                card1.classList.remove('flipped');
                card2.classList.remove('flipped');
                flippedCards = [];
                playSound('mismatch');

                if (gameMode !== 'single') {
                    currentPlayer = currentPlayer === 1 ? 2 : 1;
                    updateTurnDisplay();
                }

                isLocked = false;

                if (gameMode === 'ai' && currentPlayer === 2) {
                    setTimeout(aiTurn, 800);
                }
            }, 800);
        }
    };

    const aiTurn = () => {
        if (matchedPairs === 9) return;

        const availableCards = Array.from(document.querySelectorAll('.card:not(.flipped):not(.matched)'));
        if (availableCards.length < 2) return;

        const firstIdx = Math.floor(Math.random() * availableCards.length);
        const card1 = availableCards[firstIdx];
        availableCards.splice(firstIdx, 1);

        const secondIdx = Math.floor(Math.random() * availableCards.length);
        const card2 = availableCards[secondIdx];

        handleFlip(card1);
        setTimeout(() => {
            handleFlip(card2);
        }, 600);
    };

    const calculateScore = () => {
        if (gameMode === 'single') {
            const base = 10000;
            return Math.max(0, base - (moves * 100) - (seconds * 10));
        } else {
            const winnerScore = scores[currentPlayer] * 1000;
            const timeBonus = Math.max(0, 2000 - (seconds * 5));
            return winnerScore + timeBonus;
        }
    };

    const handleGameOver = (type) => {
        stopTimer();
        isLocked = true;

        if (type === 'timeup') {
            document.querySelector('.crown-icon').innerHTML = "<i class='bx bx-time-five' style='color: #ef4444;'></i>";
            document.querySelector('.modal-header h2').textContent = "Time's Up!";
            document.querySelector('.modal-header p').textContent = "The cosmic signal was lost.";
            finalScoreDisplay.textContent = "0";
            winModal.classList.add('active');
        }
    };

    const handleWin = () => {
        stopTimer();
        document.querySelector('.crown-icon').innerHTML = "<i class='bx bxs-trophy'></i>";
        const score = calculateScore();

        let winTitle = "Mission Accomplished";
        let winSub = "Digital realm cleared.";

        if (gameMode === 'pvp') {
            const winner = scores[1] > scores[2] ? 'Player 1' : (scores[2] > scores[1] ? 'Player 2' : 'It\'s a Tie!');
            winTitle = winner === 'It\'s a Tie!' ? "Draw!" : "Victory!";
            winSub = winner === 'It\'s a Tie!' ? "Both of you are equal masters." : `${winner} wins the battle!`;
        } else if (gameMode === 'ai') {
            const winner = scores[1] > scores[2] ? 'You' : (scores[2] > scores[1] ? 'Computer' : 'Tie');
            winTitle = winner === 'You' ? "Humanity Wins!" : (winner === 'Tie' ? "Tie Game!" : "AI Dominance!");
            winSub = winner === 'You' ? "You outsmarted the machine." : "The bots are getting better...";
        }

        document.querySelector('.modal-header h2').textContent = winTitle;
        document.querySelector('.modal-header p').textContent = winSub;

        finalMoves.textContent = gameMode === 'single' ? moves : 'N/A';
        finalTime.textContent = formatTime(seconds);
        finalScoreDisplay.textContent = score;

        winModal.classList.add('active');

        confetti({
            particleCount: 200,
            spread: 90,
            origin: { y: 0.6 },
            colors: ['#22d3ee', '#a855f7', '#f472b6']
        });

        if (gameMode === 'single') {
            const bestScore = localStorage.getItem('memory-master-best') || 0;
            if (score > bestScore) {
                localStorage.setItem('memory-master-best', score);
                updateBestScoreDisplay();
            }
        }
    };

    const updateBestScoreDisplay = () => {
        const best = localStorage.getItem('memory-master-best');
        bestScoreDisplay.textContent = best ? best : '--';
    };

    const resetGame = () => {
        stopTimer();
        seconds = 0;
        moves = 0;
        matchedPairs = 0;
        flippedCards = [];
        isLocked = false;
        gameStarted = false;
        currentPlayer = 1;
        scores = { 1: 0, 2: 0 };

        movesDisplay.textContent = '0';
        timerDisplay.textContent = '00:00';
        p1ScoreDisplay.textContent = '0';
        p2ScoreDisplay.textContent = '0';
        winModal.classList.remove('active');
        document.querySelector('.crown-icon').innerHTML = "<i class='bx bxs-trophy'></i>";

        createBoard();
    };

    // Events
    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            currentCardTheme = btn.dataset.theme;
            startScreen.classList.add('hidden');
            mainApp.classList.remove('hidden');
            resetGame();
        });
    });

    modeCards.forEach(card => {
        card.addEventListener('click', () => {
            modeCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            gameMode = card.dataset.mode;
            resetGame();
        });
    });

    themeToggle.addEventListener('click', () => {
        const body = document.documentElement;
        const currentTheme = body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        body.setAttribute('data-theme', newTheme);
        themeToggle.innerHTML = newTheme === 'dark' ? "<i class='bx bx-moon'></i>" : "<i class='bx bx-sun'></i>";
    });

    restartBtn.addEventListener('click', () => {
        startScreen.classList.remove('hidden');
        mainApp.classList.add('hidden');
    });

    playAgainBtn.addEventListener('click', () => {
        winModal.classList.remove('active');
        startScreen.classList.remove('hidden');
        mainApp.classList.add('hidden');
    });

    updateBestScoreDisplay();
});
