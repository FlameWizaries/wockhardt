// ============================================================
// МОДУЛЬ АВТОРИЗАЦИИ
// ============================================================

import { supabaseClient } from './app.js';
import { loadUserData, showApp, showAuth, updateHeader } from './app.js';

// ==================== DOM ЭЛЕМЕНТЫ ====================
const authPage = document.getElementById("authPage");
const appPage = document.getElementById("appPage");
const authForm = document.getElementById("authForm");
const authEmail = document.getElementById("authEmail");
const authUsername = document.getElementById("authUsername");
const usernameField = document.getElementById("usernameField");
const authPassword = document.getElementById("authPassword");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const authToggle = document.getElementById("authToggle");
const authError = document.getElementById("authError");
const logoutBtn = document.getElementById("logoutBtn");

// ==================== ПЕРЕМЕННЫЕ ====================
let isLoginMode = true;
export let currentUser = null;
export let currentUserRole = null;
export let currentUserId = null;
export let currentUserNickname = null;

// ==================== ОБРАБОТЧИКИ ====================

// Переключение между входом и регистрацией
if (authToggle) {
    authToggle.addEventListener("click", (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        authSubmitBtn.textContent = isLoginMode ? "LOGIN" : "REGISTER";
        authToggle.innerHTML = isLoginMode
            ? 'Нет аккаунта? <a href="#">Зарегистрироваться</a>'
            : 'Уже есть аккаунт? <a href="#">Войти</a>';
        authError.textContent = "";
        authError.style.color = "#ff4444";

        if (usernameField) {
            usernameField.style.display = isLoginMode ? "none" : "block";
        }

        if (authUsername) {
            if (isLoginMode) {
                authUsername.removeAttribute("required");
                authUsername.value = "";
            } else {
                authUsername.setAttribute("required", "required");
            }
        }
    });
}

// Отправка формы
if (authForm) {
    authForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        authError.textContent = "";
        authError.style.color = "#ff4444";

        const email = authEmail.value.trim();
        const password = authPassword.value.trim();
        let username = "";

        if (!isLoginMode) {
            username = authUsername.value.trim();
            if (!username) {
                authError.textContent = "⚠️ Введите ваш игровой ник!";
                showToast("⚠️ Введите игровой ник", "warning");
                return;
            }
        }

        if (!email || !password) {
            authError.textContent = "⚠️ Заполните все поля!";
            showToast("⚠️ Заполните все поля", "warning");
            return;
        }

        try {
            if (isLoginMode) {
                // ВХОД
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password,
                });
                if (error) throw error;
                currentUser = data.user;
                await loadUserData();
                showApp();
                showToast(`👋 Добро пожаловать, ${currentUserNickname}!`, "success");
            } else {
                // РЕГИСТРАЦИЯ
                const { data, error } = await supabaseClient.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: { username: username },
                    },
                });
                if (error) throw error;
                if (data.user) {
                    try {
                        await supabaseClient.from("users").insert([
                            {
                                id: data.user.id,
                                email: email,
                                username: username,
                                role: "member",
                            },
                        ]);
                    } catch (insertErr) {
                        console.warn("⚠️ Ошибка добавления в users:", insertErr);
                    }

                    authError.style.color = "#4ade80";
                    authError.textContent = "Регистрация успешна! Теперь войдите.";
                    showToast("Регистрация успешна! Теперь войдите.", "success");
                    isLoginMode = true;
                    authSubmitBtn.textContent = "LOGIN";
                    authToggle.innerHTML = 'Нет аккаунта? <a href="#">Зарегистрироваться</a>';
                    authPassword.value = "";
                    authUsername.value = "";
                    if (usernameField) usernameField.style.display = "none";
                    if (authUsername) authUsername.removeAttribute("required");
                }
            }
        } catch (error) {
            console.error("Ошибка авторизации:", error);
            authError.style.color = "#ff4444";
            
            // ========== ПЕРЕВОД ОШИБОК НА РУССКИЙ ==========
            let errorMessage = 'Произошла ошибка. Попробуйте позже.';
            
            if (error.message) {
                const msg = error.message.toLowerCase();
                
                if (msg.includes('invalid login credentials') || 
                    msg.includes('invalid credentials') ||
                    msg.includes('wrong password') ||
                    msg.includes('incorrect password')) {
                    errorMessage = 'Неверный email или пароль. Проверьте данные.';
                } else if (msg.includes('email not confirmed') || msg.includes('unconfirmed')) {
                    errorMessage = 'Email не подтвержден. Проверьте почту.';
                } else if (msg.includes('user already registered')) {
                    errorMessage = 'Этот email уже зарегистрирован. Войдите.';
                } else if (msg.includes('password should be at least')) {
                    errorMessage = 'Пароль должен быть минимум 6 символов.';
                } else if (msg.includes('user already exists')) {
                    errorMessage = 'Пользователь с таким email уже существует.';
                } else if (msg.includes('rate limit')) {
                    errorMessage = 'Слишком много попыток. Подождите немного.';
                } else if (msg.includes('network error') || msg.includes('failed to fetch')) {
                    errorMessage = 'Ошибка сети. Проверьте подключение к интернету.';
                } else if (msg.includes('permission denied') || msg.includes('forbidden')) {
                    errorMessage = 'Нет доступа. Обратитесь к лидеру.';
                } else if (msg.includes('user not found')) {
                    errorMessage = 'Пользователь не найден. Проверьте email.';
                } else {
                    errorMessage = error.message;
                }
            }
            
            authError.textContent = errorMessage;
            showToast(errorMessage, 'error');
        }
    });
}

// Выход
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        await supabaseClient.auth.signOut();
        currentUser = null;
        currentUserRole = null;
        currentUserId = null;
        currentUserNickname = null;
        showAuth();
    });
}

// Экспортируем функции для использования в других модулях
export { isLoginMode };