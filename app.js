const CANVAS_WIDTH = 3200;
const CANVAS_HEIGHT = 2200;
const NODE_WIDTH = 184;
const NODE_BASE_HEIGHT = 116;

const roles = {
  producer: "Producer",
  herbivore: "Herbivore",
  predator: "Predator",
  parasite: "Parasite",
  decomposer: "Decomposer",
  apex: "Apex threat",
};

const seedData = {
  organisms: [
    {
      id: createId(),
      name: "Fungal Tower",
      role: "producer",
      notes: "Chemosynthetic fungal pillars that feed on mineral vents and lightless moisture.",
      x: 420,
      y: 420,
      image: "",
    },
    {
      id: createId(),
      name: "Amber Aphid Herd",
      role: "herbivore",
      notes: "Soft-bodied grazers farmed by ant descendants for sweet resin secretions.",
      x: 980,
      y: 780,
      image: "",
    },
    {
      id: createId(),
      name: "Glass-Mandible Ant",
      role: "predator",
      notes: "Fast tunnel hunter with transparent cutting jaws and vibration tracking.",
      x: 1540,
      y: 470,
      image: "",
    },
    {
      id: createId(),
      name: "Spore Wasp",
      role: "parasite",
      notes: "Injects larvae into aphid herds, then spreads mind-altering spores.",
      x: 1980,
      y: 940,
      image: "",
    },
    {
      id: createId(),
      name: "Bone Mold",
      role: "decomposer",
      notes: "Breaks down dead shells and returns calcium to the fungal towers.",
      x: 1220,
      y: 1390,
      image: "",
    },
    {
      id: createId(),
      name: "The Hollow Queen",
      role: "apex",
      notes: "A colony-sized horror organism that imitates ant pheromones to control wars.",
      x: 2180,
      y: 350,
      image: "",
    },
  ],
  links: [],
};

seedData.links = [
  { id: createId(), source: seedData.organisms[1].id, target: seedData.organisms[0].id, type: "eats" },
  { id: createId(), source: seedData.organisms[2].id, target: seedData.organisms[1].id, type: "eats" },
  { id: createId(), source: seedData.organisms[3].id, target: seedData.organisms[1].id, type: "infects" },
  { id: createId(), source: seedData.organisms[4].id, target: seedData.organisms[2].id, type: "eats" },
  { id: createId(), source: seedData.organisms[5].id, target: seedData.organisms[2].id, type: "hosts" },
];

let state = normalizeState(JSON.parse(localStorage.getItem("motd-ecosystem-map")) || cloneSeed());
let selectedId = state.organisms[0]?.id || null;
let labelsVisible = true;
let view = JSON.parse(localStorage.getItem("motd-ecosystem-view")) || { scale: 0.72, x: 60, y: 60 };
let undoStack = [];

const shell = document.querySelector(".app-shell");
const viewport = document.querySelector("#canvas-viewport");
const stage = document.querySelector("#map-stage");
const canvas = document.querySelector("#map-canvas");
const lines = document.querySelector("#map-lines");
const organismForm = document.querySelector("#organism-form");
const linkForm = document.querySelector("#link-form");
const linkSource = document.querySelector("#link-source");
const linkTarget = document.querySelector("#link-target");
const detailForm = document.querySelector("#detail-form");
const emptyDetail = document.querySelector("#empty-detail");
const checks = document.querySelector("#checks");

function save() {
  localStorage.setItem("motd-ecosystem-map", JSON.stringify(state));
  localStorage.setItem("motd-ecosystem-view", JSON.stringify(view));
}

function pushUndo() {
  undoStack.push(JSON.stringify(state));
  if (undoStack.length > 80) undoStack.shift();
}

function undo() {
  const previous = undoStack.pop();
  if (!previous) return;
  state = normalizeState(JSON.parse(previous));
  selectedId = state.organisms.some((organism) => organism.id === selectedId) ? selectedId : state.organisms[0]?.id || null;
  render();
}

function render() {
  renderNodes();
  renderLines();
  renderSelects();
  renderDetail();
  renderChecks();
  applyView();
  document.querySelector("#map-summary").textContent =
    `${state.organisms.length} organisms and ${state.links.length} relationships. Pan the board and zoom for complex worlds.`;
  save();
}

