<script src="https://cdn.jsdelivr.net/npm/html5-qrcode/minified/html5-qrcode.min.js"></script>

<script>

document.addEventListener("DOMContentLoaded", function () {

  const PRIZE_PATH   = "/trade-show-incentive-grand-prize";
  const MILESTONES   = [10, 15, 20, 25];
  const CONTINUE_TXT = "Thank you for your continued participation in our Trade Show Incentive Scheme. Submit another entry for an additional chance to win our Grand Prize.";

  const DAY_COUNTS = {
    "2026-09-08": { label: "Tuesday",   count: 22 },
    "2026-09-09": { label: "Wednesday", count: 18 },
    "2026-09-10": { label: "Thursday",  count: 18 },
  };

  function updateSupplierTotal() {
    const totalEl = document.getElementById("supplier-total");
    if (!totalEl) return;
    const today = new Date().toISOString().slice(0, 10);
    const day = DAY_COUNTS[today];
    totalEl.textContent = day ? day.count : "–";
  }

  let scanCount = JSON.parse(localStorage.getItem("scanCount")) || 0;
  let scannedSuppliers = JSON.parse(localStorage.getItem("scannedSuppliers")) || [];

  const countEl = document.getElementById("scan-count");
  const modal   = document.getElementById("trade-show-modal");
  const toastEl = document.getElementById("ts-toast");

  let toastTimer;
  function showToast(msg, green = false, duration = 3000) {
    clearTimeout(toastTimer);
    toastEl.textContent = msg;
    toastEl.className = "ts-toast" + (green ? " green" : "");
    toastEl.getBoundingClientRect();
    toastEl.classList.add("show");
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), duration);
  }

  function bumpCounter() {
    countEl.textContent = scanCount;
    countEl.classList.remove("bump");
    void countEl.offsetWidth;
    countEl.classList.add("bump");
  }

  function persist() {
    localStorage.setItem("scannedSuppliers", JSON.stringify(scannedSuppliers));
    localStorage.setItem("scanCount", scanCount);
  }

  function applyPrizeState() {
    const wrap = document.getElementById("ts-prize-wrap");
    if (!wrap) return;
    const unlocked = localStorage.getItem("prizeUnlocked") === "1";
    const hidden   = localStorage.getItem("prizeBtnHidden") === "1";
    wrap.style.display = (unlocked && !hidden) ? "block" : "none";
  }

  function syncModalFromFlag() {
    if (localStorage.getItem("modalVisible") === "1") modal.classList.add("open");
    else modal.classList.remove("open");
  }

  function markPrizeEntered() {
    localStorage.setItem("prizeBtnHidden", "1");
    localStorage.removeItem("modalVisible");
  }

  document.addEventListener("click", function (e) {
    if (e.target.closest('a[href$="' + PRIZE_PATH + '"]')) {
      markPrizeEntered();
    }
  });

  function renderTable() {
    const tbody = document.querySelector("#supplier-log tbody");
    tbody.innerHTML = "";
    if (scannedSuppliers.length === 0) {
      const tr = tbody.insertRow();
      const td = tr.insertCell(0);
      td.colSpan = 2;
      td.className = "ts-empty";
      td.textContent = "No scans recorded - interact with suppliers to claim an enhanced goody bag and enter our incentive prize draw";
      return;
    }
    [...scannedSuppliers].reverse().forEach(entry => {
      const tr = tbody.insertRow();
      tr.insertCell(0).textContent = entry.timestamp;
      tr.insertCell(1).textContent = entry.supplier;
    });
  }

  bumpCounter();
  renderTable();
  updateSupplierTotal();

  syncModalFromFlag();
  applyPrizeState();

  let continueModal = null;
  (function buildContinueModal() {
    const base = document.getElementById("trade-show-modal");
    if (!base) return;
    continueModal = base.cloneNode(true);
    continueModal.id = "trade-show-modal-continue";
    continueModal.classList.remove("open");

    const paras = continueModal.querySelectorAll(".ts-modal-content p");
    if (paras[0]) paras[0].textContent = CONTINUE_TXT;
    if (paras[1]) paras[1].remove();

    const closeBtn = continueModal.querySelector(".ts-close");
    if (closeBtn) closeBtn.id = "ts-close-continue";

    const cta = continueModal.querySelector(".ts-modal-cta");
    if (cta) cta.id = "ts-modal-cta-continue";

    document.body.appendChild(continueModal);

    function closeContinue() { continueModal.classList.remove("open"); }
    if (closeBtn) closeBtn.addEventListener("click", closeContinue);
    continueModal.addEventListener("click", function (e) {
      if (e.target === continueModal) closeContinue();
    });
  })();

  function openContinueModal() {
    if (!continueModal) return;
    localStorage.removeItem("prizeBtnHidden");
    applyPrizeState();
    continueModal.classList.add("open");
  }

  const qrScanner = new Html5Qrcode("qr-reader");

  function qrBoxSize() {
    const container = document.getElementById("qr-container");
    const size = Math.floor(Math.min(container.offsetWidth, container.offsetHeight) * 0.72);
    return { width: size, height: size };
  }

  function injectOverlay() {
    const container = document.getElementById("qr-container");
    if (!container || document.getElementById("qr-overlay")) return;
    const overlay = document.createElement("div");
    overlay.id = "qr-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <p id="qr-hint">Position QR code within the frame</p>
      <div id="qr-overlay-inner">
        <div class="qr-corner qr-tl"></div>
        <div class="qr-corner qr-tr"></div>
        <div class="qr-corner qr-bl"></div>
        <div class="qr-corner qr-br"></div>
        <div id="qr-scan-line"></div>
      </div>`;
    container.appendChild(overlay);
  }

  function showCameraError() {
    const container = document.getElementById("qr-container");
    const overlay   = document.getElementById("qr-overlay");
    if (overlay) overlay.remove();
    if (!container || document.getElementById("qr-cam-error")) return;

    const msg = document.createElement("div");
    msg.id = "qr-cam-error";
    msg.style.cssText = "padding:28px 20px;text-align:center;background:#fff;color:#232323;border-bottom:1px solid #e8ede9;";
    msg.innerHTML =
      '<p style="font-weight:700;font-size:15px;margin-bottom:8px;">Camera access required</p>' +
      '<p style="font-size:13px;color:#6b7280;line-height:1.5;">Please allow camera access when prompted, or check your browser settings.</p>';

    container.insertAdjacentElement("afterend", msg);
    container.style.display = "none";
  }

  function onScan(decodedText) {
    if (scannedSuppliers.some(e => e.supplier === decodedText)) return;
    scanCount++;
    scannedSuppliers.push({ timestamp: new Date().toLocaleString(), supplier: decodedText });
    bumpCounter();
    renderTable();
    persist();
    showToast("✓ Scanned: " + decodedText, true);
    if (scanCount === 5) {
      setTimeout(() => {
        modal.classList.add("open");
        localStorage.setItem("modalVisible", "1");
        localStorage.setItem("prizeUnlocked", "1");
        applyPrizeState();
      }, 600);
    }
    if (MILESTONES.indexOf(scanCount) !== -1) {
      setTimeout(openContinueModal, 600);
    }
  }

  qrScanner.start(
    { facingMode: { exact: "environment" } },
    { fps: 10, qrbox: qrBoxSize, aspectRatio: 1.0 },
    onScan
  ).then(() => {
    setTimeout(injectOverlay, 400);
  }).catch(() => {
    injectOverlay();
    qrScanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: qrBoxSize, aspectRatio: 1.0 },
      onScan
    ).catch(showCameraError);
  });

  function closeModal() {
    modal.classList.remove("open");
    localStorage.removeItem("modalVisible");
  }
  document.getElementById("ts-close").addEventListener("click", closeModal);
  modal.addEventListener("click", function(e) { if (e.target === modal) closeModal(); });

  let lastToggleTime = 0;
  function toggleDay(day) {
    const now = Date.now();
    if (now - lastToggleTime < 350) return;
    lastToggleTime = now;
    const wrapper = document.querySelector(`.ts-brand-scroll-wrapper[data-day="${day}"]`);
    const header  = document.querySelector(`.ts-brand-header[data-day="${day}"]`);
    if (!wrapper || !header) return;
    const opening = !wrapper.classList.contains("open");
    wrapper.classList.toggle("open");
    header.classList.toggle("open");
    if (opening) {
      wrapper.addEventListener("transitionend", function onEnd() {
        wrapper.removeEventListener("transitionend", onEnd);
        updateArrows(day);
      });
    }
  }

  let tsX = 0, tsY = 0, tsMoved = false;
  document.addEventListener("touchstart", function(e) {
    tsX = e.touches[0].clientX; tsY = e.touches[0].clientY; tsMoved = false;
  }, { passive: true });
  document.addEventListener("touchmove", function(e) {
    if (Math.abs(e.touches[0].clientX - tsX) > 8 || Math.abs(e.touches[0].clientY - tsY) > 8) tsMoved = true;
  }, { passive: true });
  document.addEventListener("touchend", function(e) {
    if (tsMoved) return;
    const header = e.target.closest(".ts-brand-header");
    if (header) { e.preventDefault(); toggleDay(header.dataset.day); }
  }, { passive: false });
  document.addEventListener("click", function(e) {
    const header = e.target.closest(".ts-brand-header");
    if (header) toggleDay(header.dataset.day);
  });

  function getScrollBounds(scroll) {
    return Math.max(0, scroll.scrollWidth - scroll.clientWidth);
  }
  function updateArrows(day) {
    const scroll   = document.querySelector(`.ts-brand-scroll[data-day="${day}"]`);
    const leftBtn  = document.querySelector(`.ts-scroll-btn[data-dir="left"][data-day="${day}"]`);
    const rightBtn = document.querySelector(`.ts-scroll-btn[data-dir="right"][data-day="${day}"]`);
    if (!scroll) return;
    const max = getScrollBounds(scroll);
    leftBtn.disabled  = scroll.scrollLeft <= 0;
    rightBtn.disabled = scroll.scrollLeft >= max - 1;
  }
  document.querySelectorAll(".ts-scroll-btn").forEach(btn => {
    btn.addEventListener("click", function () {
      const day = btn.dataset.day, dir = btn.dataset.dir;
      const scroll = document.querySelector(`.ts-brand-scroll[data-day="${day}"]`);
      if (!scroll) return;
      const step = 200, max = getScrollBounds(scroll);
      const target = dir === "left" ? Math.max(0, scroll.scrollLeft - step) : Math.min(max, scroll.scrollLeft + step);
      scroll.scrollTo({ left: target, behavior: "smooth" });
      updateArrows(day);
      setTimeout(() => updateArrows(day), 400);
    });
  });
  document.querySelectorAll(".ts-brand-scroll").forEach(scroll => {
    const day = scroll.dataset.day;
    scroll.addEventListener("scroll", () => {
      const max = getScrollBounds(scroll);
      if (scroll.scrollLeft > max) scroll.scrollLeft = max;
      updateArrows(day);
    }, { passive: true });
  });

  window.addEventListener("pageshow", function () {
    applyPrizeState();
    syncModalFromFlag();
    if (continueModal) continueModal.classList.remove("open");
  });

});

</script>
