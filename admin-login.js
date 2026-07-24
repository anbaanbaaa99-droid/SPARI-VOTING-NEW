"use strict";

const API_URL = window.SPARI_CONFIG.API_URL;

async function login(event) {
  event.preventDefault();
  const passwordInput = document.getElementById("password");
  const message = document.getElementById("loginMessage");
  const button = document.getElementById("loginButton");
  const password = passwordInput.value;

  message.textContent = "";
  button.disabled = true;
  button.textContent = "Memeriksa...";

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "login", password })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data.login) throw new Error(data.message || "Password admin salah.");

    sessionStorage.setItem("spari_admin_password", password);
    window.location.href = "admin.html";
  } catch (error) {
    message.textContent = error.message || "Login gagal. Periksa koneksi dan URL API.";
    passwordInput.focus();
  } finally {
    button.disabled = false;
    button.textContent = "Masuk";
  }
}

document.getElementById("loginForm").addEventListener("submit", login);