function renderNodes() {
  canvas.innerHTML = "";
  state.organisms.forEach((organism) => {
    const node = document.createElement("article");
    node.className = `node ${organism.role}${organism.id === selectedId ? " selected" : ""}`;
    node.style.left = `${organism.x}px`;
    node.style.top = `${organism.y}px`;
    node.dataset.id = organism.id;
    node.innerHTML = `
      ${organism.image ? `<img class="node-image" src="${organism.image}" alt="">` : ""}
      <strong>${escapeHtml(organism.name)}</strong>
      <small>${roles[organism.role]}</small>
      <p>${labelsVisible ? escapeHtml(organism.notes || "No niche notes yet.") : ""}</p>
    `;
    node.addEventListener("pointerdown", startNodeDrag);
    node.addEventListener("click", (event) => {
      event.stopPropagation();
      selectedId = organism.id;
      render();
    });
    canvas.appendChild(node);
  });
}

function renderLines() {
  lines.innerHTML = "";
  lines.setAttribute("viewBox", `0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`);
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  defs.innerHTML = `
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#f1b749"></path>
    </marker>
  `;
  lines.appendChild(defs);

  state.links.forEach((link) => {
    const source = state.organisms.find((item) => item.id === link.source);
    const target = state.organisms.find((item) => item.id === link.target);
    if (!source || !target) return;

    const x1 = source.x + NODE_WIDTH / 2;
    const y1 = source.y + nodeHeight(source) / 2;
    const x2 = target.x + NODE_WIDTH / 2;
    const y2 = target.y + nodeHeight(target) / 2;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    line.setAttribute("stroke", "#f1b749");
    line.setAttribute("stroke-width", "2");
    line.setAttribute("stroke-opacity", "0.78");
    line.setAttribute("marker-end", "url(#arrow)");
    lines.appendChild(line);

    if (labelsVisible) {
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", (x1 + x2) / 2);
      label.setAttribute("y", (y1 + y2) / 2 - 8);
      label.setAttribute("fill", "#fffaf0");
      label.setAttribute("font-size", "12");
      label.setAttribute("font-weight", "800");
      label.setAttribute("text-anchor", "middle");
      label.textContent = link.type;
      lines.appendChild(label);
    }
  });
}

function renderSelects() {
  const options = state.organisms.map((organism) => `<option value="${organism.id}">${escapeHtml(organism.name)}</option>`).join("");
  linkSource.innerHTML = options;
  linkTarget.innerHTML = options;
}

function renderDetail() {
  const organism = state.organisms.find((item) => item.id === selectedId);
  detailForm.classList.toggle("hidden", !organism);
  emptyDetail.classList.toggle("hidden", Boolean(organism));
  if (!organism) return;

  document.querySelector("#detail-name").value = organism.name;
  document.querySelector("#detail-role").value = organism.role;
  document.querySelector("#detail-notes").value = organism.notes;
  detailForm.querySelector(".image-preview")?.remove();
  if (organism.image) {
    const preview = document.createElement("img");
    preview.className = "image-preview";
    preview.src = organism.image;
    preview.alt = "";
    detailForm.prepend(preview);
  }
}

function renderChecks() {
  const roleCounts = state.organisms.reduce((acc, item) => {
    acc[item.role] = (acc[item.role] || 0) + 1;
    return acc;
  }, {});
  const messages = [
    {
      good: Boolean(roleCounts.producer),
      text: roleCounts.producer ? "Energy source exists." : "Add at least one producer or energy source.",
    },
    {
      good: state.links.length >= Math.max(1, state.organisms.length - 2),
      text: "Connect more organisms so the ecosystem has visible dependencies.",
    },
    {
      good: Boolean(roleCounts.decomposer),
      text: roleCounts.decomposer ? "Decomposition loop exists." : "Add decomposers so dead matter returns to the system.",
    },
    {
      good: Boolean(roleCounts.predator || roleCounts.apex),
      text: roleCounts.predator || roleCounts.apex ? "Predation pressure exists." : "Add predator pressure to drive adaptation.",
    },
  ];
  checks.innerHTML = messages
    .map((message) => `<li class="${message.good ? "good" : ""}">${message.text}</li>`)
    .join("");
}

function startNodeDrag(event) {
  event.stopPropagation();
  const id = event.currentTarget.dataset.id;
  const node = event.currentTarget;
  const organism = state.organisms.find((item) => item.id === id);
  const start = screenToWorld(event.clientX, event.clientY);
  const origin = { x: organism.x, y: organism.y };
  let moved = false;

  selectedId = id;
  renderDetail();
  document.querySelectorAll(".node").forEach((item) => item.classList.toggle("selected", item.dataset.id === id));
  node.setPointerCapture(event.pointerId);

  const move = (moveEvent) => {
    const current = screenToWorld(moveEvent.clientX, moveEvent.clientY);
    const dx = current.x - start.x;
    const dy = current.y - start.y;
    if (!moved && Math.hypot(dx, dy) > 3) {
      pushUndo();
      moved = true;
    }
    organism.x = clamp(origin.x + dx, 0, CANVAS_WIDTH - NODE_WIDTH);
    organism.y = clamp(origin.y + dy, 0, CANVAS_HEIGHT - NODE_BASE_HEIGHT);
    node.style.left = `${organism.x}px`;
    node.style.top = `${organism.y}px`;
    renderLines();
    save();
  };

  const stop = () => {
    node.removeEventListener("pointermove", move);
    node.removeEventListener("pointerup", stop);
  };

  node.addEventListener("pointermove", move);
  node.addEventListener("pointerup", stop);
}

