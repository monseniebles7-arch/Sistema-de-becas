import { api } from "./api.js";
import { escapeHtml, showMessage } from "./ui.js";

const PROVINCE_LABELS = {
    bocas_del_toro: "Bocas del Toro", cocle: "Coclé", colon: "Colón", chiriqui: "Chiriquí",
    darien: "Darién", herrera: "Herrera", los_santos: "Los Santos", panama: "Panamá",
    panama_oeste: "Panamá Oeste", veraguas: "Veraguas", guna_yala: "Guna Yala",
    embera_wounaan: "Emberá-Wounaan", ngabe_bugle: "Ngäbe-Buglé",
};

export async function renderAdministradores(container) {
    const form = container.querySelector("#admin-create-form");
    const message = container.querySelector("#admin-management-message");
    const officeSelect = form.querySelector("#admin-office");
    try {
        const [centers, admins] = await Promise.all([
            api.listarCentrosAtencion(),
            api.listarAdministradores(),
        ]);
        fillOfficeSelect(officeSelect, centers);
        renderAdmins(container.querySelector("#admin-accounts-list"), admins);
        if (!centers.length) {
            message.innerHTML = showMessage("El catálogo de centros está vacío. Ejecuta la migración 20261019_admin_roles_centros.sql completa en la base de datos.");
        }
    } catch (error) {
        officeSelect.replaceChildren(new Option("No se pudieron cargar los centros", ""));
        officeSelect.disabled = true;
        message.innerHTML = showMessage(error.message);
        container.querySelector("#admin-accounts-list").textContent = "No se pudieron cargar las cuentas administrativas.";
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        const data = Object.fromEntries(new FormData(form));
        data.centro_atencion_id = Number(data.centro_atencion_id);
        const button = form.querySelector("button[type=submit]");
        button.disabled = true;
        button.textContent = "Creando cuenta...";
        message.innerHTML = "";
        try {
            await api.crearAdministrador(data);
            form.reset();
            message.innerHTML = showMessage("Administrador creado correctamente.", "exito");
            const admins = await api.listarAdministradores();
            renderAdmins(container.querySelector("#admin-accounts-list"), admins);
        } catch (error) {
            message.innerHTML = showMessage(error.message);
        } finally {
            button.disabled = false;
            button.textContent = "Crear administrador";
        }
    });
}

function fillOfficeSelect(select, centers) {
    select.disabled = centers.length === 0;
    select.replaceChildren(new Option(centers.length ? "Seleccione un centro" : "No hay centros cargados", ""));
    const groups = new Map();
    for (const center of centers) {
        if (!groups.has(center.provincia)) {
            const group = document.createElement("optgroup");
            group.label = PROVINCE_LABELS[center.provincia] || center.provincia;
            groups.set(center.provincia, group);
            select.append(group);
        }
        groups.get(center.provincia).append(new Option(center.nombre, String(center.id)));
    }
}

function renderAdmins(target, admins) {
    if (!admins.length) {
        target.textContent = "No hay administradores registrados.";
        return;
    }
    target.innerHTML = `<div class="admin-account-list">${admins.map((admin) => `
        <article class="admin-account-item">
            <div><strong>${escapeHtml(admin.nombre_completo || admin.usuario)}</strong><span>${escapeHtml(admin.correo || "Sin correo")}</span></div>
            <div><strong>${admin.rol === "senior" ? "Administrador Senior" : "Administrador Junior"}</strong><span>${escapeHtml(admin.centro_atencion || "Sin centro asignado")} · ${admin.alcance === "provincia" ? "Toda la provincia" : "Solo este centro"}</span></div>
        </article>`).join("")}</div>`;
}
