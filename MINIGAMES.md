# Minigames Guide

This bot features 8 exciting minigames integrated with the economy system! Play to earn money and have fun.

## Available Minigames

### 🎮 Interactive Games

### 💣 `/minefield` - Minefield Navigator
Navigate through a 5x5 grid avoiding hidden mines! Each safe tile increases your winnings.

- **Cooldown**: 60 seconds
- **Bet range**: $10 - $500
- **Grid**: 5x5 (25 tiles total)
- **Mines**: 5 mines hidden randomly
- **Payouts**: Each safe tile adds 30% to your bet
  - 1 safe tile: 1.3x bet
  - 5 safe tiles: 2.5x bet
  - 10 safe tiles: 4.0x bet
  - All 20 safe tiles: 7.0x bet!
- **Strategy**: Cash out anytime to secure your winnings, or keep going for bigger multipliers!

**How to play**: `/minefield bet:100` then click tiles to reveal. Use the Cash Out button when you want to secure your winnings!

---

### 🧠 `/memory` - Memory Match
Match pairs of emojis in a 4x4 grid! Speed and accuracy earn bonus multipliers.

- **Cooldown**: 50 seconds
- **Bet range**: $10 - $300
- **Grid**: 4x4 (8 pairs to find)
- **Time limit**: 2 minutes
- **Base payout**: 2x your bet for winning
- **Bonuses**:
  - Perfect game (8 moves): +1.0x multiplier
  - Good game (≤11 moves): +0.5x multiplier
  - Speed bonus (<60 seconds): +0.5x multiplier
  - Maximum possible: 4.0x your bet!
- **Lose**: If time runs out, you lose your bet

**How to play**: `/memory bet:100` then click tiles to reveal and match pairs!

---

### 🔴 `/connect4` - Connect Four
Classic Connect 4 against another player! First to connect 4 wins.

- **Cooldown**: 30 seconds
- **Bet range**: $10 - $500
- **Players**: 2 (Player vs Player)
- **Time limit**: 3 minutes total
- **Payout**: Winner takes both bets (2x their bet)
- **Draw**: Both players keep their bets

**How to play**: `/connect4 opponent:@user bet:100` - Challenge another player! They must accept to start the game.

---

### 🧠 `/trivia` - Trivia Questions
Answer general knowledge questions to earn money!

- **Cooldown**: 60 seconds
- **Rewards**:
  - Correct answer: $150 (base $50 + $100 bonus)
  - Wrong answer: $50 (participation reward)
  - No answer (timeout): $0
- **Time limit**: 15 seconds to answer

**How to play**: Use `/trivia` and click the correct answer from the 4 choices!

---

### 🎯 `/guessnumber` - Number Guessing Game
Guess a number between 1-10 and win big based on accuracy!

- **Cooldown**: 45 seconds
- **Bet range**: $10 - $1000
- **Payouts**:
  - Exact match: 5x your bet
  - Off by 1: 2x your bet
  - Wrong: Lose your bet

**How to play**: `/guessnumber bet:100 guess:7`

---

### 🎲 `/diceroll` - Dice Rolling
Roll two dice and win based on the result!

- **Cooldown**: 30 seconds
- **Bet range**: $10 - $500
- **Payouts**:
  - Doubles (both dice match): 4x your bet
  - Lucky 7 or 11: 3x your bet
  - High roll (9-12): 2x your bet
  - Low roll (2-8): Lose your bet

**How to play**: `/diceroll bet:100`

---

### 🪨📄✂️ `/rps` - Rock Paper Scissors
Classic Rock-Paper-Scissors against the bot!

- **Cooldown**: 20 seconds
- **Bet range**: $10 - $300
- **Payouts**:
  - Win: 2x your bet
  - Tie: Get your bet back
  - Lose: Lose your bet
- **Time limit**: 15 seconds to choose

**How to play**: Use `/rps bet:100` and click your choice!

---

### 🎰 `/slots` - Slot Machine
Try your luck at the slot machine!

- **Cooldown**: 40 seconds
- **Bet range**: $10 - $500
- **Symbols**: 🍒 🍋 🍊 🍇 💎 7️⃣
- **Payouts**:
  - Three 7️⃣ (SUPER JACKPOT): 20x your bet
  - Three 💎 (DIAMOND JACKPOT): 10x your bet
  - Three matching symbols: 5x your bet
  - Two matching symbols: 2x your bet
  - No match: Lose your bet

**How to play**: `/slots bet:100`

---

## Tips & Strategies

### For Interactive Games
1. **Minefield** - Start with corners and edges, they're statistically safer. Cash out early for guaranteed profit!
2. **Memory** - Focus on remembering positions. The speed bonus is significant - under 60 seconds adds 0.5x!
3. **Connect4** - Control the center columns for better winning chances

### For Quick Games
1. **Start small** - Test each game with minimum bets to understand the mechanics
2. **Manage your bankroll** - Don't bet more than you can afford to lose
3. **Use cooldowns wisely** - Different games have different cooldowns, rotate between them
4. **Trivia is safest** - You always get something, even if you're wrong!
5. **High risk, high reward** - Slots and guessnumber offer the biggest payouts

## Game Categories

**Interactive Strategy Games** (requires thinking):
- `/minefield` - Risk vs reward decision making
- `/memory` - Pattern recognition and memory
- `/connect4` - Strategic player vs player

**Quick Gambling Games** (fast and simple):
- `/trivia` - Knowledge testing
- `/guessnumber` - Pure luck with skill element
- `/diceroll` - Quick dice gambling
- `/rps` - Classic hand game
- `/slots` - Slot machine luck

## Other Economy Commands

- `/balance` - Check your current balance
- `/daily` - Claim your daily reward
- `/work` - Work your job to earn money
- `/coinflip` - 50/50 gamble
- `/shop` - Browse items to purchase
- `/buy` - Purchase items from the shop

---

**Have fun and gamble responsibly!** 🎮
