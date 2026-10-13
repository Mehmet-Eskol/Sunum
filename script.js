(() => {
  "use strict";

  /* ================= Slayt gezinme ================= */
  const slides = Array.from(document.querySelectorAll(".slide"));
  const counter = document.getElementById("counter");
  const progressBar = document.getElementById("progressBar");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const listeners = {}; // slayt index -> {enter, leave}
  let current = -1;

  function go(index) {
    index = Math.max(0, Math.min(slides.length - 1, index));
    if (index === current) return;

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

  // Gündem maddeleri sırayla gelsin
  document.querySelectorAll(".agenda li").forEach((li, i) => li.style.setProperty("--i", i));

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
      bit.classList.remove("flip"); void bit.offsetWidth; bit.classList.add("flip");
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
  const irqDemo = mainTrack.closest(".irq-demo");
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
    irqDemo.classList.remove("flash"); void irqDemo.offsetWidth; irqDemo.classList.add("flash");
  });
  function startTimeline() { if (!irqTimer) irqTimer = setInterval(tickTimeline, 120); }
  function stopTimeline() { clearInterval(irqTimer); irqTimer = null; }
  onSlide(mainTrack, { enter: startTimeline, leave: stopTimeline });

  /* ================= PWM ================= */
  const dutyRange = document.getElementById("dutyRange");
  const pwmWave = document.getElementById("pwmWave");
  const pwmLed = document.getElementById("pwmLed");
  const fan = document.getElementById("fan");

  function renderPWM() {
    const d = +dutyRange.value / 100;
    const periods = 4, W = 400, hi = 15, lo = 105;
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
    pwmLed.style.boxShadow = `0 0 ${30 * d}px ${10 * d}px rgba(255, 160, 70, ${0.7 * d})`;
    // Fan hızı doluluk oranıyla orantılı
    fan.style.animationPlayState = d === 0 ? "paused" : "running";
    fan.style.animationDuration = d === 0 ? "1s" : `${(0.15 / d).toFixed(3)}s`;
  }
  dutyRange.addEventListener("input", renderPWM);
  renderPWM();

  /* ================= Haberleşme protokolleri ================= */
  const box = (x, y, w, label) =>
    `<rect x="${x}" y="${y}" width="${w}" height="50"></rect><text x="${x + w / 2}" y="${y + 30}" text-anchor="middle">${label}</text>`;
  const bit = (path, dur, begin = 0, cls = "") =>
    `<circle class="bitdot ${cls}" r="4"><animateMotion dur="${dur}s" begin="${begin}s" repeatCount="indefinite" path="${path}"/></circle>`;

  const protocols = {
    uart: {
      name: "UART — Evrensel Asenkron Alıcı/Verici",
      desc: "Saat hattı olmadan, iki cihazın önceden anlaştığı baud hızında veri gönderdiği en basit seri haberleşme.",
      meta: [["Hat sayısı", "2 (TX, RX)"], ["Topoloji", "Noktadan noktaya"], ["Senkron", "Hayır (asenkron)"], ["Hız", "9600 – 921600 baud"], ["Çerçeve", "Start + 8 veri + (parite) + Stop"]],
      real: "GPS modülleri konum verisini UART üzerinden NMEA cümleleri olarak gönderir. Geliştiricilerin hata ayıklama konsolu (printf) da genellikle UART'tır.",
      svg: `<svg class="wire-diagram" viewBox="0 0 360 140">
        ${box(10, 45, 100, "MCU")}${box(250, 45, 100, "GPS")}
        <path class="wire" d="M110 60 H250"/><path class="wire b" d="M250 85 H110"/>
        <text class="lbl" x="180" y="52" text-anchor="middle">TX → RX</text>
        <text class="lbl" x="180" y="105" text-anchor="middle">RX ← TX</text>
        ${bit("M110 60 H250", 1.4)}${bit("M110 60 H250", 1.4, -0.5)}
        ${bit("M250 85 H110", 1.8, 0, "b")}${bit("M250 85 H110", 1.8, -0.9, "b")}</svg>`,
    },
    i2c: {
      name: "I²C — Inter-Integrated Circuit",
      desc: "İki hat üzerinden çok sayıda cihazın adresleme ile haberleştiği yarı çift yönlü veri yolu. Hatlarda pull-up direnci gerekir.",
      meta: [["Hat sayısı", "2 (SDA, SCL)"], ["Topoloji", "Çok master / çok slave"], ["Adresleme", "7 veya 10 bit"], ["Hız", "100 kHz / 400 kHz / 1 MHz"], ["Senkron", "Evet"]],
      real: "Bir akıllı saatte ivmeölçer, nabız sensörü ve pil yakıt göstergesi aynı iki I²C hattını paylaşır; MCU her birine adresiyle seslenir.",
      svg: `<svg class="wire-diagram" viewBox="0 0 360 160">
        ${box(10, 10, 90, "Master")}
        <path class="wire" d="M100 25 H340"/><path class="wire b clk" d="M100 45 H340"/>
        <text class="lbl" x="345" y="29">SDA</text><text class="lbl" x="345" y="49">SCL</text>
        ${[130, 210, 290].map((x, i) => `<path class="wire" d="M${x} 25 V100"/><path class="wire b" d="M${x + 12} 45 V100"/><circle class="dot" cx="${x}" cy="25" r="3"/><circle class="dot" cx="${x + 12}" cy="45" r="3"/>${box(x - 24, 100, 60, "0x" + (0x48 + i).toString(16))}`).join("")}
        ${bit("M100 25 H130 V100", 1.2)}${bit("M100 25 H210 V100", 1.6, -0.4)}${bit("M100 25 H290 V100", 2, -0.8)}
      </svg>`,
    },
    spi: {
      name: "SPI — Serial Peripheral Interface",
      desc: "Ayrı veri giriş/çıkış hatları ve saat sinyali ile tam çift yönlü, çok hızlı haberleşme. Her slave için ayrı CS hattı gerekir.",
      meta: [["Hat sayısı", "4 (SCK, MOSI, MISO, CS)"], ["Topoloji", "Tek master / çok slave"], ["Çift yönlü", "Tam (full-duplex)"], ["Hız", "Onlarca MHz"], ["Modlar", "CPOL / CPHA → Mod 0-3"]],
      real: "Drone uçuş kartları jiroskopu saniyede binlerce kez SPI ile okur; 3D yazıcılar SD karttan baskı dosyasını, akıllı saatler ekran görüntüsünü SPI ile aktarır.",
      svg: `<svg class="wire-diagram" viewBox="0 0 360 160">
        ${box(10, 30, 100, "Master")}${box(250, 30, 100, "Ekran")}
        <path class="wire clk" d="M110 38 H250"/><path class="wire b" d="M110 50 H250"/><path class="wire c" d="M250 62 H110"/><path class="wire d" d="M110 74 H250"/>
        ${bit("M110 50 H250", 0.9)}${bit("M110 50 H250", 0.9, -0.45)}${bit("M250 62 H110", 0.9, -0.2, "b")}
        <rect x="132" y="110" width="12" height="12" style="fill:var(--accent)"/><text class="lbl" x="148" y="121">SCK</text>
        <rect x="196" y="110" width="12" height="12" style="fill:var(--accent-2)"/><text class="lbl" x="212" y="121">MOSI</text>
        <rect x="132" y="132" width="12" height="12" style="fill:var(--rose)"/><text class="lbl" x="148" y="143">MISO</text>
        <rect x="196" y="132" width="12" height="12" style="fill:var(--green)"/><text class="lbl" x="212" y="143">CS</text>
      </svg>`,
    },
    can: {
      name: "CAN — Controller Area Network",
      desc: "Diferansiyel iki hat üzerinden gürültüye dayanıklı, mesaj öncelikli veri yolu. Çakışmalar kayıpsız tahkim (arbitration) ile çözülür.",
      meta: [["Hat sayısı", "2 (CAN_H, CAN_L)"], ["Topoloji", "Çok master veri yolu"], ["Sonlandırma", "Uçlarda 120 Ω"], ["Hız", "1 Mbit/s (CAN FD: 8 Mbit/s)"], ["Kimlik", "11 / 29 bit mesaj ID"]],
      real: "Aracınızdaki gösterge paneli hız, devir ve yakıt bilgisini CAN hattından okur. Servisteki OBD-II arıza tespit cihazı da bu hatta bağlanır.",
      svg: `<svg class="wire-diagram" viewBox="0 0 360 160">
        <path class="wire" d="M20 30 H340"/><path class="wire b" d="M20 50 H340"/>
        <text class="lbl" x="20" y="22">CAN_H</text><text class="lbl" x="20" y="66">CAN_L</text>
        <rect x="2" y="25" width="14" height="30" style="fill:var(--yellow);stroke:none"/><rect x="344" y="25" width="14" height="30" style="fill:var(--yellow);stroke:none"/>
        ${[["Motor", 70], ["ABS", 160], ["Gösterge", 250]].map(([n, x]) => `<path class="wire" d="M${x} 30 V100"/><path class="wire b" d="M${x + 14} 50 V100"/>${box(x - 30, 100, 74, n)}`).join("")}
        ${bit("M70 100 V30 H340", 1.8)}${bit("M70 100 V30 H20", 1.4, -0.3)}${bit("M174 100 V50 H340", 1.6, -0.9, "b")}
      </svg>`,
    },
  };

  const protoPanel = document.getElementById("protoPanel");
  const protoTabs = document.getElementById("protoTabs");
  const restartAnim = (el) => { el.style.animation = "none"; void el.offsetWidth; el.style.animation = ""; };
  function showProto(key) {
    const p = protocols[key];
    restartAnim(protoPanel);
    protoPanel.innerHTML = `
      <div>
        <h3>${p.name}</h3>
        <p>${p.desc}</p>
        <dl class="proto-meta">${p.meta.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>
      </div>
      <div>${p.svg}</div>
      <div class="real"><b>🌍 Gerçek hayatta</b> ${p.real}</div>`;
    protoTabs.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.p === key));
  }
  protoTabs.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b) showProto(b.dataset.p);
  });
  showProto("uart");

  /* ================= RTOS zamanlayıcı ================= */
  const gantt = document.getElementById("gantt");
  const tasks = [
    { name: "Sensör (P3)", color: "var(--rose)", blocks: [[0, 8], [33, 8], [66, 8]] },
    { name: "İletişim (P2)", color: "var(--accent)", blocks: [[8, 15], [50, 12], [74, 10]] },
    { name: "Ekran (P1)", color: "var(--accent-2)", blocks: [[23, 10], [62, 4], [84, 16]] },
    { name: "Idle", color: "#8a7262", blocks: [[41, 9]] },
  ];
  gantt.innerHTML = tasks.map((t) => `
    <div class="g-row"><span>${t.name}</span><div class="g-track">
      ${t.blocks.map(([l, w]) => `<div class="g-blk" data-l="${l}" data-w="${w}" style="left:${l}%;width:${w}%;background:${t.color};color:${t.color}"></div>`).join("")}
      <div class="g-now"></div>
    </div></div>`).join("");
  const gBlocks = gantt.querySelectorAll(".g-blk");
  const gNows = gantt.querySelectorAll(".g-now");
  let gT = 0, gTimer = null;
  function tickGantt() {
    gT = (gT + 0.5) % 100;
    gNows.forEach((n) => (n.style.left = `${gT}%`));
    gBlocks.forEach((b) => {
      const l = +b.dataset.l, w = +b.dataset.w;
      b.classList.toggle("run", gT >= l && gT < l + w);
    });
  }
  onSlide(gantt, {
    enter: () => { if (!gTimer) gTimer = setInterval(tickGantt, 40); },
    leave: () => { clearInterval(gTimer); gTimer = null; },
  });

  /* ================= Gerçek hayattan örnekler ================= */
  const cases = [
    {
      icon: "🌡️", tab: "Akıllı Termostat", mcu: "ESP32 (Wi-Fi)",
      sum: "Evin sıcaklığını ölçer, kombiyi açıp kapatır ve telefondan kontrol edilir.",
      in: [["Sıcaklık/nem sensörü", "I²C"], ["Dokunmatik tuşlar", "GPIO kesmesi"], ["Hareket sensörü", "GPIO"]],
      out: [["Kombi rölesi", "GPIO"], ["Ekran", "SPI"], ["Bulut / telefon", "Wi-Fi"]],
      tags: ["I²C", "GPIO", "Kesme", "Deep sleep", "FreeRTOS"],
      fact: "ESP-IDF, FreeRTOS üzerine kuruludur. Pille çalışan modeller birkaç dakikada bir uyanıp ölçüm yapar ve kalan zamanda µA düzeyinde akım çekerek uyur.",
    },
    {
      icon: "🚗", tab: "ABS Fren Sistemi", mcu: "Otomotiv MCU",
      sum: "Ani frende tekerleklerin kilitlenmesini önleyerek direksiyon hâkimiyetini korur.",
      in: [["4 tekerlek hız sensörü", "Timer input capture"], ["Fren pedalı", "ADC"], ["Araç verileri", "CAN"]],
      out: [["Hidrolik valfler", "PWM"], ["Pompa motoru", "PWM"], ["Uyarı lambası", "CAN"]],
      tags: ["Timer", "Kesme", "PWM", "CAN", "Gerçek zamanlı", "ISO 26262"],
      fact: "Bir tekerleğin kilitlenmek üzere olduğu algılanınca valfler saniyede onlarca kez açılıp kapanır. Kontrol döngüsü milisaniyeler düzeyinde, kesin zamanlamayla çalışmak zorundadır.",
    },
    {
      icon: "⌚", tab: "Akıllı Bileklik", mcu: "nRF52 (Cortex-M4 + BLE)",
      sum: "Adım, nabız ve uyku takibi yapar; verileri telefona Bluetooth ile gönderir.",
      in: [["İvmeölçer", "I²C / SPI"], ["Optik nabız sensörü", "ADC"], ["Dokunmatik tuş", "GPIO kesmesi"]],
      out: [["OLED ekran", "SPI"], ["Titreşim motoru", "PWM"], ["Telefon", "Bluetooth LE"]],
      tags: ["Düşük güç", "BLE", "SPI", "PWM", "Zephyr / FreeRTOS"],
      fact: "Küçük bir pille günlerce çalışmasının sırrı: MCU zamanının büyük kısmını uykuda geçirir; ivmeölçer hareket algılayınca kesme ile MCU'yu uyandırır.",
    },
    {
      icon: "🧺", tab: "Çamaşır Makinesi", mcu: "32-bit MCU",
      sum: "Seçilen programa göre su alma, ısıtma, yıkama ve sıkma adımlarını yönetir.",
      in: [["Su seviyesi (basınç)", "ADC"], ["Sıcaklık (NTC)", "ADC"], ["Kapak kilidi, tuşlar", "GPIO"]],
      out: [["Motor sürücü (inverter)", "PWM"], ["Su valfleri, rezistans", "GPIO / röle"], ["Gösterge paneli", "GPIO / I²C"]],
      tags: ["Durum makinesi", "ADC", "PWM", "Watchdog"],
      fact: "Programlar bir durum makinesi (state machine) olarak kodlanır: Su alma → Isıtma → Yıkama → Durulama → Sıkma. Elektrik kesilip gelince kalan adımdan devam etmek için durum Flash/EEPROM'a yazılır.",
    },
    {
      icon: "❤️", tab: "Kalp Pili", mcu: "Ultra düşük güçlü MCU",
      sum: "Kalp ritmini sürekli izler, gerektiğinde elektriksel uyarı vererek ritmi düzeltir.",
      in: [["Kalp elektrik sinyali", "ADC + filtre"], ["Hareket sensörü", "SPI"], ["Hekim programlayıcısı", "Kablosuz telemetri"]],
      out: [["Uyarı darbesi", "Timer / çıkış katı"], ["Kayıtlı ritim verisi", "Telemetri"], ["Pil durumu", "Telemetri"]],
      tags: ["Ultra düşük güç", "Timer", "Watchdog", "IEC 62304"],
      fact: "Pili yıllarca dayanacak şekilde tasarlanır. Yazılımı IEC 62304 gibi medikal yazılım standartlarına göre geliştirilir ve her satırı test edilir.",
    },
  ];
  const caseTabs = document.getElementById("caseTabs");
  const casePanel = document.getElementById("casePanel");
  caseTabs.innerHTML = cases.map((c, i) => `<button data-i="${i}">${c.icon} ${c.tab}</button>`).join("");
  const ioList = (items, offset) => items.map(([n, p], i) => `<div class="io" style="animation-delay:${(offset + i) * 0.1}s">${n}<small>${p}</small></div>`).join("");
  const flowLink = `<div class="flow-link"><i></i><i></i><i></i></div>`;
  function showCase(i) {
    const c = cases[i];
    restartAnim(casePanel);
    casePanel.innerHTML = `
      <div class="case-head"><span class="big">${c.icon}</span><div><h3>${c.tab}</h3><p>${c.sum}</p></div></div>
      <div class="case-flow">
        <div class="case-col in">${ioList(c.in, 0)}</div>
        ${flowLink}
        <div class="case-mcu"><b>MCU</b><span>${c.mcu}</span></div>
        ${flowLink}
        <div class="case-col out">${ioList(c.out, 3)}</div>
      </div>
      <div class="case-bottom">
        <div class="tags">${c.tags.map((t) => `<span>${t}</span>`).join("")}</div>
        <div class="real"><b>💡 Biliyor muydunuz?</b> ${c.fact}</div>
      </div>`;
    caseTabs.querySelectorAll("button").forEach((b) => b.classList.toggle("active", +b.dataset.i === i));
  }
  caseTabs.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b) showCase(+b.dataset.i);
  });
  showCase(0);

  /* ================= Drone PID simülasyonu ================= */
  const droneBody = document.getElementById("droneBody");
  const droneStatus = droneBody.querySelector(".status");
  const plot = document.getElementById("plot");
  const droneAngle = document.getElementById("droneAngle");
  const droneState = document.getElementById("droneState");
  const pidBtn = document.getElementById("pidBtn");
  const KP = 12, KI = 1, KD = 4, UNSTABLE = 2, DT = 1 / 60, LIMIT = 0.8;
  const history_ = [];
  let theta = 0, omega = 0, integ = 0, pidOn = true, crashed = 0, droneRaf = null;

  function droneStep() {
    if (crashed > 0) {
      if (--crashed === 0) { theta = omega = integ = 0; droneState.textContent = ""; droneStatus.classList.remove("bad"); }
    } else {
      const noise = (Math.random() - 0.5) * 0.8;
      integ = Math.max(-1, Math.min(1, integ + theta * DT));
      const u = pidOn ? -(KP * theta + KI * integ + KD * omega) : 0;
      omega += (UNSTABLE * theta + u + noise) * DT;
      theta += omega * DT;
      if (Math.abs(theta) > LIMIT) {
        theta = Math.sign(theta) * LIMIT; omega = 0; crashed = 90;
        droneState.textContent = "Kontrol kaybedildi!"; droneStatus.classList.add("bad");
      }
    }
    const deg = theta * 180 / Math.PI;
    droneBody.setAttribute("transform", `rotate(${deg.toFixed(2)} 150 90)`);
    droneAngle.textContent = `${deg.toFixed(1)}°`;
    history_.push(deg);
    if (history_.length > 240) history_.shift();
    const pts = history_.map((v, i) => `${(i / 239) * 300},${(40 - v * 0.8).toFixed(1)}`).join(" ");
    plot.innerHTML = `<line x1="0" y1="40" x2="300" y2="40"></line><polyline points="${pts}"></polyline>`;
    droneRaf = requestAnimationFrame(droneStep);
  }
  document.getElementById("windBtn").addEventListener("click", () => { if (!crashed) omega += 1.6 * (Math.random() < 0.5 ? -1 : 1); });
  pidBtn.addEventListener("click", () => {
    pidOn = !pidOn; integ = 0;
    pidBtn.textContent = `PID: ${pidOn ? "Açık" : "Kapalı"}`;
    pidBtn.classList.toggle("off", !pidOn);
  });
  onSlide(droneBody, {
    enter: () => { if (!droneRaf) droneRaf = requestAnimationFrame(droneStep); },
    leave: () => { cancelAnimationFrame(droneRaf); droneRaf = null; },
  });

  /* ================= Ariane 5 taşma animasyonu ================= */
  const ovf = document.getElementById("ovf");
  const ovfSeq = [32765, 32766, 32767, -32768];
  let ovfI = 0, ovfTimer = null;
  function tickOvf() {
    ovfI = (ovfI + 1) % (ovfSeq.length + 2);
    const v = ovfSeq[Math.min(ovfI, ovfSeq.length - 1)];
    ovf.textContent = v;
    ovf.classList.toggle("boom", v < 0);
  }
  onSlide(ovf, {
    enter: () => { if (!ovfTimer) ovfTimer = setInterval(tickOvf, 800); },
    leave: () => { clearInterval(ovfTimer); ovfTimer = null; },
  });

  /* ================= Quiz ================= */
  const questions = [
    { q: "ISR ile ana döngü arasında paylaşılan değişken nasıl tanımlanmalıdır?", a: ["static", "volatile", "const", "register"], c: 1 },
    { q: "Hangi protokol yalnızca 2 hat ile adresleme yaparak çok sayıda cihaza bağlanır?", a: ["SPI", "UART", "I²C", "PWM"], c: 2 },
    { q: "Program kodu mikrodenetleyicide genellikle nerede saklanır?", a: ["SRAM", "Flash", "Register", "Stack"], c: 1 },
    { q: "%25 duty cycle ile 3.3 V PWM sinyalinin ortalama voltajı yaklaşık kaçtır?", a: ["0.83 V", "1.65 V", "2.48 V", "3.3 V"], c: 0 },
    { q: "Araçlardaki ECU'lar birbirleriyle çoğunlukla hangi veri yolu üzerinden haberleşir?", a: ["USB", "CAN", "I²C", "HDMI"], c: 1 },
    { q: "Mars Pathfinder'ın tekrar tekrar resetlenmesinin temel nedeni neydi?", a: ["Bellek sızıntısı", "Öncelik terslenmesi", "Radyasyon", "Pil arızası"], c: 1 },
  ];
  const quiz = document.getElementById("quiz");
  let answered = 0, score = 0;
  const scoreEl = document.createElement("div");
  scoreEl.className = "q-score";
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
        scoreEl.textContent = `Sonuç: ${score} / ${questions.length} ${score === questions.length ? "🎉 Mükemmel!" : score >= 4 ? "👏 Güzel!" : "📚 Tekrar göz atalım"}`;
      }
    });
    quiz.appendChild(el);
  });
  quiz.appendChild(scoreEl);

  /* ================= Başlangıç ================= */
  const initial = parseInt(location.hash.slice(1), 10);
  go(Number.isFinite(initial) ? initial - 1 : 0);
  window.addEventListener("hashchange", () => {
    const n = parseInt(location.hash.slice(1), 10);
    if (Number.isFinite(n) && n - 1 !== current) go(n - 1);
  });
})();
