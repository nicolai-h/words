(() => {
  const card = document.getElementById("card");
  const wordEl = document.getElementById("word");
  const englishEl = document.getElementById("english");
  const progressEl = document.getElementById("progress");
  const levelSelect = document.getElementById("level-select");
  const shuffleBtn = document.getElementById("shuffle-btn");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const knowBtn = document.getElementById("know-btn");
  const settingsBtn = document.getElementById("settings-btn");
  const settingsModal = document.getElementById("settings-modal");
  const closeSettingsBtn = document.getElementById("close-settings-btn");
  const toggleFurigana = document.getElementById("toggle-furigana");
  const toggleHideKnown = document.getElementById("toggle-hide-known");
  const resetKnownBtn = document.getElementById("reset-known-btn");
  const knownCountEl = document.getElementById("known-count");

  const KEY_LEVEL = "japan-words.level";
  const KEY_KNOWN = "japan-words.known";
  const KEY_FURIGANA = "japan-words.furigana";
  const KEY_HIDE_KNOWN = "japan-words.hideKnown";

  let deck = [];
  let index = 0;
  let known = new Set(JSON.parse(localStorage.getItem(KEY_KNOWN) || "[]"));

  // Parse "食[た]べる" → "<ruby>食<rt>た</rt></ruby>べる"
  function renderFurigana(str) {
    let html = "";
    let i = 0;
    while (i < str.length) {
      const bracketStart = str.indexOf("[", i);
      if (bracketStart === -1) {
        html += escapeHtml(str.slice(i));
        break;
      }
      const bracketEnd = str.indexOf("]", bracketStart);
      if (bracketEnd === -1) {
        html += escapeHtml(str.slice(i));
        break;
      }
      let kanjiStart = bracketStart;
      while (kanjiStart > i && isKanji(str.charCodeAt(kanjiStart - 1))) {
        kanjiStart--;
      }
      html += escapeHtml(str.slice(i, kanjiStart));
      const kanji = str.slice(kanjiStart, bracketStart);
      const reading = str.slice(bracketStart + 1, bracketEnd);
      html += `<ruby>${escapeHtml(kanji)}<rt>${escapeHtml(reading)}</rt></ruby>`;
      i = bracketEnd + 1;
    }
    return html;
  }

  function isKanji(code) {
    return code >= 0x4e00 && code <= 0x9fff;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[c]);
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function buildDeck() {
    const level = levelSelect.value;
    const hideKnown = toggleHideKnown.checked;
    let filtered = level === "ALL"
      ? VOCAB.slice()
      : VOCAB.filter((w) => w.level === level);
    if (hideKnown) {
      filtered = filtered.filter((w) => !known.has(w.jp));
    }
    return shuffle(filtered);
  }

  // Unflip without animating, so the new card's back content doesn't briefly
  // flash through during the rotation.
  function resetFlipInstant() {
    if (!card.classList.contains("flipped")) return;
    card.classList.add("no-anim");
    card.classList.remove("flipped");
    // Force reflow so the no-anim takes effect for this frame.
    void card.offsetWidth;
    card.classList.remove("no-anim");
  }

  function render() {
    if (!deck.length) {
      resetFlipInstant();
      wordEl.textContent = "(no cards)";
      englishEl.textContent = "Add words or reset known list.";
      progressEl.textContent = "0 / 0";
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }
    if (index >= deck.length) index = deck.length - 1;
    if (index < 0) index = 0;
    resetFlipInstant();
    const entry = deck[index];
    wordEl.innerHTML = renderFurigana(entry.jp);
    englishEl.textContent = entry.en;
    progressEl.textContent = `${index + 1} / ${deck.length}`;
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === deck.length - 1;
  }

  function flip() {
    card.classList.toggle("flipped");
  }

  function next() {
    if (index < deck.length - 1) {
      index++;
      render();
    }
  }

  function prev() {
    if (index > 0) {
      index--;
      render();
    }
  }

  function rebuildDeck({ keepIndex = false } = {}) {
    const currentJp = deck[index]?.jp;
    deck = buildDeck();
    if (keepIndex && currentJp) {
      const newIdx = deck.findIndex((w) => w.jp === currentJp);
      index = newIdx >= 0 ? newIdx : 0;
    } else {
      index = 0;
    }
    render();
  }

  function setLevel(level) {
    localStorage.setItem(KEY_LEVEL, level);
    deck = buildDeck();
    index = 0;
    render();
  }

  function saveKnown() {
    localStorage.setItem(KEY_KNOWN, JSON.stringify([...known]));
    knownCountEl.textContent = String(known.size);
  }

  function markKnown() {
    if (!deck.length) return;
    const entry = deck[index];
    known.add(entry.jp);
    saveKnown();
    if (toggleHideKnown.checked) {
      // Remove from current deck and advance.
      deck.splice(index, 1);
      if (index >= deck.length) index = deck.length - 1;
      render();
    } else {
      next();
    }
  }

  function applyFurigana() {
    document.body.classList.toggle("no-furigana", !toggleFurigana.checked);
    localStorage.setItem(KEY_FURIGANA, toggleFurigana.checked ? "1" : "0");
  }

  function openSettings() {
    knownCountEl.textContent = String(known.size);
    settingsModal.hidden = false;
  }

  function closeSettings() {
    settingsModal.hidden = true;
  }

  let suppressNextClick = false;

  // Card flip — click or keyboard
  card.addEventListener("click", (e) => {
    // Don't flip if the click came from a button inside the card (e.g. know button)
    if (e.target.closest("button")) return;
    if (suppressNextClick) {
      suppressNextClick = false;
      return;
    }
    flip();
  });
  card.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      flip();
    }
  });

  knowBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    markKnown();
  });

  nextBtn.addEventListener("click", next);
  prevBtn.addEventListener("click", prev);

  shuffleBtn.addEventListener("click", () => {
    deck = shuffle(deck);
    index = 0;
    render();
  });

  levelSelect.addEventListener("change", (e) => setLevel(e.target.value));

  // Settings
  settingsBtn.addEventListener("click", openSettings);
  closeSettingsBtn.addEventListener("click", closeSettings);
  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) closeSettings();
  });
  toggleFurigana.addEventListener("change", applyFurigana);
  toggleHideKnown.addEventListener("change", () => {
    localStorage.setItem(KEY_HIDE_KNOWN, toggleHideKnown.checked ? "1" : "0");
    rebuildDeck({ keepIndex: true });
  });
  resetKnownBtn.addEventListener("click", () => {
    if (!known.size) return;
    if (!confirm(`Reset all ${known.size} known words?`)) return;
    known = new Set();
    saveKnown();
    rebuildDeck({ keepIndex: true });
  });

  // Keyboard nav (desktop)
  document.addEventListener("keydown", (e) => {
    if (!settingsModal.hidden) {
      if (e.key === "Escape") closeSettings();
      return;
    }
    if (e.target === card) return;
    if (e.key === "ArrowRight") next();
    else if (e.key === "ArrowLeft") prev();
    else if (e.key === " ") {
      e.preventDefault();
      flip();
    }
  });

  // Swipe
  let touchStartX = null;
  card.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });
  card.addEventListener("touchend", (e) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].screenX - touchStartX;
    touchStartX = null;
    if (Math.abs(dx) > 60) {
      suppressNextClick = true;
      if (dx < 0) next();
      else prev();
    }
  });

  // Init
  const savedLevel = localStorage.getItem(KEY_LEVEL) || "N5";
  levelSelect.value = savedLevel;
  toggleFurigana.checked = localStorage.getItem(KEY_FURIGANA) !== "0";
  toggleHideKnown.checked = localStorage.getItem(KEY_HIDE_KNOWN) !== "0";
  knownCountEl.textContent = String(known.size);
  applyFurigana();
  deck = buildDeck();
  index = 0;
  render();
})();
