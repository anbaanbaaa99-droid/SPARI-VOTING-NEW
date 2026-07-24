/**
 * BACKEND SPARI ELECTION 2026 - Google Apps Script
 * Pasang sebagai script yang terikat pada Google Spreadsheet.
 */
const CONFIG = {
  SPREADSHEET_ID: "", // Kosongkan jika script dibuat dari Extensions > Apps Script di Google Sheet.
  VOTES_SHEET: "Votes",
  SETTINGS_SHEET: "Settings",
  ADMIN_PASSWORD: "SPARI2026", // WAJIB GANTI sebelum deployment publik.
  DEFAULT_STATUS: "OPEN",
  DEFAULT_DEADLINE: "2026-07-25T23:59:59+07:00",
  TIMEZONE: "Asia/Jakarta",
  CANDIDATES: [
    { id: "kandidat1", name: "Arya Ahmad Rizaldi" },
    { id: "kandidat2", name: "Ovie Dwi Riantiyastika" }
  ]
};

function doGet(e) {
  try {
    ensureDatabase_();
    const action = String((e && e.parameter && e.parameter.action) || "summary").toLowerCase();
    if (action === "summary" || action === "health") return json_(buildSummary_());
    return json_({ success: false, message: "Aksi GET tidak dikenali." });
  } catch (error) {
    return json_({ success: false, message: error.message });
  }
}

function doPost(e) {
  try {
    ensureDatabase_();
    const payload = parsePayload_(e);
    const action = String(payload.action || "vote").toLowerCase();

    if (action === "vote") return json_(saveVote_(payload));
    if (action === "login") return json_(login_(payload.password));
    if (action === "admin") return json_(getAdminData_(payload.password));
    if (action === "setstatus") return json_(setStatus_(payload.password, payload.status));

    return json_({ success: false, message: "Aksi POST tidak dikenali." });
  } catch (error) {
    return json_({ success: false, message: error.message });
  }
}

function saveVote_(payload) {
  const voterId = normalizeVoterId_(payload.voterId);
  const nama = cleanText_(payload.nama, 80);
  const kandidat = cleanText_(payload.kandidat, 100);

  if (!voterId || voterId.length < 3) throw new Error("ID peserta minimal 3 karakter.");
  if (!nama) throw new Error("Nama lengkap wajib diisi.");
  if (!CONFIG.CANDIDATES.some(function(candidate) { return candidate.name === kandidat; })) {
    throw new Error("Kandidat tidak valid.");
  }

  const settings = getSettings_();
  if (effectiveStatus_(settings) !== "OPEN") throw new Error("Voting telah ditutup.");

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    // Periksa lagi di dalam lock agar vote tidak lolos saat admin baru saja menutup voting.
    if (effectiveStatus_(getSettings_()) !== "OPEN") throw new Error("Voting telah ditutup.");
    const sheet = getSpreadsheet_().getSheetByName(CONFIG.VOTES_SHEET);
    const lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      const existingIds = sheet.getRange(2, 2, lastRow - 1, 1).getDisplayValues()
        .map(function(row) { return normalizeVoterId_(row[0]); });
      if (existingIds.indexOf(voterId) !== -1) {
        throw new Error("ID peserta ini sudah melakukan vote. Satu peserta hanya boleh memilih satu kali.");
      }
    }

    sheet.appendRow([new Date(), voterId, nama, kandidat]);
    return { success: true, message: "Suara Anda berhasil dicatat.", status: "OPEN" };
  } finally {
    lock.releaseLock();
  }
}

function login_(password) {
  const valid = securePasswordMatch_(password);
  return { success: valid, login: valid, message: valid ? "Login berhasil." : "Password admin salah." };
}

function getAdminData_(password) {
  requireAdmin_(password);
  const summary = buildSummary_();
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.VOTES_SHEET);
  const rows = sheet.getLastRow() < 2 ? [] : sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
  summary.voters = rows.map(function(row) {
    return {
      waktu: row[0] instanceof Date ? Utilities.formatDate(row[0], CONFIG.TIMEZONE, "dd/MM/yyyy HH:mm:ss") : String(row[0] || ""),
      voterId: String(row[1] || ""),
      nama: String(row[2] || ""),
      kandidat: String(row[3] || "")
    };
  }).reverse();
  return summary;
}

