import { api } from "./api.js";
import { escapeHtml, loadView, showMessage } from "./ui.js";

export async function renderLogin(app) {
    app.innerHTML = await loadView("views/login.html");
    document.querySelector("#login-form").addEventListener("submit", handleLogin);
}

async function handleLogin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const message = document.querySelector("#login-message");
    const button = form.querySelector("button");
    button.disabled = true;
    button.textContent = "Ingresando...";
    message.innerHTML = "";

    try {
        const formData = new FormData(form);
        await api.login(formData.get("usuario"), formData.get("contrasena"));
        window.location.hash = "#inicio";
    } catch (error) {
        message.innerHTML = showMessage(error.message);
        button.disabled = false;
        button.textContent = "Iniciar sesión";
    }
}

export function renderActiveAdmin() {
    const admin = api.getAdmin();
    const element = document.querySelector("#usuario-activo");
    if (element) {
        element.textContent = `Sesión: ${escapeHtml(admin?.nombre_completo || admin?.usuario || "Administrador")}`;
    }
}
