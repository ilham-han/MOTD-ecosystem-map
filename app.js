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
      x: 7,
      y: 17,
    },
    {
      id: createId(),
      name: "Amber Aphid Herd",
      role: "herbivore",
      notes: "Soft-bodied grazers farmed by ant descendants for sweet resin secretions.",
      x: 31,
      y: 37,
    },
    {
      id: createId(),
      name: "Glass-Mandible Ant",
      role: "predator",
      notes: "Fast tunnel hunter with transparent cutting jaws and vibration tracking.",
      x: 56,
      y: 20,
    },
    {
      id: createId(),
      name: "Spore Wasp",
      role: "parasite",
      notes: "Injects larvae into aphid herds, then spreads mind-altering spores.",
      x: 68,
      y: 53,
    },
    {
      id: createId(),
      name: "Bone Mold",
      role: "decomposer",
      notes: "Breaks down dead shells and returns calcium to the fungal towers.",
      x: 37,
      y: 68,
    },
    {
      id: createId(),
      name: "The Hollow Queen",
      role: "apex",
      notes: "A colony-sized horror organism that imitates ant pheromones to control wars.",
      x: 76,
      y: 15,
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

let state = JSON.parse(localStorage.getItem("motd-ecosystem-map")) || seedData;
let selectedId = state.organisms[0]?.id || null;
let labelsVisible = true;

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
}

function render() {
  renderNodes();
  renderLines();
  renderSelects();
  renderDetail();
  renderChecks();
  document.querySelector("#map-summary").textContent =
    `${state.organisms.length} organisms and ${state.links.length} relationships in this ecosystem.`;
  save();
}

function renderNodes() {
  canvas.innerHTML = "";
  state.organisms.forEach((organism) => {
    const node = document.createElement("article");
    node.className = `node ${organism.role}${organism.id === selectedId ? " selected" : ""}`;
    node.style.left = `${organism.x}%`;
    node.style.top = `${organism.y}%`;
    node.dataset.id = organism.id;
    node.innerHTML = `
      <strong>${escapeHtml(organism.name)}</strong>
      <small>${roles[organism.role]}</small>
      <p>${labelsVisible ? escapeHtml(organism.notes || "No niche notes yet.") : ""}</p>
    `;
    node.addEventListener("pointerdown", startDrag);
    node.addEventListener("click", () => {
      selectedId = organism.id;
      render();
    });
    canvas.appendChild(node);
  });
}

function renderLines() {
  lines.innerHTML = "";
  const rect = canvas.getBoundingClientRect();
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

    const sourceNode = canvas.querySelector(`[data-id="${source.id}"]`);
    const targetNode = canvas.querySelector(`[data-id="${target.id}"]`);
    if (!sourceNode || !targetNode) return;

    const sourceRect = sourceNode.getBoundingClientRect();
    const targetRect = targetNode.getBoundingClientRect();
    const x1 = sourceRect.left - rect.left + sourceRect.width / 2;
    const y1 = sourceRect.top - rect.top + sourceRect.height / 2;
    const x2 = targetRect.left - rect.left + targetRect.width / 2;
    const y2 = targetRect.top - rect.top + targetRect.height / 2;
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

function startDrag(event) {
  const id = event.currentTarget.dataset.id;
  const node = event.currentTarget;
  selectedId = id;
  renderDetail();
  document.querySelectorAll(".node").forEach((item) => item.classList.toggle("selected", item.dataset.id === id));
  node.setPointerCapture(event.pointerId);

  const move = (moveEvent) => {
    const rect = canvas.getBoundingClientRect();
    const organism = state.organisms.find((item) => item.id === id);
    organism.x = clamp(((moveEvent.clientX - rect.left - node.offsetWidth / 2) / rect.width) * 100, 1, 84);
    organism.y = clamp(((moveEvent.clientY - rect.top - node.offsetHeight / 2) / rect.height) * 100, 1, 84);
    node.style.left = `${organism.x}%`;
    node.style.top = `${organism.y}%`;
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

organismForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const organism = {
    id: createId(),
    name: document.querySelector("#organism-name").value.trim(),
    role: document.querySelector("#organism-role").value,
    notes: document.querySelector("#organism-notes").value.trim(),
    x: 12 + Math.random() * 62,
    y: 12 + Math.random() * 58,
  };
  state.organisms.push(organism);
  selectedId = organism.id;
  organismForm.reset();
  render();
});

linkForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!linkSource.value || !linkTarget.value || linkSource.value === linkTarget.value) return;
  state.links.push({
    id: createId(),
    source: linkSource.value,
    target: linkTarget.value,
    type: document.querySelector("#link-type").value,
  });
  render();
});

detailForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const organism = state.organisms.find((item) => item.id === selectedId);
  if (!organism) return;
  organism.name = document.querySelector("#detail-name").value.trim();
  organism.role = document.querySelector("#detail-role").value;
  organism.notes = document.querySelector("#detail-notes").value.trim();
  render();
});

document.querySelector("#delete-organism").addEventListener("click", () => {
  state.organisms = state.organisms.filter((item) => item.id !== selectedId);
  state.links = state.links.filter((link) => link.source !== selectedId && link.target !== selectedId);
  selectedId = state.organisms[0]?.id || null;
  render();
});

document.querySelector("#seed-world").addEventListener("click", () => {
  state = cloneSeed();
  selectedId = state.organisms[0].id;
  render();
});

document.querySelector("#clear-world").addEventListener("click", () => {
  state = { organisms: [], links: [] };
  selectedId = null;
  render();
});

document.querySelector("#arrange-map").addEventListener("click", () => {
  const byRole = { producer: 8, herbivore: 25, decomposer: 38, parasite: 55, predator: 70, apex: 82 };
  state.organisms.forEach((organism, index) => {
    organism.x = byRole[organism.role] || 40;
    organism.y = 10 + (index % 5) * 16;
  });
  render();
});

document.querySelector("#toggle-labels").addEventListener("click", (event) => {
  labelsVisible = !labelsVisible;
  event.currentTarget.textContent = labelsVisible ? "Labels on" : "Labels off";
  event.currentTarget.setAttribute("aria-pressed", String(labelsVisible));
  render();
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
  state = imported;
  selectedId = state.organisms[0]?.id || null;
  render();
});

window.addEventListener("resize", renderLines);

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

render();
