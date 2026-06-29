(() => {
  const card = document.getElementById("card");
  const wordEl = document.getElementById("word");
  const englishEl = document.getElementById("english");
  const progressEl = document.getElementById("progress");
  const levelSelect = document.getElementById("level-select");
  const shuffleBtn = document.getElementById("shuffle-btn");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");

  const STORAGE_KEY = "japan-words.level";

  let deck = [];
  let index = 0;

  // Parse "食[た]べる" → "<ruby>食<rt>た</rt></ruby>べる"
  // Plain hiragana/katakana with no brackets returns unchanged (HTML-escaped).
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
      // Walk back from bracketStart to collect contiguous kanji (CJK) chars.
      let kanjiStart = bracketStart;
      while (kanjiStart > i && isKanji(str.charCodeAt(kanjiStart - 1))) {
        kanjiStart--;
      }
      // Anything before kanjiStart is plain text.
      html += escapeHtml(str.slice(i, kanjiStart));
      const kanji = str.slice(kanjiStart, bracketStart);
      const reading = str.slice(bracketStart + 1, bracketEnd);
      html += `<ruby>${escapeHtml(kanji)}<rt>${escapeHtml(reading)}</rt></ruby>`;
      i = bracketEnd + 1;
    }
    return html;
  }

  function isKanji(code) {
    // CJK Unified Ideographs block (common range).
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

  function buildDeck(level) {
    const filtered = level === "ALL"
      ? VOCAB.slice()
      : VOCAB.filter((w) => w.level === level);
    return shuffle(filtered);
  }

  function render() {
    if (!deck.length) {
      wordEl.textContent = "(no cards)";
      englishEl.textContent = "";
      progressEl.textContent = "0 / 0";
      return;
    }
    const entry = deck[index];
    wordEl.innerHTML = renderFurigana(entry.jp);
    englishEl.textContent = entry.en;
    progressEl.textContent = `${index + 1} / ${deck.length}`;
    card.classList.remove("flipped");
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

  function setLevel(level) {
    localStorage.setItem(STORAGE_KEY, level);
    deck = buildDeck(level);
    index = 0;
    render();
  }

  let suppressNextClick = false;

  // Event wiring
  card.addEventListener("click", () => {
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

  nextBtn.addEventListener("click", next);
  prevBtn.addEventListener("click", prev);

  shuffleBtn.addEventListener("click", () => {
    deck = shuffle(deck);
    index = 0;
    render();
  });

  levelSelect.addEventListener("change", (e) => setLevel(e.target.value));

  // Keyboard navigation (nice on desktop)
  document.addEventListener("keydown", (e) => {
    if (e.target === card) return; // handled above
    if (e.key === "ArrowRight") next();
    else if (e.key === "ArrowLeft") prev();
    else if (e.key === " ") {
      e.preventDefault();
      flip();
    }
  });

  // Swipe support
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
  const savedLevel = localStorage.getItem(STORAGE_KEY) || "N5";
  levelSelect.value = savedLevel;
  setLevel(savedLevel);
})();
