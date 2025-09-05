module.exports = [
  {
    name: "Cashier",
    display: "🛒 Cashier",
    minBalance: 0,
    hoursRequired: 0,
    requiredItems: [],
    basePay: [100, 200],
    cooldown: 3600_000, // 1 hour
    minigame: "typing",
    description: "Help customers at checkout. Type fast for more pay!"
  },
  {
    name: "Programmer",
    display: "💻 Programmer",
    minBalance: 500,
    hoursRequired: 10,
    requiredItems: ["Laptop"],
    basePay: [300, 600],
    cooldown: 7200_000, // 2 hours
    minigame: "trivia",
    description: "Solve code puzzles for cash. Requires a Laptop."
  },
  {
    name: "Streamer",
    display: "🎥 Streamer",
    minBalance: 1000,
    hoursRequired: 25,
    requiredItems: ["Laptop", "Microphone"],
    basePay: [500, 1500],
    cooldown: 10800_000, // 3 hours
    minigame: "reaction",
    description: "React quickly to claim viewer donations. Needs Laptop & Microphone."
  },
  {
    name: "Chef",
    display: "🍳 Chef",
    minBalance: 250,
    hoursRequired: 5,
    requiredItems: ["Chef Hat"],
    basePay: [200, 400],
    cooldown: 5400_000, // 1.5 hours
    minigame: "memory",
    description: "Memorize recipes for pay! Requires Chef Hat."
  }
];