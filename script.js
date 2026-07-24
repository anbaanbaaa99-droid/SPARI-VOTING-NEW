"use strict";

const { API_URL, CANDIDATES, FALLBACK_DEADLINE } = window.SPARI_CONFIG;
let votingStatus = "OPEN";
let deadline = new Date(FALLBACK_DEADLINE).getTime();
let publicChart = null;

function goVote() {
  document.getElementById("candidate")?.scrollIntoView({ behavior: "smooth" });
}

async function apiRequest(payload = null) {
  const options = payload
    ? {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      }
    : { method: "GET" };

  const response = await fetch(payload ? API_URL : `${API_URL}?action=summary&_=${Date.now()}`, options);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (data.success === false) throw new Error(data.message || "Permintaan gagal");
  return data;
}

function setVotingButtonsDisabled(disabled) {
  document.querySelectorAll(".vote-button").forEach((button) => {
    button.disabled = disabled;
  });
}

function updateStatus(status) {
  votingStatus = String(status || "OPEN").toUpperCase();
  const badge = document.getElementById("statusBadge");
  if (!badge) return;
  const isOpen = votingStatus === "OPEN";
  badge.textContent = isOpen ? "Voting sedang dibuka" : "Voting telah ditutup";
  badge.className = `status-badge ${isOpen ? "open" : "closed"}`;
  setVotingButtonsDisabled(!isOpen || Boolean(localStorage.getItem("spari_voted_id")));
}

async function confirmVote(candidateName) {
  if (votingStatus !== "OPEN") {
    await Swal.fire("Voting ditutup", "Pemilihan sudah tidak menerima suara.", "info");
    return;
  }

  if (localStorage.getItem("spari_voted_id")) {
    await Swal.fire("Vote sudah tercatat", "Perangkat ini telah digunakan untuk melakukan vote.", "info");
    return;
  }

  const result = await Swal.fire({
    title: `Pilih ${candidateName}?`,
    html: `
      <input id="swal-voter-id" class="swal2-input" maxlength="40" placeholder="ID peserta / nomor anggota">
      <input id="swal-name" class="swal2-input" maxlength="80" placeholder="Nama lengkap">
      <p style="font-size:.83rem;color:#64748b;margin:12px 20px 0">ID peserta menjadi kunci satu orang satu vote.</p>
    `,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Ya, kirim vote",
    cancelButtonText: "Batal",
    focusConfirm: false,
    preConfirm: () => {
      const voterId = document.getElementById("swal-voter-id").value.trim();
      const name = document.getElementById("swal-name").value.trim();
      if (!voterId || !name) {
        Swal.showValidationMessage("ID peserta dan nama lengkap wajib diisi.");
        return false;
      }
      if (voterId.length < 3) {
        Swal.showValidationMessage("ID peserta minimal 3 karakter.");
        return false;
      }
      return { voterId, name };
    }
  });

  if (result.isConfirmed) {
    await submitVote(candidateName, result.value);
  }
}

async function submitVote(candidateName, voter) {
  Swal.fire({
    title: "Mengirim suara...",
    text: "Mohon tunggu.",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  try {
    const data = await apiRequest({
      action: "vote",
      voterId: voter.voterId,
      nama: voter.name,
      kandidat: candidateName
    });

    localStorage.setItem("spari_voted_id", voter.voterId.trim().toUpperCase());
    setVotingButtonsDisabled(true);
    await Swal.fire("Vote berhasil", data.message || "Suara Anda berhasil dicatat.", "success");
    await loadResult();
  } catch (error) {
    const duplicate = /sudah|duplicate|terdaftar/i.test(error.message);
    await Swal.fire(
      duplicate ? "Tidak dapat memilih lagi" : "Vote gagal",
      error.message || "Terjadi kesalahan saat mengirim vote.",
      duplicate ? "warning" : "error"
    );
  }
}

function normalizeSummary(data) {
  const c1 = Number(data.kandidat1 ?? data.counts?.kandidat1 ?? 0);
  const c2 = Number(data.kandidat2 ?? data.counts?.kandidat2 ?? 0);
  const total = Number(data.total ?? c1 + c2);
  return { c1, c2, total };
}

async function loadResult() {
  const resultContainer = document.getElementById("hasil");
  try {
    const data = await apiRequest();
    const { c1, c2, total } = normalizeSummary(data);
    const p1 = total ? Math.round((c1 / total) * 100) : 0;
    const p2 = total ? Math.round((c2 / total) * 100) : 0;

    if (data.deadline) deadline = new Date(data.deadline).getTime();
    updateStatus(data.status);

    resultContainer.innerHTML = `
      <article class="result-card">
        <h3>${CANDIDATES[0].name}</h3>
        <div class="result-number">${c1}</div>
        <div class="result-percent">${p1}% suara</div>
      </article>
      <article class="result-card">
        <h3>${CANDIDATES[1].name}</h3>
        <div class="result-number">${c2}</div>
        <div class="result-percent">${p2}% suara</div>
      </article>
      <article class="result-card">
        <h3>Total Pemilih</h3>
        <div class="result-number">${total}</div>
        <div class="result-percent">orang</div>
      </article>`;

    drawPublicChart(c1, c2);
  } catch (error) {
    console.error(error);
    resultContainer.innerHTML = `<div class="loading-card">Data belum dapat dimuat. Periksa URL deployment Apps Script.</div>`;
  }
}

function drawPublicChart(c1, c2) {
  const canvas = document.getElementById("publicVoteChart");
  if (!canvas || typeof Chart === "undefined") return;
  if (publicChart) publicChart.destroy();
  publicChart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: CANDIDATES.map((candidate) => candidate.name),
      datasets: [{ data: [c1, c2], backgroundColor: ["#155eef", "#facc15"], borderWidth: 0 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
      cutout: "62%"
    }
  });
}

function updateCountdown() {
  const timer = document.getElementById("timer");
  if (!timer) return;
  const distance = deadline - Date.now();
  if (!Number.isFinite(distance) || distance <= 0) {
    timer.textContent = "Voting Ditutup";
    if (votingStatus !== "CLOSED") updateStatus("CLOSED");
    return;
  }

  const days = Math.floor(distance / 86400000);
  const hours = Math.floor((distance % 86400000) / 3600000);
  const minutes = Math.floor((distance % 3600000) / 60000);
  const seconds = Math.floor((distance % 60000) / 1000);
  timer.textContent = `${days} Hari ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".vote-button").forEach((button) => {
    button.addEventListener("click", () => confirmVote(button.dataset.candidate));
  });
  loadResult();
  updateCountdown();
  setInterval(updateCountdown, 1000);
  setInterval(loadResult, 30000);
});
