// ✅ HSK Vocabulary App (One word at a time + GitHub fetch)
const BASE_URL = "https://raw.githubusercontent.com/tesla2oo2/hskjson/main/"; // ← change this

const hskData = {
  "2.0": { version: "HSK 2.0", levels: [1, 2, 3, 4, 5, 6] },
  "3.0": { version: "HSK 3.0", levels: [1, 2, 3, 4, 5, 6, "7-9"] },
};

const versionContainer = document.getElementById("version-container");
const levelContainer = document.getElementById("level-container");
const vocabContainer = document.getElementById("vocab-container");

let currentList = [];
let currentIndex = 0;

// ✅ Show versions
function showVersions() {
  levelContainer.innerHTML = "";
  vocabContainer.innerHTML = "";
  versionContainer.innerHTML = `
    <button class="primary" onclick="showLevels('2.0')">HSK 2.0</button>
    <button class="primary" onclick="showLevels('3.0')">HSK 3.0</button>
  `;
}

// ✅ Show levels for version
function showLevels(version) {
  const { levels } = hskData[version];
  versionContainer.innerHTML = `
    <button onclick="showVersions()">← Back</button>
    <h2>${hskData[version].version}</h2>
  `;
  levelContainer.innerHTML = levels
    .map(
      (level) =>
        `<button onclick="loadVocab('${version}', '${level}')">Level ${level}</button>`
    )
    .join("");
  vocabContainer.innerHTML = "";
}

// ✅ Load vocab from GitHub
async function loadVocab(version, level) {
  vocabContainer.innerHTML = `<p>Loading HSK ${version} Level ${level}...</p>`;
  let filename;
  if (version === "2.0") filename = `hsk${level}.json`;
  else filename = level === "7-9" ? "hsk7-9n.json" : `hsk${level}n.json`;

  const url = `${BASE_URL}${filename}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    currentList = await res.json();
    currentIndex = 0;
    showWord();
  } catch (err) {
    vocabContainer.innerHTML = `<p style="color:red;">Failed to load: ${err.message}</p>`;
    console.error(err);
  }
}

// ✅ Show current word
function showWord() {
  if (!currentList.length) {
    vocabContainer.innerHTML = "<p>No words loaded.</p>";
    return;
  }

  const word = currentList[currentIndex];
  const form = word.forms?.[0];
  vocabContainer.innerHTML = `
    <div class="word-card" style="background:#fff;box-shadow:0 2px 6px rgba(0,0,0,0.1);padding:20px;border-radius:12px;">
      <div style="font-size:2rem;font-weight:600;">${word.simplified}</div>
      <div style="color:#4c6ef5;font-size:1.1rem;margin:5px 0;">${form?.transcriptions?.pinyin || ""}</div>
      <div style="margin-bottom:5px;">${(form?.meanings || []).join("; ")}</div>
      <div style="color:#777;font-size:0.9rem;">Radical: ${word.radical || "-"} • POS: ${(word.pos || []).join(", ")}</div>
    </div>

    <div style="margin-top:15px;">
      <button onclick="prevWord()" style="margin-right:10px;">⬅ Prev</button>
      <button onclick="nextWord()">Next ➡</button>
      <p style="font-size:0.8rem;color:#666;margin-top:6px;">${currentIndex + 1} / ${currentList.length}</p>
    </div>
  `;
}

// ✅ Navigation
function nextWord() {
  if (currentIndex < currentList.length - 1) {
    currentIndex++;
    showWord();
  }
}

function prevWord() {
  if (currentIndex > 0) {
    currentIndex--;
    showWord();
  }
}

// ✅ Start app
showVersions();