function startPan(event) {
  if (event.target.closest(".node") || event.target.closest("button") || event.target.closest(".legend")) return;
  const start = { x: event.clientX, y: event.clientY, viewX: view.x, viewY: view.y };
  viewport.setPointerCapture(event.pointerId);

  const move = (moveEvent) => {
    view.x = start.viewX + moveEvent.clientX - start.x;
    view.y = start.viewY + moveEvent.clientY - start.y;
    applyView();
    save();
  };

  const stop = () => {
    viewport.removeEventListener("pointermove", move);
    viewport.removeEventListener("pointerup", stop);
  };

  viewport.addEventListener("pointermove", move);
  viewport.addEventListener("pointerup", stop);
}

function applyView() {
  stage.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
  document.querySelector("#zoom-level").textContent = `${Math.round(view.scale * 100)}%`;
}

function zoomAt(nextScale, clientX = viewport.getBoundingClientRect().left + viewport.clientWidth / 2, clientY = viewport.getBoundingClientRect().top + viewport.clientHeight / 2) {
  const rect = viewport.getBoundingClientRect();
  const before = screenToWorld(clientX, clientY);
  view.scale = clamp(nextScale, 0.25, 1.8);
  view.x = clientX - rect.left - before.x * view.scale;
  view.y = clientY - rect.top - before.y * view.scale;
  applyView();
  save();
}

function screenToWorld(clientX, clientY) {
  const rect = viewport.getBoundingClientRect();
  return {
    x: (clientX - rect.left - view.x) / view.scale,
    y: (clientY - rect.top - view.y) / view.scale,
  };
}

organismForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  pushUndo();
  const image = await readImageInput(document.querySelector("#organism-image"));
  const center = screenToWorld(viewport.getBoundingClientRect().left + viewport.clientWidth / 2, viewport.getBoundingClientRect().top + viewport.clientHeight / 2);
  const organism = {
    id: createId(),
    name: document.querySelector("#organism-name").value.trim(),
    role: document.querySelector("#organism-role").value,
    notes: document.querySelector("#organism-notes").value.trim(),
    x: clamp(center.x - NODE_WIDTH / 2 + Math.random() * 80 - 40, 0, CANVAS_WIDTH - NODE_WIDTH),
    y: clamp(center.y - NODE_BASE_HEIGHT / 2 + Math.random() * 80 - 40, 0, CANVAS_HEIGHT - NODE_BASE_HEIGHT),
    image,
  };
  state.organisms.push(organism);
  selectedId = organism.id;
  organismForm.reset();
  render();
});

linkForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!linkSource.value || !linkTarget.value || linkSource.value === linkTarget.value) return;
  pushUndo();
  state.links.push({
    id: createId(),
    source: linkSource.value,
    target: linkTarget.value,
    type: document.querySelector("#link-type").value,
  });
  render();
});

detailForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const organism = state.organisms.find((item) => item.id === selectedId);
  if (!organism) return;
  pushUndo();
  const image = await readImageInput(document.querySelector("#detail-image"));
  organism.name = document.querySelector("#detail-name").value.trim();
  organism.role = document.querySelector("#detail-role").value;
  organism.notes = document.querySelector("#detail-notes").value.trim();
  if (image) organism.image = image;
  document.querySelector("#detail-image").value = "";
  render();
});

document.querySelector("#delete-organism").addEventListener("click", () => {
  pushUndo();
  state.organisms = state.organisms.filter((item) => item.id !== selectedId);
  state.links = state.links.filter((link) => link.source !== selectedId && link.target !== selectedId);
  selectedId = state.organisms[0]?.id || null;
  render();
});

document.querySelector("#remove-image").addEventListener("click", () => {
  const organism = state.organisms.find((item) => item.id === selectedId);
  if (!organism || !organism.image) return;
  pushUndo();
  organism.image = "";
  document.querySelector("#detail-image").value = "";
  render();
});

document.querySelector("#seed-world").addEventListener("click", () => {
  pushUndo();
  state = cloneSeed();
  selectedId = state.organisms[0].id;
  render();
});

