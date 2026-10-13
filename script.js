(() => {
  "use strict";

  /* ================= Slayt gezinme ================= */
  const slides = Array.from(document.querySelectorAll(".slide"));
  const counter = document.getElementById("counter");
  const progressBar = document.getElementById("progressBar");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const listeners = {}; // slayt index -> {enter, leave}
  let current = 0;

  function go(index) {
    index = Math.max(0, Math.min(slides.length - 1, index));
    if (index === current && slides[index].classList.contains("active")) return;

    listeners[current]?.leave?.();
    slides.forEach((s, i) => {
      s.classList.toggle("active", i === index);
      s.classList.toggle("prev", i < index);
    });
    current = index;
    listeners[current]?.enter?.();

    slides[current].scrollTop = 0;
    counter.textContent = `${current + 1} / ${slides.length}`;
    progressBar.style.width = `${((current + 1) / slides.length) * 100}%`;
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === slides.length - 1;
    history.replaceState(null, "", `#${current + 1}`);
  }

  const next = () => go(current + 1);
  const prev = () => go(current - 1);

  prevBtn.addEventListener("click", prev);
  nextBtn.addEventListener("click", next);

  document.addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea")) return;
    switch (e.key) {
      case "ArrowRight": case "PageDown": case " ": e.preventDefault(); next(); break;
      case "ArrowLeft": case "PageUp": e.preventDefault(); prev(); break;
      case "Home": go(0); break;
      case "End": go(slides.length - 1); break;
      case "f": case "F": toggleFullscreen(); break;
      case "o": case "O": toggleOverview(); break;
      case "Escape": closeOverview(); break;
    }
  });

  // Dokunmatik kaydırma
  let touchX = null, touchY = null;
  document.addEventListener("touchstart", (e) => {
    touchX = e.touches[0].clientX; touchY = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    const dy = e.changedTouches[0].clientY - touchY;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && !e.target.matches("input")) {
      dx < 0 ? next() : prev();
    }
    touchX = touchY = null;
  });

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.();
  }

  // Genel bakış
  let overviewEl = null;
  function toggleOverview() { overviewEl ? closeOverview() : openOverview(); }
  function openOverview() {
    overviewEl = document.createElement("div");
    overviewEl.className = "overview";
    slides.forEach((s, i) => {
      const b = document.createElement("button");
      b.innerHTML = `<span>${String(i + 1).padStart(2, "0")}</span><b>${s.dataset.title || "Slayt"}</b>`;
      if (i === current) b.classList.add("current");
      b.addEventListener("click", () => { go(i); closeOverview(); });
      overviewEl.appendChild(b);
    });
    document.body.appendChild(overviewEl);
  }
  function closeOverview() { overviewEl?.remove(); overviewEl = null; }

  const slideIndexOf = (el) => slides.indexOf(el.closest(".slide"));
  const onSlide = (el, handlers) => { listeners[slideIndexOf(el)] = handlers; };

  /* ================= MCU mimarisi ================= */
  const archInfo = document.getElementById("archInfo");
  document.querySelectorAll("[data-info]").forEach((el) => {
    const show = () => {
      document.querySelectorAll("[data-info].on").forEach((x) => x.classList.remove("on"));
      el.classList.add("on");
      archInfo.innerHTML = `<b>${el.firstChild.textContent.trim()}:</b> ${el.dataset.info}`;
    };
    el.addEventListener("mouseenter", show);
    el.addEventListener("click", show);
  });

  /* ================= LED Blink ================= */
  const led = document.getElementById("led");
  const delayRange = document.getElementById("delayRange");
  const delayVal = document.getElementById("delayVal");
  const blinkBtn = document.getElementById("blinkBtn");
  let blinkTimer = null;

  function startBlink() {
    stopBlink();
    blinkTimer = setInterval(() => led.classList.toggle("on"), +delayRange.value);
    blinkBtn.textContent = "■ Durdur";
  }
  function stopBlink() {
    clearInterval(blinkTimer); blinkTimer = null;
    led.classList.remove("on");
    blinkBtn.textContent = "▶ Çalıştır";
  }
  blinkBtn.addEventListener("click", () => (blinkTimer ? stopBlink() : startBlink()));
  delayRange.addEventListener("input", () => {
    delayVal.textContent = delayRange.value;
    if (blinkTimer) startBlink();
  });
  onSlide(led, { leave: stopBlink });

  /* ================= Register ================= */
  const register = document.getElementById("register");
  let regValue = 0;
  for (let i = 7; i >= 0; i--) {
    const bit = document.createElement("div");
    bit.className = "bit";
    bit.innerHTML = `<div class="val">0</div><small>bit ${i}</small>`;
    bit.addEventListener("click", () => {
      regValue ^= 1 << i;
      bit.classList.toggle("on");
      bit.querySelector(".val").textContent = (regValue >> i) & 1;
      renderReg();
    });
    register.appendChild(bit);
  }
  function renderReg() {
    document.getElementById("regHex").textContent = "0x" + regValue.toString(16).toUpperCase().padStart(2, "0");
    document.getElementById("regDec").textContent = regValue;
    document.getElementById("regBin").textContent = "0b" + regValue.toString(2).padStart(8, "0");
  }

  /* ================= Kesme zaman çizelgesi ================= */
  const mainTrack = document.getElementById("mainTrack");
  const isrTrack = document.getElementById("isrTrack");
  const irqLog = document.getElementById("irqLog");
  const CELLS = 60;
  let timeline = [];
  let isrLeft = 0;
  let irqCount = 0;
  let irqTimer = null;

  function tickTimeline() {
    const state = isrLeft > 0 ? "isr" : "main";
    if (isrLeft > 0 && --isrLeft === 0) irqLog.textContent = `ISR bitti, main() kaldığı yerden devam ediyor (toplam ${irqCount} kesme).`;
    timeline.push(state);
    if (timeline.length > CELLS) timeline.shift();
    renderTimeline();
  }
  function renderTimeline() {
    const w = 100 / CELLS;
    const draw = (track, type) => {
      track.innerHTML = "";
      let start = -1;
      timeline.concat([null]).forEach((s, i) => {
        if (s === type && start < 0) start = i;
        if (s !== type && start >= 0) {
          const seg = document.createElement("div");
          seg.className = `seg ${type}`;
          seg.style.left = `${start * w}%`;
          seg.style.width = `${(i - start) * w}%`;
          track.appendChild(seg);
          start = -1;
        }
      });
    };
    draw(mainTrack, "main");
    draw(isrTrack, "isr");
  }
  document.getElementById("irqBtn").addEventListener("click", () => {
    if (!irqTimer) startTimeline();
    isrLeft = 6;
    irqCount++;
    irqLog.textContent = "⚡ Kesme geldi! main() askıya alındı, ISR çalışıyor…";
  });
  function startTimeline() { if (!irqTimer) irqTimer = setInterval(tickTimeline, 120); }
  function stopTimeline() { clearInterval(irqTimer); irqTimer = null; }
  onSlide(mainTrack, { enter: startTimeline, leave: stopTimeline });

  /* ================= PWM ================= */
  const dutyRange = document.getElementById("dutyRange");
  const pwmWave = document.getElementById("pwmWave");
  const pwmLed = document.getElementById("pwmLed");

  function renderPWM() {
    const d = +dutyRange.value / 100;
    const periods = 4, W = 400, H = 120, hi = 15, lo = 105;
    const p = W / periods;
    const pts = [];
    for (let i = 0; i < periods; i++) {
      const x0 = i * p, x1 = x0 + p * d;
      if (d === 0) { pts.push(`${x0},${lo}`, `${x0 + p},${lo}`); continue; }
      if (d === 1) { pts.push(`${x0},${hi}`, `${x0 + p},${hi}`); continue; }
      pts.push(`${x0},${lo}`, `${x0},${hi}`, `${x1},${hi}`, `${x1},${lo}`, `${x0 + p},${lo}`);
    }
    const avgY = lo - (lo - hi) * d;
    pwmWave.innerHTML =
      `<line x1="0" y1="${avgY}" x2="${W}" y2="${avgY}"></line>` +
      `<polyline points="${pts.join(" ")}"></polyline>`;
    document.getElementById("dutyVal").textContent = dutyRange.value;
    document.getElementById("vAvg").textContent = (3.3 * d).toFixed(2);
    pwmLed.style.opacity = 0.08 + d * 0.92;
    pwmLed.style.boxShadow = `0 0 ${30 * d}px ${10 * d}px rgba(251, 191, 36, ${0.7 * d})`;
  }
  dutyRange.addEventListener("input", renderPWM);
  renderPWM();

  /* ================= Haberleşme protokolleri ================= */
  const box = (x, y, w, label) =>
    `<rect x="${x}" y="${y}" width="${w}" height="50"></rect><text x="${x + w / 2}" y="${y + 30}" text-anchor="middle">${label}</text>`;

  const protocols = {
    uart: {
      name: "UART — Evrensel Asenkron Alıcı/Verici",
      desc: "Saat hattı olmadan, iki cihazın önceden anlaştığı baud hızında veri gönderdiği en basit seri haberleşme. Hata ayıklama konsolu, GPS ve Bluetooth modülleri için yaygındır.",
      meta: [["Hat sayısı", "2 (TX, RX)"], ["Topoloji", "Noktadan noktaya"], ["Senkron", "Hayır (asenkron)"], ["Hız", "9600 – 921600 baud"], ["Çerçeve", "Start + 8 veri + (parite) + Stop"]],
      svg: `<svg class="wire-diagram" viewBox="0 0 360 140">
        ${box(10, 45, 100, "MCU")}${box(250, 45, 100, "Modül")}
        <path class="wire" d="M110 60 H250"/><path class="wire b" d="M250 85 H110"/>
        <text class="lbl" x="180" y="52" text-anchor="middle">TX → RX</text>
        <text class="lbl" x="180" y="105" text-anchor="middle">RX ← TX</text></svg>`,
    },
    i2c: {
      name: "I²C — Inter-Integrated Circuit",
      desc: "İki hat üzerinden çok sayıda cihazın adresleme ile haberleştiği yarı çift yönlü veri yolu. Sensörler, EEPROM ve OLED ekranlar için idealdir. Hatlarda pull-up direnci gerekir.",
      meta: [["Hat sayısı", "2 (SDA, SCL)"], ["Topoloji", "Çok master / çok slave"], ["Adresleme", "7 veya 10 bit"], ["Hız", "100 kHz / 400 kHz / 1 MHz"], ["Senkron", "Evet"]],
      svg: `<svg class="wire-diagram" viewBox="0 0 360 160">
        ${box(10, 10, 90, "Master")}
        <path class="wire" d="M100 25 H340"/><path class="wire b" d="M100 45 H340"/>
        <text class="lbl" x="345" y="29">SDA</text><text class="lbl" x="345" y="49">SCL</text>
        ${[130, 210, 290].map((x, i) => `<path class="wire" d="M${x} 25 V100"/><path class="wire b" d="M${x + 12} 45 V100"/><circle class="dot" cx="${x}" cy="25" r="3"/><circle class="dot" cx="${x + 12}" cy="45" r="3"/>${box(x - 24, 100, 60, "0x" + (0x48 + i).toString(16))}`).join("")}
      </svg>`,
    },
    spi: {
      name: "SPI — Serial Peripheral Interface",
      desc: "Ayrı veri giriş/çıkış hatları ve saat sinyali ile tam çift yönlü, çok hızlı haberleşme. SD kart, TFT ekran ve flash bellekler için kullanılır. Her slave için ayrı CS hattı gerekir.",
      meta: [["Hat sayısı", "4 (SCK, MOSI, MISO, CS)"], ["Topoloji", "Tek master / çok slave"], ["Çift yönlü", "Tam (full-duplex)"], ["Hız", "Onlarca MHz"], ["Modlar", "CPOL / CPHA → Mod 0-3"]],
      svg: `<svg class="wire-diagram" viewBox="0 0 360 160">
        ${box(10, 30, 100, "Master")}${box(250, 30, 100, "Slave")}
        <path class="wire" d="M110 38 H250"/><path class="wire b" d="M110 50 H250"/><path class="wire c" d="M250 62 H110"/><path class="wire d" d="M110 74 H250"/>
        <text class="lbl" x="180" y="110" text-anchor="middle">SCK · MOSI · MISO · CS</text>
        <rect x="132" y="120" width="12" height="12" style="fill:var(--accent)"/><text class="lbl" x="148" y="131">SCK</text>
        <rect x="186" y="120" width="12" height="12" style="fill:var(--accent-2)"/><text class="lbl" x="202" y="131">MOSI</text>
        <rect x="132" y="140" width="12" height="12" style="fill:var(--yellow)"/><text class="lbl" x="148" y="151">MISO</text>
        <rect x="186" y="140" width="12" height="12" style="fill:var(--green)"/><text class="lbl" x="202" y="151">CS</text>
      </svg>`,
    },
    can: {
      name: "CAN — Controller Area Network",
      desc: "Diferansiyel iki hat üzerinden gürültüye dayanıklı, mesaj öncelikli veri yolu. Otomotiv ve endüstriyel otomasyonun standardıdır. Çakışmalar kayıpsız tahkim (arbitration) ile çözülür.",
      meta: [["Hat sayısı", "2 (CAN_H, CAN_L)"], ["Topoloji", "Çok master veri yolu"], ["Sonlandırma", "Uçlarda 120 Ω"], ["Hız", "1 Mbit/s (CAN FD: 8 Mbit/s)"], ["Kimlik", "11 / 29 bit mesaj ID"]],
      svg: `<svg class="wire-diagram" viewBox="0 0 360 160">
        <path class="wire" d="M20 30 H340"/><path class="wire b" d="M20 50 H340"/>
        <text class="lbl" x="20" y="22">CAN_H</text><text class="lbl" x="20" y="66">CAN_L</text>
        <rect x="2" y="25" width="14" height="30" style="fill:var(--yellow);stroke:none"/><rect x="344" y="25" width="14" height="30" style="fill:var(--yellow);stroke:none"/>
        ${[["ECU", 70], ["ABS", 160], ["Gösterge", 250]].map(([n, x]) => `<path class="wire" d="M${x} 30 V100"/><path class="wire b" d="M${x + 14} 50 V100"/>${box(x - 30, 100, 74, n)}`).join("")}
      </svg>`,
    },
  };

  const protoPanel = document.getElementById("protoPanel");
  const protoTabs = document.getElementById("protoTabs");
  function showProto(key) {
    const p = protocols[key];
    protoPanel.style.animation = "none";
    void protoPanel.offsetWidth; // animasyonu yeniden başlat
    protoPanel.style.animation = "";
    protoPanel.innerHTML = `
      <div>
        <h3>${p.name}</h3>
        <p>${p.desc}</p>
        <dl class="proto-meta">${p.meta.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>
      </div>
      <div>${p.svg}</div>`;
    protoTabs.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.p === key));
  }
  protoTabs.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b) showProto(b.dataset.p);
  });
  showProto("uart");

  /* ================= Quiz ================= */
  const questions = [
    { q: "ISR ile ana döngü arasında paylaşılan değişken nasıl tanımlanmalıdır?", a: ["static", "volatile", "const", "register"], c: 1 },
    { q: "Hangi protokol yalnızca 2 hat ile adresleme yaparak çok sayıda cihaza bağlanır?", a: ["SPI", "UART", "I²C", "PWM"], c: 2 },
    { q: "Program kodu mikrodenetleyicide genellikle nerede saklanır?", a: ["SRAM", "Flash", "Register", "Stack"], c: 1 },
    { q: "%25 duty cycle ile 3.3 V PWM sinyalinin ortalama voltajı yaklaşık kaçtır?", a: ["0.83 V", "1.65 V", "2.48 V", "3.3 V"], c: 0 },
    { q: "Yazılım kilitlendiğinde sistemi otomatik resetleyen birim hangisidir?", a: ["DMA", "ADC", "NVIC", "Watchdog"], c: 3 },
  ];
  const quiz = document.getElementById("quiz");
  let answered = 0, score = 0;
  questions.forEach((item, qi) => {
    const el = document.createElement("div");
    el.className = "q";
    el.innerHTML = `<h3>${qi + 1}. ${item.q}</h3><div class="q-opts">${item.a.map((o, i) => `<button data-i="${i}">${o}</button>`).join("")}</div>`;
    el.querySelector(".q-opts").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b || b.disabled) return;
      const btns = el.querySelectorAll("button");
      btns.forEach((x) => (x.disabled = true));
      btns[item.c].classList.add("correct");
      if (+b.dataset.i === item.c) score++;
      else b.classList.add("wrong");
      answered++;
      if (answered === questions.length) {
        scoreEl.textContent = `Sonuç: ${score} / ${questions.length} ${score === questions.length ? "🎉 Mükemmel!" : score >= 3 ? "👏 Güzel!" : "📚 Tekrar göz atalım"}`;
      }
    });
    quiz.appendChild(el);
  });
  const scoreEl = document.createElement("div");
  scoreEl.className = "q-score";
  quiz.appendChild(scoreEl);

  /* ================= Başlangıç ================= */
  const initial = parseInt(location.hash.slice(1), 10);
  current = -1;
  go(Number.isFinite(initial) ? initial - 1 : 0);
  window.addEventListener("hashchange", () => {
    const n = parseInt(location.hash.slice(1), 10);
    if (Number.isFinite(n) && n - 1 !== current) go(n - 1);
  });
})();
