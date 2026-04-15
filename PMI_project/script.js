const cards = {
  track: {
    name: "Track Workstreams",
    cost: 2,
    type: "good",
    metricDelta: { visibility: 16, alignment: 8, flow: 10, efficiency: 6 },
    description:
      "I coordinate 5+ concurrent workstreams and keep ownership and timelines visible.",
    log: "Visibility goes up. Multiple workstreams are now mapped and easier to steer.",
    combo: "A strong opener. Shared visibility makes every follow-up card more effective.",
    preferredAfter: [],
  },
  team: {
    name: "Team Coordination",
    cost: 2,
    type: "good",
    metricDelta: { visibility: 6, alignment: 16, flow: 12, efficiency: 6 },
    description:
      "I work cross-functionally so timelines, owners, and handoffs stay aligned.",
    log: "Teams lock into the same beat. Handoffs feel cleaner and less reactive.",
    combo:
      "Great timing. Coordination right after visibility creates a smooth operating rhythm.",
    preferredAfter: ["track"],
  },
  dashboard: {
    name: "Maintain Dashboards",
    cost: 3,
    type: "good",
    metricDelta: { visibility: 14, alignment: 8, flow: 8, efficiency: 12 },
    description:
      "I build KPI dashboards and reporting that support faster, better decisions.",
    log: "Decision signals sharpen. The team can see progress, drift, and next actions sooner.",
    combo:
      "Dashboards hit harder once workstreams and coordination are already in place.",
    preferredAfter: ["track", "team"],
  },
  resolve: {
    name: "Resolve Blockers",
    cost: 3,
    type: "utility",
    metricDelta: { visibility: 4, alignment: 6, flow: 20, efficiency: 10 },
    description:
      "I identify risks early, follow up persistently, and keep work moving.",
    log: "Risks are surfaced and chased down before they spread through the system.",
    combo:
      "Well timed. Clearing blockers after mapping the work keeps delivery stable under pressure.",
    preferredAfter: ["track", "team", "dashboard"],
  },
  workflow: {
    name: "Improve Workflow",
    cost: 4,
    type: "good",
    metricDelta: { visibility: 8, alignment: 10, flow: 10, efficiency: 18 },
    description:
      "I standardize documentation and refine the process so execution scales better.",
    log: "The system gets lighter. Repeated work shrinks and coordination becomes easier to sustain.",
    combo:
      "Best played once the operation is already visible and stable. Then improvement sticks.",
    preferredAfter: ["track", "team", "dashboard", "resolve"],
  },
};

const state = {
  energy: 6,
  maxEnergy: 10,
  metrics: {
    visibility: 70,
    alignment: 68,
    flow: 66,
    efficiency: 64,
  },
  played: [],
  blockers: [],
  logEntries: [],
};

const recommendedOrder = ["track", "team", "dashboard", "resolve", "workflow"];

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
  resetButton: document.getElementById("resetButton"),
};

