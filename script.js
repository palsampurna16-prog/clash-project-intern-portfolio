const cards = {
  track: {
    name: "Track Workstreams",
    metricDelta: { visibility: 14, alignment: 8, flow: 8, efficiency: 6 },
    description:
      "Workstreams are mapped, owners are clear, and timelines stay visible across the live system.",
    log: "Workstreams are visible and the operating picture is clear.",
  },
  team: {
    name: "Coordinate Teams",
    metricDelta: { visibility: 6, alignment: 16, flow: 12, efficiency: 8 },
    description:
      "Cross-functional coordination locks teams onto the same priorities and delivery timing.",
    log: "Teams are aligned and handoffs are moving on rhythm.",
  },
  dashboard: {
    name: "Maintain Dashboards",
    metricDelta: { visibility: 16, alignment: 8, flow: 8, efficiency: 10 },
    description:
      "KPIs, reports, and current status are visible so decisions land faster and with less churn.",
    log: "Dashboards are updated and leadership has clean visibility into delivery health.",
  },
  resolve: {
    name: "Resolve Blockers",
    metricDelta: { visibility: 4, alignment: 8, flow: 18, efficiency: 12 },
    description:
      "Risks are resolved early, dependencies are cleared, and execution keeps moving.",
    log: "Blockers are resolved and the delivery path opens back up.",
  },
};

const sequence = ["track", "team", "dashboard", "resolve"];

const scenarios = [
  {
    title: "Launch Day Rush",
    pressure: "Medium",
    duration: 28,
    intro: "A fresh feature push is live. Build visibility fast before requests pile up.",
    roundBonus: 140,
  },
  {
    title: "Weekend Event Spike",
    pressure: "High",
    duration: 24,
    intro: "Traffic is surging. Coordination and dashboards need to stay sharp under load.",
    roundBonus: 190,
  },
  {
    title: "Hotfix Countdown",
    pressure: "Critical",
    duration: 20,
    intro: "The team is racing a hotfix into production. Precision matters more than speed now.",
    roundBonus: 260,
  },
];

const baselineMetrics = {
  visibility: 54,
  alignment: 54,
  flow: 54,
  efficiency: 54,
};

const state = {
  started: false,
  roundIndex: -1,
  progressIndex: 0,
  deployed: [],
  blockers: [],
  logEntries: [],
  won: false,
  locked: false,
  failedStep: null,
  timerDuration: scenarios[0].duration,
  timerRemaining: scenarios[0].duration,
  score: 0,
  streak: 0,
  feedbackTimer: null,
  resetTimer: null,
  roundTimer: null,
  nextRoundTimer: null,
};

