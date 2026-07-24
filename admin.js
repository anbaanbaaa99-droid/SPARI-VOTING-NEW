"use strict";

const API_URL = window.SPARI_CONFIG.API_URL;
const CANDIDATES = window.SPARI_CONFIG.CANDIDATES;
const adminPassword = sessionStorage.getItem("spari_admin_password");
let chartInstance = null;
let voters = [];

if (!adminPassword) window.location.replace("admin-login.html");

async function adminRequest(action, extra = {}) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, password: adminPassword, ...extra })
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (data.success === false) throw new Error(data.message || "Permintaan admin gagal.");
  return data;
}

async function loadAdmin() {
  setMessage("Memuat data...");
  try {
    const data = await adminRequest("admin");
    const c1 = Number(data.kandidat1 ?? data.counts?.kandidat1 ?? 0);
    const c2 = Number(data.kandidat2 ?? data.counts?.kandidat2 ?? 0);
    const total = Number(data.total ?? c1 + c2);

    document.getElementById("kandidat1").textContent = c1;
    document.getElementById("kandidat2").textContent = c2;
    document.getElementById("total").textContent = total;
    voters = Array.isArray(data.voters) ? data.voters : [];
    renderTable(voters);
    createChart(c1, c2);
    updateStatusBadge(data.status);
    setMessage(`Data diperbarui: ${new Date().toLocaleTimeString("id-ID")}`);
  } catch (error) {
    if (/password|akses|login/i.test(error.message)) {
      sessionStorage.removeItem("spari_admin_password");
      window.location.replace("admin-login.html");
      return;
    }
    setMessage(error.message || "Gagal memuat dashboard.", true);
  }
}

function createChart(kandidat1, kandidat2) {
  const canvas = document.getElementById("voteChart");
  if (!canvas || typeof Chart === "undefined") return;
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: CANDIDATES.map((candidate) => candidate.name),
      datasets: [{ data: [kandidat1, kandidat2], backgroundColor: ["#155eef", "#facc15"], borderWidth: 0 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      plugins: { legend: { position: "bottom" } }
    }
  });
}

function renderTable(rows) {
  const body = document.getElementById("table");
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="5">Belum ada data pemilih.</td></tr>';
    return;
  }
  body.innerHTML = rows.map((row, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(row.voterId || "-")}</td>
      <td>${escapeHtml(row.nama || "-")}</td>
      <td>${escapeHtml(row.kandidat || "-")}</td>
      <td>${escapeHtml(row.waktu || "-")}</td>
    </tr>`).join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[character]));
}

function updateStatusBadge(status) {
  const badge = document.getElementById("statusBadge");
  const open = String(status).toUpperCase() === "OPEN";
  badge.textContent = open ? "VOTING DIBUKA" : "VOTING DITUTUP";
  badge.className = `admin-status ${open ? "open" : "closed"}`;
}

async function setVoteStatus(status) {
  const label = status === "OPEN" ? "membuka" : "menutup";
  if (!confirm(`Yakin ingin ${label} voting?`)) return;
  setMessage(`Sedang ${label} voting...`);
  try {
    const data = await adminRequest("setStatus", { status });
    updateStatusBadge(data.status);
    setMessage(data.message || `Voting berhasil di${status === "OPEN" ? "buka" : "tutup"}.`);
  } catch (error) {
    setMessage(error.message, true);
  }
}

function exportCSV() {
  if (!voters.length) {
    setMessage("Belum ada data untuk diekspor.", true);
    return;
  }
  const headers = ["No", "ID Peserta", "Nama", "Kandidat", "Waktu"];
  const rows = voters.map((row, index) => [index + 1, row.voterId, row.nama, row.kandidat, row.waktu]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `hasil-voting-spari-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  let safe = String(value ?? "");
  if (/^[=+\-@]/.test(safe)) safe = `'${safe}`;
  return `"${safe.replace(/"/g, '""')}"`;
}

function setMessage(text, isError = false) {
  const element = document.getElementById("adminMessage");
  element.textContent = text;
  element.style.color = isError ? "#dc2626" : "#0c43b6";
}

function logout() {
  sessionStorage.removeItem("spari_admin_password");
  window.location.href = "admin-login.html";
}

document.getElementById("searchInput").addEventListener("input", (event) => {
  const term = event.target.value.trim().toLowerCase();
  const filtered = voters.filter((row) => [row.voterId, row.nama, row.kandidat, row.waktu]
    .some((value) => String(value || "").toLowerCase().includes(term)));
  renderTable(filtered);
});

document.addEventListener("DOMContentLoaded", loadAdmin);