const laneTargets = [
  { x: -180, y: -220 },
  { x: 0, y: -170 },
  { x: 180, y: -220 },
  { x: -180, y: -70 },
  { x: 0, y: -30 },
  { x: 180, y: -70 },
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getStatusScore() {
  const metricAverage =
    (state.metrics.visibility +
      state.metrics.alignment +
      state.metrics.flow +
      state.metrics.efficiency) /
    4;
  return clamp(metricAverage - state.blockers.length * 12, 0, 100);
}

function getStatusLabel(score) {
  if (score >= 72) {
    return "On Track";
  }
  if (score >= 52) {
    return "At Risk";
  }
  return "Critical";
}

function updateHud() {
  const score = getStatusScore();
  elements.energyValue.textContent = state.energy;
  elements.energyFill.style.width = `${(state.energy / state.maxEnergy) * 100}%`;
  elements.visibilityValue.textContent = state.metrics.visibility;
  elements.alignmentValue.textContent = state.metrics.alignment;
  elements.flowValue.textContent = state.metrics.flow;
  elements.efficiencyValue.textContent = state.metrics.efficiency;
  elements.statusText.textContent = getStatusLabel(score);
  elements.statusFill.style.width = `${score}%`;

  document.body.classList.remove("status-ok", "status-risk", "status-danger");
  if (score >= 72) {
    document.body.classList.add("status-ok");
  } else if (score >= 52) {
    document.body.classList.add("status-risk");
  } else {
    document.body.classList.add("status-danger");
  }

  elements.cards.forEach((button) => {
    const card = cards[button.dataset.card];
    const alreadyPlayed = state.played.includes(button.dataset.card);
    const affordable = state.energy >= card.cost;
    button.classList.toggle("spent", alreadyPlayed);
    button.classList.toggle("locked", !affordable || alreadyPlayed);
    button.disabled = !affordable || alreadyPlayed;
  });
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

function setEvent(label, message) {
  const labelNode = elements.systemEvent.querySelector(".event-label");
  const copyNode = elements.systemEvent.querySelector("p");
  labelNode.textContent = label;
  copyNode.textContent = message;
  elements.systemEvent.classList.remove("active");
  window.requestAnimationFrame(() => {
    elements.systemEvent.classList.add("active");
  });
}

function createDeployToken(cardId, positiveSequence) {
  const card = cards[cardId];
  const token = document.createElement("div");
  const target = laneTargets[state.played.length % laneTargets.length];
  token.className = `deploy-token ${positiveSequence ? "good" : "risk"}`;
  token.style.setProperty("--target-x", `${target.x}px`);
  token.style.setProperty("--target-y", `${target.y}px`);
  token.innerHTML = `${card.name}<small>${positiveSequence ? "smooth deploy" : "recovery move"}</small>`;
  elements.arenaOverlay.appendChild(token);
  window.setTimeout(() => token.remove(), 3200);
}

function spawnBlocker(reason) {
  if (state.blockers.length >= 3) {
    return;
  }

  const positions = [
    { top: "28%", left: "18%" },
    { top: "39%", left: "68%" },
    { top: "62%", left: "28%" },
    { top: "57%", left: "72%" },
  ];
  const blocker = document.createElement("div");
  const position = positions[(state.blockers.length + state.played.length) % positions.length];
  blocker.className = "blocker";
  blocker.style.top = position.top;
  blocker.style.left = position.left;
  blocker.dataset.reason = reason;
  elements.blockerLayer.appendChild(blocker);
  state.blockers.push(blocker);
  addLog("Blocker spawned", reason);
}

function clearBlockers(immediate = false) {
  if (!state.blockers.length) {
    return 0;
  }

  const count = state.blockers.length;
  state.blockers.forEach((blocker) => {
    if (immediate) {
      blocker.remove();
      return;
    }

    blocker.classList.add("clearing");
    window.setTimeout(() => blocker.remove(), 520);
  });
  state.blockers = [];
  return count;
}

function applyMetricDelta(delta, bonus = 0) {
  Object.entries(delta).forEach(([metric, amount]) => {
    state.metrics[metric] = clamp(state.metrics[metric] + amount + bonus, 0, 100);
  });
}

function handleSequence(cardId, turnIndex) {
  const expected = recommendedOrder[turnIndex];
  const card = cards[cardId];
  const onSequence = cardId === expected;
  const priorCoverage = card.preferredAfter.every((step) => state.played.includes(step));

  if (cardId === "resolve") {
    const cleared = clearBlockers();
    const bonus = cleared > 0 ? 6 + cleared * 2 : 0;
    applyMetricDelta(card.metricDelta, bonus);
    if (cleared > 0) {
      setEvent("Blockers cleared", "Risks are identified early and followed through to resolution.");
      addLog("Resolve Blockers", `Removed ${cleared} blocker${cleared > 1 ? "s" : ""} and restored flow.`);
      elements.comboHint.textContent =
        "Pressure handled well. Clearing blockers at the right moment keeps delivery moving.";
    } else {
      setEvent("Preventive play", card.description);
      addLog(card.name, card.log);
      elements.comboHint.textContent = card.combo;
    }
    createDeployToken(cardId, true);
    return;
  }

  if (onSequence && priorCoverage) {
    applyMetricDelta(card.metricDelta, 4);
    setEvent("Smooth deployment", card.description);
    addLog(card.name, card.log);
    elements.comboHint.textContent = card.combo;
    createDeployToken(cardId, true);
    return;
  }

  applyMetricDelta(card.metricDelta, -2);
  createDeployToken(cardId, false);

  if (!priorCoverage || !onSequence) {
    const messages = {
      team: "Coordination landed before the full map was visible. A dependency slipped through.",
      dashboard: "Reporting arrived before alignment settled. The numbers surfaced confusion instead of clarity.",
      workflow: "Process changes came in before the system stabilized. Adoption friction appeared.",
      track: "Visibility opened, but pressure is still building across the arena.",
    };
    const blockerReason =
      messages[cardId] || "A sequencing gap created a blocker that now needs attention.";
    spawnBlocker(blockerReason);
    setEvent("System strain", blockerReason);
    addLog(card.name, `${card.log} The timing created extra follow-up work.`);
    elements.comboHint.textContent =
      "You can recover by mapping the work, aligning teams, then clearing blockers before deeper improvements.";
  }
}

function deployCard(cardId) {
  const card = cards[cardId];
  if (state.played.includes(cardId) || state.energy < card.cost) {
    return;
  }

  state.energy -= card.cost;
  handleSequence(cardId, state.played.length);
  state.played.push(cardId);
  updateHud();
}

function regenerateEnergy() {
  if (state.energy < state.maxEnergy) {
    state.energy += 1;
    updateHud();
  }
}

function resetMatch() {
  state.energy = 6;
  state.metrics.visibility = 70;
  state.metrics.alignment = 68;
  state.metrics.flow = 66;
  state.metrics.efficiency = 64;
  state.played = [];
  state.logEntries = [];
  clearBlockers(true);
  elements.arenaOverlay.innerHTML = "";
  setEvent(
    "Ready to deploy",
    "Play cards in sequence to keep delivery smooth and blockers away."
  );
  addLog("Match started", "Project Arena is live. Establish visibility, align the team, then optimize the system.");
  elements.comboHint.textContent =
    "Opening with visibility and coordination creates the smoothest run.";
  updateHud();
}

elements.cards.forEach((button) => {
  button.addEventListener("click", () => deployCard(button.dataset.card));
});

elements.resetButton.addEventListener("click", resetMatch);

window.setInterval(regenerateEnergy, 2800);

resetMatch();
