// ═══════════════════════════════════════
//  HSK Learn — TEACH → TEST → READ flow
// ═══════════════════════════════════════

const BASE_URL = "https://raw.githubusercontent.com/tesla2oo2/hskjson/main/";
const SESSION_SIZE = 30;
const QWEN_API_KEY = "YOUR_DASHSCOPE_API_KEY"; // ← paste your key here

const hskData = {
  "2.0": { label: "HSK 2.0", levels: [1, 2, 3, 4, 5, 6] },
  "3.0": { label: "HSK 3.0", levels: [1, 2, 3, 4, 5, 6, "7-9"] },
};

// ── State ──────────────────────────────
let allWords      = [];   // full level word list
let sessionWords  = [];   // 30 words for this session
let sessionIndex  = 0;    // which session (0-based)
let totalSessions = 0;
let cardIndex     = 0;    // position inside TEACH or TEST
let phase         = "";   // "teach" | "test" | "read"
let testAnswered  = false;

// ── Helpers ────────────────────────────
const app = () => document.getElementById("app");

function wordMeaning(word) {
  return (word.forms?.[0]?.meanings || ["?"]).join("; ");
}
function wordPinyin(word) {
  return word.forms?.[0]?.transcriptions?.pinyin || "";
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function pickWrongOptions(correct, pool) {
  const others = pool
    .filter(w => w.simplified !== correct.simplified)
    .map(w => wordMeaning(w));
  return shuffle(others).slice(0, 3);
}

// ── Screens ────────────────────────────

function renderHome() {
  app().innerHTML = `
    <div class="screen home">
      <h1>汉语 Learn</h1>
      <p class="sub">Pick your HSK version</p>
      <div class="btn-group">
        <button class="pill" onclick="renderLevels('2.0')">HSK 2.0</button>
        <button class="pill" onclick="renderLevels('3.0')">HSK 3.0</button>
      </div>
    </div>`;
}

function renderLevels(version) {
  const { label, levels } = hskData[version];
  app().innerHTML = `
    <div class="screen">
      <button class="back" onclick="renderHome()">← Back</button>
      <h2>${label}</h2>
      <div class="btn-group">
        ${levels.map(l => `<button class="pill" onclick="loadLevel('${version}','${l}')">Level ${l}</button>`).join("")}
      </div>
    </div>`;
}

async function loadLevel(version, level) {
  app().innerHTML = `<div class="screen"><p class="loading">Loading…</p></div>`;

  let filename = version === "2.0"
    ? `hsk${level}.json`
    : level === "7-9" ? "hsk7-9n.json" : `hsk${level}n.json`;

  try {
    const res = await fetch(`${BASE_URL}${filename}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allWords = await res.json();
    totalSessions = Math.ceil(allWords.length / SESSION_SIZE);
    renderSessionPicker(version, level);
  } catch (err) {
    app().innerHTML = `<div class="screen"><p class="error">Failed: ${err.message}</p></div>`;
  }
}

function renderSessionPicker(version, level) {
  const rows = Array.from({ length: totalSessions }, (_, i) => {
    const start = i * SESSION_SIZE + 1;
    const end   = Math.min((i + 1) * SESSION_SIZE, allWords.length);
    return `<button class="pill session-btn" onclick="startSession(${i})">
      Session ${i + 1} <span class="muted">${start}–${end}</span>
    </button>`;
  }).join("");

  app().innerHTML = `
    <div class="screen">
      <button class="back" onclick="renderLevels('${version}')">← Back</button>
      <h2>HSK ${version} · Level ${level}</h2>
      <p class="sub">${allWords.length} words · ${SESSION_SIZE}/session</p>
      <div class="btn-group">${rows}</div>
    </div>`;
}

function startSession(idx) {
  sessionIndex  = idx;
  sessionWords  = allWords.slice(idx * SESSION_SIZE, (idx + 1) * SESSION_SIZE);
  cardIndex     = 0;
  phase         = "teach";
  renderTeach();
}

// ── TEACH phase ────────────────────────
function renderTeach() {
  const word    = sessionWords[cardIndex];
  const total   = sessionWords.length;
  const progress = ((cardIndex + 1) / total) * 100;

  app().innerHTML = `
    <div class="screen card-screen">
      <div class="topbar">
        <span class="phase-label">LEARN</span>
        <span class="counter">${cardIndex + 1} / ${total}</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>

      <div class="card teach-card">
        <div class="hanzi">${word.simplified}</div>
        <div class="pinyin">${wordPinyin(word)}</div>
        <div class="meaning">${wordMeaning(word)}</div>
        ${word.radical ? `<div class="meta">Radical: ${word.radical} · ${(word.pos || []).join(", ")}</div>` : ""}
      </div>

      <div class="nav-row">
        ${cardIndex > 0 ? `<button class="ghost" onclick="teachNav(-1)">← Prev</button>` : `<span></span>`}
        <button class="pill primary" onclick="teachNav(1)">
          ${cardIndex < total - 1 ? "Next →" : "Start Quiz →"}
        </button>
      </div>
    </div>`;
}

function teachNav(dir) {
  cardIndex += dir;
  if (cardIndex >= sessionWords.length) {
    cardIndex = 0;
    phase = "test";
    renderTest();
  } else {
    renderTeach();
  }
}

// ── TEST phase ─────────────────────────
function renderTest() {
  const word    = sessionWords[cardIndex];
  const total   = sessionWords.length;
  const progress = ((cardIndex + 1) / total) * 100;

  const correct   = wordMeaning(word);
  const wrongs    = pickWrongOptions(word, sessionWords);
  const options   = shuffle([correct, ...wrongs]);

  app().innerHTML = `
    <div class="screen card-screen">
      <div class="topbar">
        <span class="phase-label quiz">QUIZ</span>
        <span class="counter">${cardIndex + 1} / ${total}</span>
      </div>
      <div class="progress-bar"><div class="progress-fill quiz" style="width:${progress}%"></div></div>

      <div class="card quiz-card">
        <div class="hanzi">${word.simplified}</div>
        <div class="pinyin">${wordPinyin(word)}</div>
      </div>

      <div class="options" id="options">
        ${options.map(opt => `
          <button class="option-btn" onclick="checkAnswer(this,'${esc(opt)}','${esc(correct)}')">
            ${opt}
          </button>`).join("")}
      </div>
    </div>`;
}

function esc(s) { return s.replace(/'/g, "\\'"); }

function checkAnswer(btn, chosen, correct) {
  if (testAnswered) return;
  testAnswered = true;

  document.querySelectorAll(".option-btn").forEach(b => {
    b.disabled = true;
    if (b.textContent.trim() === correct) b.classList.add("correct");
  });

  if (chosen === correct) {
    btn.classList.add("correct");
  } else {
    btn.classList.add("wrong");
  }

  setTimeout(() => {
    testAnswered = false;
    cardIndex++;
    if (cardIndex >= sessionWords.length) {
      phase = "read";
      renderRead();
    } else {
      renderTest();
    }
  }, 900);
}

// ── READ phase ─────────────────────────
async function renderRead() {
  app().innerHTML = `
    <div class="screen card-screen">
      <div class="topbar">
        <span class="phase-label read">READ</span>
        <span class="counter">AI Text</span>
      </div>
      <div class="card read-card">
        <p class="loading">✨ Generating your story…</p>
      </div>
    </div>`;

  const wordList = sessionWords.map(w => w.simplified).join("、");
  const prompt   = `你是中文老师。用以下词语写一段简短的故事或段落，50到100个汉字，难度适合HSK学习者。只写汉字和标点，不加拼音或翻译。词语：${wordList}`;

  try {
    const res = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${QWEN_API_KEY}`
      },
      body: JSON.stringify({
        model: "qwen-plus",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300
      })
    });

    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "No response.";
    renderReadResult(text);

  } catch (err) {
    renderReadResult(null, err.message);
  }
}

function renderReadResult(text, error) {
  app().innerHTML = `
    <div class="screen card-screen">
      <div class="topbar">
        <span class="phase-label read">READ</span>
        <span class="counter">Session ${sessionIndex + 1} complete 🎉</span>
      </div>

      <div class="card read-card">
        ${error
          ? `<p class="error">AI failed: ${error}<br><small>Check your API key or try again.</small></p>`
          : `<p class="story">${text}</p>`}
      </div>

      <div class="nav-row center">
        <button class="pill primary" onclick="startSession(${sessionIndex})">↺ Redo Session</button>
        ${sessionIndex + 1 < totalSessions
          ? `<button class="pill" onclick="startSession(${sessionIndex + 1})">Next Session →</button>`
          : ""}
      </div>
    </div>`;
}

// ── Start ──────────────────────────────
renderHome();