const elements = {
  cards: [...document.querySelectorAll(".arena-card")],
  tacticalLog: document.getElementById("tacticalLog"),
  energyValue: document.getElementById("energyValue"),
  energyFill: document.getElementById("energyFill"),
  timerValue: document.getElementById("timerValue"),
  timerFill: document.getElementById("timerFill"),
  statusText: document.getElementById("statusText"),
  statusFill: document.getElementById("statusFill"),
  visibilityValue: document.getElementById("visibilityValue"),
  alignmentValue: document.getElementById("alignmentValue"),
  flowValue: document.getElementById("flowValue"),
  efficiencyValue: document.getElementById("efficiencyValue"),
  scoreValue: document.getElementById("scoreValue"),
  streakValue: document.getElementById("streakValue"),
  scenarioTitle: document.getElementById("scenarioTitle"),
  roundValue: document.getElementById("roundValue"),
  pressureValue: document.getElementById("pressureValue"),
  comboHint: document.getElementById("comboHint"),
  systemEvent: document.getElementById("systemEvent"),
  arenaOverlay: document.getElementById("arenaOverlay"),
  blockerLayer: document.getElementById("blockerLayer"),
  arenaStage: document.getElementById("arenaStage"),
  arenaBoard: document.querySelector(".arena-board"),
  resetButton: document.getElementById("resetButton"),
  playButton: document.getElementById("playButton"),
  startScreen: document.getElementById("startScreen"),
  sequenceSlots: [...document.querySelectorAll(".sequence-slot")],
  deployAnchors: [...document.querySelectorAll(".deploy-anchor")],
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clearTimeoutKey(key) {
  if (state[key]) {
    window.clearTimeout(state[key]);
    state[key] = null;
  }
}

function stopRoundTimer() {
  if (state.roundTimer) {
    window.clearInterval(state.roundTimer);
    state.roundTimer = null;
  }
}

function currentScenario() {
  return state.roundIndex >= 0 ? scenarios[state.roundIndex] : null;
}

function getMetrics() {
  const metrics = { ...baselineMetrics };

  state.deployed.forEach((cardId) => {
    Object.entries(cards[cardId].metricDelta).forEach(([key, delta]) => {
      metrics[key] += delta;
    });
  });

  if (state.blockers.length) {
    metrics.visibility -= 8;
    metrics.alignment -= 10;
    metrics.flow -= 16;
    metrics.efficiency -= 12;
  }

  if (state.timerRemaining / state.timerDuration <= 0.35 && state.started) {
    metrics.flow -= 6;
    metrics.efficiency -= 4;
  }

  Object.keys(metrics).forEach((key) => {
    metrics[key] = clamp(metrics[key], 0, 100);
  });

  return metrics;
}

function getStatusScore(metrics) {
  const average =
    (metrics.visibility + metrics.alignment + metrics.flow + metrics.efficiency) / 4;
  const roundBonus = Math.max(state.roundIndex, 0) * 4;
  const streakBonus = Math.min(state.streak * 2, 12);
  const winBonus = state.won ? 20 : 0;
  return clamp(average + roundBonus + streakBonus + winBonus, 0, 100);
}

function getStatusLabel(score) {
  if (!state.started) {
    return "Standby";
  }
  if (state.won) {
    return "Stable";
  }
  if (score >= 78) {
    return "On Track";
  }
  if (score >= 56) {
    return "At Risk";
  }
  return "Blocked";
}

function renderLog() {
  elements.tacticalLog.innerHTML = "";
  state.logEntries.slice(0, 7).forEach((entry) => {
    const item = document.createElement("li");
    item.innerHTML = `<strong>${entry.title}</strong>${entry.body}`;
    elements.tacticalLog.appendChild(item);
  });
}

function addLog(title, body) {
  state.logEntries.unshift({ title, body });
  renderLog();
}

function setEvent(label, message, tone = "neutral") {
  const labelNode = elements.systemEvent.querySelector(".event-label");
  const copyNode = elements.systemEvent.querySelector("p");
  labelNode.textContent = label;
  copyNode.textContent = message;
  elements.systemEvent.classList.remove("success", "error", "active");
  if (tone === "success") {
    elements.systemEvent.classList.add("success");
  }
  if (tone === "error") {
    elements.systemEvent.classList.add("error");
  }
  window.requestAnimationFrame(() => {
    elements.systemEvent.classList.add("active");
  });
}

function renderSequenceTrack(failedStep = null) {
  elements.sequenceSlots.forEach((slot, index) => {
    slot.classList.toggle("filled", index < state.progressIndex);
    slot.classList.toggle("current", index === state.progressIndex && !state.won);
    slot.classList.toggle("failed", failedStep === index);
  });
}

function getDeployTarget(stepIndex) {
  const anchor = elements.deployAnchors[stepIndex];
  const overlayRect = elements.arenaOverlay.getBoundingClientRect();
  const anchorRect = anchor.getBoundingClientRect();
  const startX = overlayRect.width / 2;
  const startY = overlayRect.height - 126;
  const targetX =
    anchorRect.left - overlayRect.left + anchorRect.width / 2 - startX;
  const targetY =
    anchorRect.top - overlayRect.top + anchorRect.height / 2 - startY;
  return { x: targetX, y: targetY };
}

function createDeployToken(cardId, variant, stepIndex) {
  const card = cards[cardId];
  const token = document.createElement("div");
  const isCorrect = variant === "good";
  const target =
    stepIndex != null ? getDeployTarget(stepIndex) : { x: 0, y: -210 };

  token.className = `deploy-token ${variant}`;
  token.style.setProperty("--target-x", `${target.x}px`);
  token.style.setProperty("--target-y", `${target.y}px`);
  token.innerHTML = `${card.name}<small>${isCorrect ? "action deployed" : "blocked deploy"}</small>`;
  elements.arenaOverlay.appendChild(token);

  if (isCorrect) {
    window.setTimeout(() => {
      token.classList.add("persist");
      token.style.animation = "none";
    }, 760);
  } else {
    window.setTimeout(() => token.remove(), 900);
  }

  return token;
}

function clearDeployedTokens() {
  [...elements.arenaOverlay.querySelectorAll(".deploy-token")].forEach((token) => {
    token.remove();
  });
}

function spawnBlocker(reason) {
  clearBlockers(true);
  const blocker = document.createElement("div");
  blocker.className = "blocker";
  blocker.style.top = "calc(50% - 34px)";
  blocker.style.left = "calc(50% - 34px)";
  blocker.dataset.reason = reason;
  elements.blockerLayer.appendChild(blocker);
  state.blockers = [blocker];
  addLog("Blocker detected", reason);
}

function clearBlockers(immediate = false) {
  if (!state.blockers.length) {
    return;
  }

  state.blockers.forEach((blocker) => {
    if (immediate) {
      blocker.remove();
      return;
    }
    blocker.classList.add("clearing");
    window.setTimeout(() => blocker.remove(), 520);
  });
  state.blockers = [];
}

function pulseArena(type) {
  elements.arenaStage.classList.remove("feedback-success", "feedback-error");
  void elements.arenaStage.offsetWidth;
  if (type === "success" || type === "error") {
    elements.arenaStage.classList.add(
      type === "success" ? "feedback-success" : "feedback-error"
    );
  }

  if (type === "error") {
    elements.arenaBoard.classList.remove("shake");
    void elements.arenaBoard.offsetWidth;
    elements.arenaBoard.classList.add("shake");
  }

  clearTimeoutKey("feedbackTimer");
  state.feedbackTimer = window.setTimeout(() => {
    elements.arenaStage.classList.remove("feedback-success", "feedback-error");
    elements.arenaBoard.classList.remove("shake");
    state.feedbackTimer = null;
  }, 520);
}

function updateHud() {
  const metrics = getMetrics();
  const score = getStatusScore(metrics);
  const scenario = currentScenario();
  const timerRatio = clamp(state.timerRemaining / state.timerDuration, 0, 1);

  elements.energyValue.textContent = state.progressIndex;
  elements.energyFill.style.width = `${(state.progressIndex / sequence.length) * 100}%`;
  elements.timerValue.textContent = `${Math.ceil(state.timerRemaining)}s`;
  elements.timerFill.style.width = `${timerRatio * 100}%`;
  elements.visibilityValue.textContent = metrics.visibility;
  elements.alignmentValue.textContent = metrics.alignment;
  elements.flowValue.textContent = metrics.flow;
  elements.efficiencyValue.textContent = metrics.efficiency;
  elements.scoreValue.textContent = state.score;
  elements.streakValue.textContent = state.streak;
  elements.scenarioTitle.textContent = scenario ? scenario.title : "Standby";
  elements.roundValue.textContent = state.started
    ? `${state.roundIndex + 1}/${scenarios.length}`
    : `0/${scenarios.length}`;
  elements.pressureValue.textContent = scenario ? scenario.pressure : "Low";
  elements.statusText.textContent = getStatusLabel(score);
  elements.statusFill.style.width = `${score}%`;

  document.body.classList.remove("status-ok", "status-risk", "status-danger");
  if (state.won || score >= 72) {
    document.body.classList.add("status-ok");
  } else if (score >= 52) {
    document.body.classList.add("status-risk");
  } else {
    document.body.classList.add("status-danger");
  }

  elements.arenaStage.classList.toggle(
    "feedback-warning",
    state.started && !state.won && !state.locked && timerRatio <= 0.35
  );

  const expectedCard = sequence[state.progressIndex];
  elements.cards.forEach((button) => {
    const cardId = button.dataset.card;
    const isPlaced = state.deployed.includes(cardId);
    button.disabled = !state.started || state.locked || state.won || isPlaced;
    button.classList.toggle("spent", isPlaced);
    button.classList.toggle("locked", !state.started || state.locked || state.won || isPlaced);
    button.classList.toggle(
      "next-step",
      cardId === expectedCard && state.started && !state.won && !state.locked
    );
  });

  elements.startScreen.classList.toggle("hidden", state.started);
  renderSequenceTrack(state.failedStep);
}

function resetProgress() {
  state.progressIndex = 0;
  state.deployed = [];
  state.failedStep = null;
  clearDeployedTokens();
  renderSequenceTrack();
}

function queueProgressReset() {
  clearTimeoutKey("resetTimer");
  state.locked = true;
  updateHud();
  state.resetTimer = window.setTimeout(() => {
    resetProgress();
    state.locked = false;
    setEvent("Retry sequence", "Recover quickly. The incident clock is still running.");
    elements.comboHint.textContent =
      "Incorrect sequence introduces blockers. Rebuild momentum before the clock runs out.";
    updateHud();
    state.resetTimer = null;
  }, 900);
}

function beginRound(roundIndex, retry = false) {
  clearTimeoutKey("resetTimer");
  clearTimeoutKey("nextRoundTimer");
  stopRoundTimer();

  state.roundIndex = roundIndex;
  state.progressIndex = 0;
  state.deployed = [];
  state.failedStep = null;
  state.locked = false;
  state.won = false;
  clearDeployedTokens();
  clearBlockers(true);

  const scenario = currentScenario();
  state.timerDuration = scenario.duration;
  state.timerRemaining = scenario.duration;

  setEvent(
    retry ? "Incident reset" : scenario.title,
    retry ? "The system slipped. Rebuild the chain cleanly." : scenario.intro
  );
  elements.comboHint.textContent = retry
    ? "Fast recovery matters now. Build the chain cleanly under pressure."
    : scenario.intro;
  addLog(
    retry ? "Round restarted" : "New incident",
    retry
      ? `${scenario.title} is still unstable. Re-establish control before time expires.`
      : `${scenario.title} is live. Complete the full chain before the clock burns down.`
  );

  stopRoundTimer();
  state.roundTimer = window.setInterval(() => {
    state.timerRemaining = clamp(state.timerRemaining - 0.1, 0, state.timerDuration);
    updateHud();
    if (state.timerRemaining <= 0) {
      handleTimeout();
    }
  }, 100);

  updateHud();
}

function advanceRound() {
  const nextRoundIndex = state.roundIndex + 1;
  if (nextRoundIndex >= scenarios.length) {
    winMatch();
    return;
  }

  state.locked = true;
  stopRoundTimer();
  clearTimeoutKey("nextRoundTimer");
  const nextScenario = scenarios[nextRoundIndex];

  setEvent("Round clear", `System stabilized. ${nextScenario.title} is coming in.`);
  elements.comboHint.textContent = `Next up: ${nextScenario.title}. Reset your chain and move fast.`;
  addLog(
    "Round clear",
    `${currentScenario().title} stabilized. Preparing ${nextScenario.title}.`
  );
  updateHud();

  state.nextRoundTimer = window.setTimeout(() => {
    beginRound(nextRoundIndex);
    state.nextRoundTimer = null;
  }, 1400);
}

function winMatch() {
  stopRoundTimer();
  state.won = true;
  state.locked = true;
  clearBlockers();
  elements.arenaStage.classList.add("match-won");
  elements.arenaBoard.classList.add("victory");
  setEvent(
    "System stable",
    `All incidents cleared. Final score: ${state.score}.`,
    "success"
  );
  elements.comboHint.textContent =
    "Perfect. You held the room together across launch pressure, event traffic, and hotfix chaos.";
  addLog(
    "Match won",
    `All three incidents stabilized. Final score: ${state.score} with a streak of ${state.streak}.`
  );
  pulseArena("success");
  updateHud();
}

function handleCorrectCard(cardId) {
  clearTimeoutKey("resetTimer");
  state.failedStep = null;
  if (state.blockers.length) {
    clearBlockers();
  }

  const slotIndex = state.progressIndex;
  createDeployToken(cardId, "good", slotIndex);
  state.deployed.push(cardId);
  state.progressIndex += 1;
  state.streak += 1;
  state.score += 55 + state.streak * 10 + Math.max(state.roundIndex, 0) * 15;

  const isFinalStep = state.progressIndex === sequence.length;
  const nextCard = sequence[state.progressIndex];

  setEvent(
    isFinalStep ? "Sequence complete" : "Action deployed",
    cards[cardId].description,
    "success"
  );

  if (cardId === "team") {
    elements.comboHint.textContent = "Efficient coordination ensures smooth delivery.";
  } else if (!isFinalStep && nextCard) {
    elements.comboHint.textContent = `Next deploy: ${cards[nextCard].name}.`;
  }

  addLog(cards[cardId].name, cards[cardId].log);
  pulseArena("success");
  updateHud();

  if (isFinalStep) {
    state.score += currentScenario().roundBonus;
    advanceRound();
  }
}

function handleWrongCard(cardId) {
  const expectedCardId = sequence[state.progressIndex];
  state.failedStep = state.progressIndex;
  state.streak = 0;
  state.score = Math.max(0, state.score - 35);
  createDeployToken(cardId, "risk");
  spawnBlocker("Blocker detected: dependency unresolved. Progress delayed.");
  setEvent(
    "Blocker detected",
    "Incorrect sequence introduces blockers. Dependency unresolved. Progress delayed.",
    "error"
  );
  elements.comboHint.textContent =
    "You lost momentum. Reset the chain and get the system back under control.";
  addLog(
    "Sequence broken",
    `${cards[cardId].name} was deployed too early. Expected ${cards[expectedCardId].name}.`
  );

  if (navigator.vibrate) {
    navigator.vibrate([120, 40, 120]);
  }

  pulseArena("error");
  queueProgressReset();
  updateHud();
}

function handleTimeout() {
  if (!state.started || state.locked || state.won) {
    return;
  }

  stopRoundTimer();
  state.locked = true;
  state.streak = 0;
  state.score = Math.max(0, state.score - 60);
  spawnBlocker("The incident timer expired. The system slipped into escalation.");
  setEvent(
    "Escalation",
    "The clock ran out. The incident restarted and the team lost momentum.",
    "error"
  );
  elements.comboHint.textContent =
    "Pressure spiked. Resetting the round so you can restabilize the system.";
  addLog(
    "Timer expired",
    `${currentScenario().title} escalated. The round is restarting under pressure.`
  );
  pulseArena("error");
  updateHud();

  clearTimeoutKey("nextRoundTimer");
  state.nextRoundTimer = window.setTimeout(() => {
    beginRound(state.roundIndex, true);
    state.nextRoundTimer = null;
  }, 1400);
}

function deployCard(cardId) {
  if (!state.started || state.locked || state.won) {
    return;
  }

  const expectedCardId = sequence[state.progressIndex];
  if (cardId === expectedCardId) {
    handleCorrectCard(cardId);
    return;
  }

  handleWrongCard(cardId);
}

function startGame() {
  if (state.started) {
    return;
  }

  state.started = true;
  state.score = 0;
  state.streak = 0;
  state.logEntries = [];
  beginRound(0);
  addLog("Game started", "Three live incidents are active. Stabilize them all before the room melts down.");
  updateHud();
}

function resetMatch() {
  stopRoundTimer();
  clearTimeoutKey("feedbackTimer");
  clearTimeoutKey("resetTimer");
  clearTimeoutKey("nextRoundTimer");

  state.started = false;
  state.roundIndex = -1;
  state.progressIndex = 0;
  state.deployed = [];
  state.logEntries = [];
  state.won = false;
  state.locked = false;
  state.failedStep = null;
  state.score = 0;
  state.streak = 0;
  state.timerDuration = scenarios[0].duration;
  state.timerRemaining = scenarios[0].duration;

  clearDeployedTokens();
  clearBlockers(true);
  elements.arenaStage.classList.remove(
    "feedback-success",
    "feedback-error",
    "feedback-warning",
    "match-won"
  );
  elements.arenaBoard.classList.remove("shake", "victory");

  setEvent("Play game", "Click PLAY GAME to begin the match.");
  elements.comboHint.textContent =
    "Three live incidents are queued. Click PLAY GAME and stabilize them all.";
  addLog("Match ready", "Click PLAY GAME, then clear three escalating live-op incidents.");
  updateHud();
}

elements.cards.forEach((button) => {
  button.addEventListener("click", () => deployCard(button.dataset.card));
});

elements.playButton.addEventListener("click", startGame);
elements.resetButton.addEventListener("click", resetMatch);

resetMatch();
