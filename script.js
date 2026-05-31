const display = document.getElementById("display");
const calcHint = document.getElementById("calcHint");
const themeToggle = document.getElementById("themeToggle");

const gameDialog = document.getElementById("gameDialog");
const openGameBtn = document.getElementById("openGameBtn");
const closeGameBtn = document.getElementById("closeGameBtn");
const startGameBtn = document.getElementById("startGameBtn");
const gameScreen = document.getElementById("gameScreen");
const roundInfo = document.getElementById("roundInfo");
const scoreInfo = document.getElementById("scoreInfo");

let expression = "";

// ---------- Calculator ----------
function appendValue(value) {
  if (expression === "Error") expression = "";
  expression += value;
  updateDisplay();
}

function clearDisplay() {
  expression = "";
  calcHint.textContent = "Cleared";
  updateDisplay();
}

function deleteLast() {
  expression = expression.slice(0, -1);
  calcHint.textContent = "Deleted";
  updateDisplay();
}

function updateDisplay() {
  display.value = expression || "";
}

function calculateResult() {
  try {
    const result = evaluateExpression(expression);
    expression = String(result);
    calcHint.textContent = "Calculated";
    updateDisplay();
  } catch {
    expression = "Error";
    calcHint.textContent = "Invalid expression";
    updateDisplay();
  }
}

function evaluateExpression(expr) {
  if (!expr.trim()) return 0;

  const sanitized = expr.replace(/\s+/g, "");
  if (!/^[0-9+\-*/%.()]+$/.test(sanitized)) {
    throw new Error("Invalid characters");
  }

  const tokens = tokenize(sanitized);
  const rpn = toRPN(tokens);
  const result = evalRPN(rpn);

  if (!Number.isFinite(result)) throw new Error("Math error");
  return Number.isInteger(result) ? result : parseFloat(result.toFixed(6));
}

function tokenize(expr) {
  const tokens = [];
  let num = "";

  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];

    if (/[0-9.]/.test(ch)) {
      num += ch;
      continue;
    }

    if (num) {
      tokens.push(num);
      num = "";
    }

    if ("+-*/%()".includes(ch)) {
      const prev = tokens[tokens.length - 1];
      const isUnaryMinus =
        ch === "-" &&
        (tokens.length === 0 || ["+", "-", "*", "/", "%", "("].includes(prev));

      if (isUnaryMinus) {
        num = "-";
      } else {
        tokens.push(ch);
      }
    } else {
      throw new Error("Invalid token");
    }
  }

  if (num) tokens.push(num);
  return tokens;
}

function toRPN(tokens) {
  const output = [];
  const operators = [];
  const precedence = { "+": 1, "-": 1, "*": 2, "/": 2, "%": 2 };

  for (const token of tokens) {
    if (!isNaN(token)) {
      output.push(token);
    } else if (token in precedence) {
      while (
        operators.length &&
        operators[operators.length - 1] in precedence &&
        precedence[operators[operators.length - 1]] >= precedence[token]
      ) {
        output.push(operators.pop());
      }
      operators.push(token);
    } else if (token === "(") {
      operators.push(token);
    } else if (token === ")") {
      while (operators.length && operators[operators.length - 1] !== "(") {
        output.push(operators.pop());
      }
      if (operators.pop() !== "(") throw new Error("Mismatched parentheses");
    }
  }

  while (operators.length) {
    const op = operators.pop();
    if (op === "(" || op === ")") throw new Error("Mismatched parentheses");
    output.push(op);
  }

  return output;
}

function evalRPN(rpn) {
  const stack = [];

  for (const token of rpn) {
    if (!isNaN(token)) {
      stack.push(parseFloat(token));
      continue;
    }

    const b = stack.pop();
    const a = stack.pop();

    if (a === undefined || b === undefined) throw new Error("Bad expression");

    switch (token) {
      case "+":
        stack.push(a + b);
        break;
      case "-":
        stack.push(a - b);
        break;
      case "*":
        stack.push(a * b);
        break;
      case "/":
        if (b === 0) throw new Error("Divide by zero");
        stack.push(a / b);
        break;
      case "%":
        if (b === 0) throw new Error("Modulo by zero");
        stack.push(a % b);
        break;
      default:
        throw new Error("Unknown operator");
    }
  }

  if (stack.length !== 1) throw new Error("Invalid result");
  return stack[0];
}

// ---------- Theme ----------
themeToggle.addEventListener("click", () => {
  const html = document.documentElement;
  const current = html.getAttribute("data-theme");
  html.setAttribute("data-theme", current === "dark" ? "light" : "dark");
});

// ---------- Game ----------
let currentRound = 0;
let score = 0;
let currentAnswer = null;
const totalRounds = 5;

