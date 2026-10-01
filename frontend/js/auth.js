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
        const session = await api.login(formData.get("usuario"), formData.get("contrasena"));
        window.location.hash = session.rol === "student" ? "#portal-estudiante" : "#inicio";
    } catch (error) {
        message.innerHTML = showMessage(error.message);
        button.disabled = false;
        button.textContent = "Iniciar sesión";
    }
}

export function renderActiveAdmin() {
    const admin = api.getUser() || api.getAdmin();
    const element = document.querySelector("#usuario-activo");
    if (element) {
        const nombre = admin?.nombre_completo || [admin?.nombre, admin?.apellido].filter(Boolean).join(" ") || admin?.usuario || "Usuario";
        element.textContent = `Sesión: ${escapeHtml(nombre)} · ${api.getRole() === "student" ? "Estudiante" : "Administrador"}`;
        const sidebarName = document.querySelector("#student-sidebar-name");
        if (sidebarName) sidebarName.textContent = [admin?.nombre, admin?.apellido].filter(Boolean).join(" ") || admin?.correo || "Estudiante";
    }
}

export async function renderRegistroCuenta(app) {
    app.innerHTML = await loadView("views/registro-cuenta.html");
    document.querySelector("#account-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = Object.fromEntries(new FormData(form));
        const message = document.querySelector("#account-message");
        if (!/^[\p{L}]+(?:[ '\u2019-][\p{L}]+)*$/u.test(data.nombre.trim())
            || !/^[\p{L}]+(?:[ '\u2019-][\p{L}]+)*$/u.test(data.apellido.trim())) {
            message.innerHTML = showMessage("Nombre y apellido solo pueden contener letras, espacios, apóstrofes y guiones.");
            return;
        }
        if (!esCedulaPanamena(data.cedula)) {
            message.innerHTML = showMessage("La cédula debe tener 8 dígitos; puede usar guiones, por ejemplo 8-123-1234.");
            return;
        }
        if (!/^\d{8}$/.test(data.telefono.replace(/[-\s]/g, ""))) {
            message.innerHTML = showMessage("El teléfono debe tener exactamente 8 dígitos.");
            return;
        }
        if (data.contrasena !== data.confirmar_contrasena) {
            message.innerHTML = showMessage("Las contraseñas no coinciden.");
            return;
        }
        delete data.confirmar_contrasena;
        const button = form.querySelector("button[type=submit]");
        button.disabled = true;
        try {
            const result = await api.registrarCuentaEstudiante(data);
            message.innerHTML = showMessage(`${result.mensaje} Ya puedes iniciar sesión.`, "exito");
            form.reset();
        } catch (error) {
            message.innerHTML = showMessage(error.message);
        } finally {
            button.disabled = false;
        }
    });
}

function esCedulaPanamena(value) {
    const text = String(value || "").trim();
    if (!/^\d+(?:-\d+){0,2}$/.test(text) || text.replaceAll("-", "").length !== 8) return false;
    const groups = text.split("-");
    return groups.length === 1 || (groups.length === 3
        && groups[0].length <= 2 && groups[1].length <= 4 && groups[2].length <= 6);
}
