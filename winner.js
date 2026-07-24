"use strict";
const { API_URL, CANDIDATES } = window.SPARI_CONFIG;

async function loadWinner() {
  const winner = document.getElementById("winner");
  const detail = document.getElementById("winnerDetail");
  try {
    const response = await fetch(`${API_URL}?action=summary&_=${Date.now()}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const c1 = Number(data.kandidat1 ?? data.counts?.kandidat1 ?? 0);
    const c2 = Number(data.kandidat2 ?? data.counts?.kandidat2 ?? 0);
    const total = Number(data.total ?? c1 + c2);

    if (total === 0) {
      winner.textContent = "Belum ada suara masuk";
    } else if (c1 === c2) {
      winner.textContent = "Hasil sementara masih imbang";
    } else {
      const elected = c1 > c2 ? CANDIDATES[0] : CANDIDATES[1];
      winner.textContent = elected.name;
    }
    detail.textContent = `${CANDIDATES[0].name}: ${c1} suara · ${CANDIDATES[1].name}: ${c2} suara · Total: ${total}`;
    drawChart(c1, c2);
  } catch (error) {
    winner.textContent = "Hasil belum dapat dimuat";
    detail.textContent = "Periksa URL deployment Google Apps Script pada config.js.";
  }
}

function drawChart(c1, c2) {
  new Chart(document.getElementById("winnerChart"), {
    type: "bar",
    data: {
      labels: CANDIDATES.map((candidate) => candidate.name),
      datasets: [{ label: "Jumlah suara", data: [c1, c2], backgroundColor: ["#155eef", "#facc15"], borderRadius: 8 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
  });
}

document.addEventListener("DOMContentLoaded", loadWinner);