function setStatus_(password, requestedStatus) {
  requireAdmin_(password);
  const status = String(requestedStatus || "").toUpperCase();
  if (["OPEN", "CLOSED"].indexOf(status) === -1) throw new Error("Status harus OPEN atau CLOSED.");

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    writeSetting_("STATUS", status);
  } finally {
    lock.releaseLock();
  }
  return { success: true, status: status, message: status === "OPEN" ? "Voting berhasil dibuka." : "Voting berhasil ditutup." };
}

function buildSummary_() {
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.VOTES_SHEET);
  const lastRow = sheet.getLastRow();
  const candidateValues = lastRow < 2 ? [] : sheet.getRange(2, 4, lastRow - 1, 1).getDisplayValues().flat();
  const counts = { kandidat1: 0, kandidat2: 0 };
  candidateValues.forEach(function(value) {
    const candidate = CONFIG.CANDIDATES.find(function(item) { return item.name === value; });
    if (candidate) counts[candidate.id] += 1;
  });
  const settings = getSettings_();
  return {
    success: true,
    status: effectiveStatus_(settings),
    deadline: settings.DEADLINE,
    kandidat1: counts.kandidat1,
    kandidat2: counts.kandidat2,
    total: counts.kandidat1 + counts.kandidat2,
    counts: counts,
    candidates: CONFIG.CANDIDATES
  };
}

function effectiveStatus_(settings) {
  const configured = String(settings.STATUS || CONFIG.DEFAULT_STATUS).toUpperCase();
  const deadline = new Date(settings.DEADLINE || CONFIG.DEFAULT_DEADLINE).getTime();
  if (Number.isFinite(deadline) && Date.now() > deadline) return "CLOSED";
  return configured === "OPEN" ? "OPEN" : "CLOSED";
}

function ensureDatabase_() {
  const spreadsheet = getSpreadsheet_();
  let votes = spreadsheet.getSheetByName(CONFIG.VOTES_SHEET);
  if (!votes) votes = spreadsheet.insertSheet(CONFIG.VOTES_SHEET);
  if (votes.getLastRow() === 0) {
    votes.appendRow(["Timestamp", "Voter ID", "Nama", "Kandidat"]);
    votes.setFrozenRows(1);
  }

  let settings = spreadsheet.getSheetByName(CONFIG.SETTINGS_SHEET);
  if (!settings) settings = spreadsheet.insertSheet(CONFIG.SETTINGS_SHEET);
  if (settings.getLastRow() === 0) {
    settings.getRange(1, 1, 3, 2).setValues([
      ["KEY", "VALUE"],
      ["STATUS", CONFIG.DEFAULT_STATUS],
      ["DEADLINE", CONFIG.DEFAULT_DEADLINE]
    ]);
    settings.setFrozenRows(1);
  }
}

function getSettings_() {
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.SETTINGS_SHEET);
  const values = sheet.getDataRange().getDisplayValues();
  const settings = {};
  values.slice(1).forEach(function(row) {
    if (row[0]) settings[String(row[0]).toUpperCase()] = row[1];
  });
  if (!settings.STATUS) settings.STATUS = CONFIG.DEFAULT_STATUS;
  if (!settings.DEADLINE) settings.DEADLINE = CONFIG.DEFAULT_DEADLINE;
  return settings;
}

function writeSetting_(key, value) {
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.SETTINGS_SHEET);
  const values = sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 1), 1).getDisplayValues();
  for (let index = 0; index < values.length; index += 1) {
    if (String(values[index][0]).toUpperCase() === key) {
      sheet.getRange(index + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}

function getSpreadsheet_() {
  if (CONFIG.SPREADSHEET_ID) return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error("Spreadsheet tidak ditemukan. Isi CONFIG.SPREADSHEET_ID atau buat script dari Google Sheet.");
  return spreadsheet;
}

function parsePayload_(e) {
  if (!e) return {};
  const raw = e.postData && e.postData.contents ? e.postData.contents : "";
  if (raw) {
    try { return JSON.parse(raw); } catch (error) { /* fallback ke parameter */ }
  }
  return e.parameter || {};
}

function normalizeVoterId_(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}

function cleanText_(value, maxLength) {
  return String(value || "").trim().replace(/[<>]/g, "").slice(0, maxLength);
}

function securePasswordMatch_(password) {
  return String(password || "") === String(CONFIG.ADMIN_PASSWORD);
}

function requireAdmin_(password) {
  if (!securePasswordMatch_(password)) throw new Error("Akses admin ditolak. Silakan login kembali.");
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
