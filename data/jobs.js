module.exports = [
  {
    name: "Cashier",
    display: "🛒 Cashier",
    minBalance: 0,
    hoursRequired: 0,
    basePay: [100, 200],
    cooldown: 3600_000, // 1 hour
    minigame: "typing"
  },
  {
    name: "Programmer",
    display: "💻 Programmer",
    minBalance: 500,
    hoursRequired: 10,
    basePay: [300, 600],
    cooldown: 7200_000, // 2 hours
    minigame: "trivia"
  },
  {
    name: "Chef",
    display: "🍳 Chef",
    minBalance: 250,
    hoursRequired: 5,
    basePay: [200, 400],
    cooldown: 5400_000, // 1.5 hours
    minigame: "typing"
  },
  {
    name: "Athlete",
    display: "🏃 Athlete",
    minBalance: 750,
    hoursRequired: 20,
    basePay: [500, 1000],
    cooldown: 10800_000, // 3 hours
    minigame: "random"
  },
  // Add more jobs as you like!
];