openGameBtn.addEventListener("click", () => {
  resetGameHome();
  gameDialog.showModal();
});

closeGameBtn.addEventListener("click", () => {
  gameDialog.close();
});

gameDialog.addEventListener("click", (e) => {
  const rect = gameDialog.querySelector(".game-panel").getBoundingClientRect();
  const inside =
    e.clientX >= rect.left &&
    e.clientX <= rect.right &&
    e.clientY >= rect.top &&
    e.clientY <= rect.bottom;

  if (!inside) gameDialog.close();
});

startGameBtn.addEventListener("click", startGame);

function resetGameHome() {
  currentRound = 0;
  score = 0;
  scoreInfo.textContent = "0";
  roundInfo.textContent = `1 / ${totalRounds}`;
  gameScreen.innerHTML = `
    <p class="game-intro">
      Answer ${totalRounds} quick basic calculation questions. Each question has 3 options.
    </p>
    <button class="start-game-btn" id="startGameBtn">Start Game</button>
  `;
  document.getElementById("startGameBtn").addEventListener("click", startGame);
}

function startGame() {
  currentRound = 1;
  score = 0;
  updateGameStats();
  loadQuestion();
}

function updateGameStats() {
  roundInfo.textContent = `${currentRound} / ${totalRounds}`;
  scoreInfo.textContent = score;
}

function loadQuestion() {
  const question = generateQuestion();
  currentAnswer = question.answer;

  gameScreen.innerHTML = `
    <p class="question-text">${question.text}</p>
    <div class="options">
      ${question.options
        .map(
          (option) =>
            `<button class="option-btn" data-value="${option}">${option}</button>`
        )
        .join("")}
    </div>
    <p class="result-text">Choose the correct answer.</p>
  `;

  document.querySelectorAll(".option-btn").forEach((btn) => {
    btn.addEventListener("click", () => handleAnswer(btn));
  });
}

function handleAnswer(selectedBtn) {
  const selected = Number(selectedBtn.dataset.value);
  const buttons = document.querySelectorAll(".option-btn");
  const resultText = document.querySelector(".result-text");

  buttons.forEach((btn) => (btn.disabled = true));

  if (selected === currentAnswer) {
    score++;
    selectedBtn.classList.add("correct");
    resultText.textContent = "Correct answer!";
  } else {
    selectedBtn.classList.add("wrong");
    buttons.forEach((btn) => {
      if (Number(btn.dataset.value) === currentAnswer) {
        btn.classList.add("correct");
      }
    });
    resultText.textContent = `Wrong answer. Correct answer was ${currentAnswer}.`;
  }

  updateGameStats();

  setTimeout(() => {
    if (currentRound < totalRounds) {
      currentRound++;
      updateGameStats();
      loadQuestion();
    } else {
      showFinalScore();
    }
  }, 1200);
}

function showFinalScore() {
  gameScreen.innerHTML = `
    <div class="final-score">
      <h3>Game Over</h3>
      <p>You completed all ${totalRounds} rounds.</p>
      <div class="big-score">${score} / ${totalRounds}</div>
      <p>${getScoreMessage(score)}</p>
      <button class="start-game-btn" id="restartGameBtn">Play Again</button>
    </div>
  `;

  document.getElementById("restartGameBtn").addEventListener("click", startGame);
}

function getScoreMessage(score) {
  if (score === 5) return "Excellent! Perfect score.";
  if (score >= 3) return "Great job! You did really well.";
  return "Nice try! Practice once more.";
}

function generateQuestion() {
  const operations = ["+", "-", "*", "/"];
  const op = operations[Math.floor(Math.random() * operations.length)];
  let a, b, answer, text;

  switch (op) {
    case "+":
      a = randomInt(1, 30);
      b = randomInt(1, 30);
      answer = a + b;
      text = `${a} + ${b} = ?`;
      break;

    case "-":
      a = randomInt(10, 40);
      b = randomInt(1, a);
      answer = a - b;
      text = `${a} − ${b} = ?`;
      break;

    case "*":
      a = randomInt(2, 12);
      b = randomInt(2, 12);
      answer = a * b;
      text = `${a} × ${b} = ?`;
      break;

    case "/":
      b = randomInt(2, 12);
      answer = randomInt(2, 12);
      a = b * answer;
      text = `${a} ÷ ${b} = ?`;
      break;
  }

  const options = generateOptions(answer);
  return { text, answer, options };
}

function generateOptions(correctAnswer) {
  const options = new Set([correctAnswer]);

  while (options.size < 3) {
    const offset = randomInt(-10, 10);
    const wrong = correctAnswer + offset;
    if (wrong !== correctAnswer && wrong >= 0) {
      options.add(wrong);
    }
  }

  return [...options].sort(() => Math.random() - 0.5);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}