import { api } from "./api.js";
import { loadView, showMessage } from "./ui.js";

export function renderActiveAdmin() {
    const admin = api.getUser() || api.getAdmin();
    const element = document.querySelector("#usuario-activo");
    if (element) {
        const nombre = admin?.nombre_completo || [admin?.nombre, admin?.apellido].filter(Boolean).join(" ") || admin?.usuario || "Usuario";
        element.textContent = nombre;
        const sidebarName = document.querySelector("#student-sidebar-name");
        if (sidebarName) sidebarName.textContent = [admin?.nombre, admin?.apellido].filter(Boolean).join(" ") || admin?.correo || "Estudiante";
        const adminName = document.querySelector("#admin-sidebar-name");
        if (adminName) adminName.textContent = nombre;
        const roleLabel = document.querySelector("#admin-sidebar-role");
        if (roleLabel) roleLabel.textContent = api.getRole() === "admin_senior" ? "Administrador Senior" : "Administrador Junior";
        const managerLink = document.querySelector("#admin-managers-link");
        if (managerLink) managerLink.hidden = api.getRole() !== "admin_senior";
        const initials = document.querySelector("#panel-user-initials");
        if (initials) {
            const parts = nombre.trim().split(/\s+/).filter(Boolean);
            initials.textContent = parts.slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase() || "US";
        }
    }
}

export async function renderRegistroCuenta(app) {
    app.innerHTML = await loadView("views/registro-cuenta.html");
    const form = document.querySelector("#account-form");
    const message = document.querySelector("#account-message");
    const centerSelect = document.querySelector("#centro-atencion-cuenta");
    try {
        const centers = await api.listarCentrosAtencion();
        centerSelect.replaceChildren(new Option("Seleccione su centro IFARHU", ""));
        const provinceNames = provinceLabels();
        const groups = new Map();
        for (const center of centers) {
            if (!groups.has(center.provincia)) {
                const group = document.createElement("optgroup");
                group.label = provinceNames[center.provincia] || center.provincia;
                groups.set(center.provincia, group);
                centerSelect.append(group);
            }
            groups.get(center.provincia).append(new Option(center.nombre, String(center.id)));
        }
    } catch (error) {
        centerSelect.replaceChildren(new Option("No se pudieron cargar los centros", ""));
        message.innerHTML = showMessage(`No se pudo cargar el catálogo de centros de atención: ${error.message}`);
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(form));
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
        data.centro_atencion_id = Number(data.centro_atencion_id);
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

function provinceLabels() {
    return {
        bocas_del_toro: "Bocas del Toro", cocle: "Coclé", colon: "Colón", chiriqui: "Chiriquí",
        darien: "Darién", herrera: "Herrera", los_santos: "Los Santos", panama: "Panamá",
        panama_oeste: "Panamá Oeste", veraguas: "Veraguas", guna_yala: "Guna Yala",
        embera_wounaan: "Emberá-Wounaan", ngabe_bugle: "Ngäbe-Buglé",
    };
}

function esCedulaPanamena(value) {
    const text = String(value || "").trim();
    if (!/^\d+(?:-\d+){0,2}$/.test(text) || text.replaceAll("-", "").length !== 8) return false;
    const groups = text.split("-");
    return groups.length === 1 || (groups.length === 3
        && groups[0].length <= 2 && groups[1].length <= 4 && groups[2].length <= 6);
}