document.querySelector("#clear-world").addEventListener("click", () => {
  pushUndo();
  state = { organisms: [], links: [] };
  selectedId = null;
  render();
});

document.querySelector("#arrange-map").addEventListener("click", () => {
  pushUndo();
  const byRole = { producer: 320, herbivore: 760, decomposer: 1180, parasite: 1600, predator: 2050, apex: 2540 };
  state.organisms.forEach((organism, index) => {
    organism.x = byRole[organism.role] || 1200;
    organism.y = 260 + (index % 8) * 210;
  });
  render();
});

document.querySelector("#toggle-labels").addEventListener("click", (event) => {
  labelsVisible = !labelsVisible;
  event.currentTarget.textContent = labelsVisible ? "Labels on" : "Labels off";
  event.currentTarget.setAttribute("aria-pressed", String(labelsVisible));
  render();
});

document.querySelector("#toggle-sidebar").addEventListener("click", (event) => {
  shell.classList.toggle("sidebar-hidden");
  event.currentTarget.textContent = shell.classList.contains("sidebar-hidden") ? "Show left" : "Hide left";
});

document.querySelector("#toggle-inspector").addEventListener("click", (event) => {
  shell.classList.toggle("inspector-hidden");
  event.currentTarget.textContent = shell.classList.contains("inspector-hidden") ? "Show right" : "Hide right";
});

document.querySelector("#focus-canvas").addEventListener("click", () => {
  const focused = shell.classList.contains("sidebar-hidden") && shell.classList.contains("inspector-hidden");
  shell.classList.toggle("sidebar-hidden", !focused);
  shell.classList.toggle("inspector-hidden", !focused);
  document.querySelector("#toggle-sidebar").textContent = focused ? "Hide left" : "Show left";
  document.querySelector("#toggle-inspector").textContent = focused ? "Hide right" : "Show right";
});

document.querySelector("#zoom-in").addEventListener("click", () => zoomAt(view.scale * 1.15));
document.querySelector("#zoom-out").addEventListener("click", () => zoomAt(view.scale / 1.15));
document.querySelector("#zoom-reset").addEventListener("click", () => {
  view = { scale: 0.72, x: 60, y: 60 };
  applyView();
  save();
});

document.querySelector("#export-world").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "motd-ecosystem-map.json";
  link.click();
  URL.revokeObjectURL(link.href);
});

document.querySelector("#import-world").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const imported = JSON.parse(await file.text());
  if (!Array.isArray(imported.organisms) || !Array.isArray(imported.links)) return;
  pushUndo();
  state = normalizeState(imported);
  selectedId = state.organisms[0]?.id || null;
  render();
});

viewport.addEventListener("pointerdown", startPan);
viewport.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    const factor = event.deltaY > 0 ? 0.9 : 1.1;
    zoomAt(view.scale * factor, event.clientX, event.clientY);
  },
  { passive: false },
);

document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    undo();
  }
});

window.addEventListener("resize", applyView);

async function readImageInput(input) {
  const file = input.files?.[0];
  if (!file) return "";
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return entities[character];
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createId() {
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function cloneSeed() {
  return JSON.parse(JSON.stringify(seedData));
}

function nodeHeight(organism) {
  return organism.image ? 230 : NODE_BASE_HEIGHT;
}

function normalizeState(nextState) {
  const normalized = {
    organisms: Array.isArray(nextState.organisms) ? nextState.organisms : [],
    links: Array.isArray(nextState.links) ? nextState.links : [],
  };
  normalized.organisms = normalized.organisms.map((organism, index) => {
    const percentLike = organism.x <= 100 && organism.y <= 100;
    return {
      id: organism.id || createId(),
      name: organism.name || "Unnamed organism",
      role: roles[organism.role] ? organism.role : "producer",
      notes: organism.notes || "",
      image: organism.image || "",
      x: percentLike ? (organism.x / 100) * CANVAS_WIDTH : clamp(Number(organism.x) || 220 + index * 80, 0, CANVAS_WIDTH - NODE_WIDTH),
      y: percentLike ? (organism.y / 100) * CANVAS_HEIGHT : clamp(Number(organism.y) || 220 + index * 80, 0, CANVAS_HEIGHT - NODE_BASE_HEIGHT),
    };
  });
  normalized.links = normalized.links
    .filter((link) => normalized.organisms.some((item) => item.id === link.source) && normalized.organisms.some((item) => item.id === link.target))
    .map((link) => ({
      id: link.id || createId(),
      source: link.source,
      target: link.target,
      type: link.type || "eats",
    }));
  return normalized;
}

render();
