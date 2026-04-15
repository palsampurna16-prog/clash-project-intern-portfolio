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
const baselineMetrics = {
  visibility: 54,
  alignment: 54,
  flow: 54,
  efficiency: 54,
};

const state = {
  progressIndex: 0,
  deployed: [],
  blockers: [],
  logEntries: [],
  won: false,
  locked: false,
  failedStep: null,
  feedbackTimer: null,
  resetTimer: null,
};

const elements = {
  cards: [...document.querySelectorAll(".arena-card")],
  tacticalLog: document.getElementById("tacticalLog"),
  energyValue: document.getElementById("energyValue"),
  energyFill: document.getElementById("energyFill"),
  statusText: document.getElementById("statusText"),
  statusFill: document.getElementById("statusFill"),
  visibilityValue: document.getElementById("visibilityValue"),
  alignmentValue: document.getElementById("alignmentValue"),
  flowValue: document.getElementById("flowValue"),
  efficiencyValue: document.getElementById("efficiencyValue"),
  comboHint: document.getElementById("comboHint"),
  systemEvent: document.getElementById("systemEvent"),
  arenaOverlay: document.getElementById("arenaOverlay"),
  blockerLayer: document.getElementById("blockerLayer"),
  arenaStage: document.getElementById("arenaStage"),
  arenaBoard: document.querySelector(".arena-board"),
  resetButton: document.getElementById("resetButton"),
  sequenceSlots: [...document.querySelectorAll(".sequence-slot")],
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clearTimer(name) {
  if (state[name]) {
    window.clearTimeout(state[name]);
    state[name] = null;
  }
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

  Object.keys(metrics).forEach((key) => {
    metrics[key] = clamp(metrics[key], 0, 100);
  });

  return metrics;
}

function getStatusScore(metrics) {
  const average =
    (metrics.visibility + metrics.alignment + metrics.flow + metrics.efficiency) / 4;
  const completionBonus = state.progressIndex * 6 + (state.won ? 16 : 0);
  return clamp(average + completionBonus, 0, 100);
}

function getStatusLabel(score) {
  if (state.won) {
    return "Stable";
  }
  if (score >= 72) {
    return "On Track";
  }
  if (score >= 52) {
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

function getSlotTarget(stepIndex) {
  const slot = elements.sequenceSlots[stepIndex];
  const overlayRect = elements.arenaOverlay.getBoundingClientRect();
  const slotRect = slot.getBoundingClientRect();
  const startX = overlayRect.width / 2;
  const startY = overlayRect.height - 126;
  const targetX = slotRect.left - overlayRect.left + slotRect.width / 2 - startX;
  const targetY = slotRect.top - overlayRect.top + slotRect.height / 2 - startY;
  return { x: targetX, y: targetY };
}

function createDeployToken(cardId, variant, stepIndex) {
  const card = cards[cardId];
  const token = document.createElement("div");
  const isCorrect = variant === "good";
  const target =
    stepIndex != null ? getSlotTarget(stepIndex) : { x: 0, y: -210 };

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
  elements.arenaStage.classList.add(
    type === "success" ? "feedback-success" : "feedback-error"
  );

  if (type === "error") {
    elements.arenaBoard.classList.remove("shake");
    void elements.arenaBoard.offsetWidth;
    elements.arenaBoard.classList.add("shake");
  }

  clearTimer("feedbackTimer");
  state.feedbackTimer = window.setTimeout(() => {
    elements.arenaStage.classList.remove("feedback-success", "feedback-error");
    elements.arenaBoard.classList.remove("shake");
    state.feedbackTimer = null;
  }, 520);
}

function updateHud() {
  const metrics = getMetrics();
  const score = getStatusScore(metrics);
  elements.energyValue.textContent = state.progressIndex;
  elements.energyFill.style.width = `${(state.progressIndex / sequence.length) * 100}%`;
  elements.visibilityValue.textContent = metrics.visibility;
  elements.alignmentValue.textContent = metrics.alignment;
  elements.flowValue.textContent = metrics.flow;
  elements.efficiencyValue.textContent = metrics.efficiency;
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

  const expectedCard = sequence[state.progressIndex];
  elements.cards.forEach((button) => {
    const cardId = button.dataset.card;
    const isPlaced = state.deployed.includes(cardId);
    button.disabled = state.locked || state.won || isPlaced;
    button.classList.toggle("spent", isPlaced);
    button.classList.toggle("locked", state.locked || state.won || isPlaced);
    button.classList.toggle("next-step", cardId === expectedCard && !state.won && !state.locked);
  });

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
  clearTimer("resetTimer");
  state.locked = true;
  updateHud();
  state.resetTimer = window.setTimeout(() => {
    resetProgress();
    state.locked = false;
    setEvent("Retry sequence", "Deploy actions to maintain system stability.");
    elements.comboHint.textContent = "Incorrect sequence introduces blockers.";
    updateHud();
    state.resetTimer = null;
  }, 900);
}

function winMatch() {
  state.won = true;
  clearBlockers();
  elements.arenaStage.classList.add("match-won");
  elements.arenaBoard.classList.add("victory");
  setEvent(
    "System stable",
    "Live operations running smoothly.",
    "success"
  );
  elements.comboHint.textContent = "Efficient coordination ensures smooth delivery.";
  addLog(
    "Match won",
    "System stable. Live operations are running smoothly after the full deployment chain."
  );
  pulseArena("success");
  updateHud();
}

function handleCorrectCard(cardId) {
  clearTimer("resetTimer");
  state.failedStep = null;
  if (state.blockers.length) {
    clearBlockers();
  }

  const slotIndex = state.progressIndex;
  createDeployToken(cardId, "good", slotIndex);
  state.deployed.push(cardId);
  state.progressIndex += 1;

  const isFinalStep = state.progressIndex === sequence.length;
  const nextCard = sequence[state.progressIndex];

  setEvent(
    isFinalStep ? "Final action deployed" : "Action deployed",
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
    winMatch();
  }
}

function handleWrongCard(cardId) {
  const expectedCardId = sequence[state.progressIndex];
  state.failedStep = state.progressIndex;
  createDeployToken(cardId, "risk");
  spawnBlocker("Blocker detected: dependency unresolved. Progress delayed.");
  setEvent(
    "Blocker detected",
    "Incorrect sequence introduces blockers. Dependency unresolved. Progress delayed.",
    "error"
  );
  elements.comboHint.textContent = "Incorrect sequence introduces blockers.";
  addLog(
    "Sequence broken",
    `${cards[cardId].name} was deployed too early. Restarting the action chain from ${cards[sequence[0]].name}.`
  );

  if (navigator.vibrate) {
    navigator.vibrate([120, 40, 120]);
  }

  pulseArena("error");
  queueProgressReset();
  updateHud();

  if (expectedCardId) {
    addLog("Expected next action", `The next stable play was ${cards[expectedCardId].name}.`);
  }
}

function deployCard(cardId) {
  if (state.locked || state.won) {
    return;
  }

  const expectedCardId = sequence[state.progressIndex];
  if (cardId === expectedCardId) {
    handleCorrectCard(cardId);
    return;
  }

  handleWrongCard(cardId);
}

function resetMatch() {
  clearTimer("feedbackTimer");
  clearTimer("resetTimer");
  state.progressIndex = 0;
  state.deployed = [];
  state.logEntries = [];
  state.won = false;
  state.locked = false;
  state.failedStep = null;
  clearDeployedTokens();
  clearBlockers(true);
  elements.arenaStage.classList.remove("feedback-success", "feedback-error", "match-won");
  elements.arenaBoard.classList.remove("shake", "victory");
  setEvent("Ready to deploy", "Deploy actions to maintain system stability.");
  elements.comboHint.textContent = "Deploy actions to maintain system stability.";
  addLog(
    "Match started",
    "Build the sequence in order. Incorrect sequence introduces blockers."
  );
  updateHud();
}

elements.cards.forEach((button) => {
  button.addEventListener("click", () => deployCard(button.dataset.card));
});

elements.resetButton.addEventListener("click", resetMatch);

resetMatch();
