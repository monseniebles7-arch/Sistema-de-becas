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
        const [centers, admins, absences] = await Promise.all([
            api.listarCentrosAtencion(),
            api.listarAdministradores(),
            api.listarAusencias(),
        ]);
        fillOfficeSelect(officeSelect, centers);
        renderAdmins(container.querySelector("#admin-accounts-list"), admins);
        fillReviewerSelect(container.querySelector("#vacation-reviewer"), admins);
        renderAbsences(container.querySelector("#admin-absences-list"), absences);
        container.querySelector("#vacation-start").min = localDate();
        container.querySelector("#vacation-end").min = localDate();
        if (!centers.length) {
            message.innerHTML = showMessage("No hay centros de atencion registrados.");
        }
    } catch (error) {
        officeSelect.replaceChildren(new Option("No se pudieron cargar los centros", ""));
        officeSelect.disabled = true;
        message.innerHTML = showMessage(error.message);
        container.querySelector("#admin-accounts-list").textContent = "No se pudieron cargar las cuentas administrativas.";
        return;
    }

    const vacationForm = container.querySelector("#admin-vacation-form");
    vacationForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!vacationForm.reportValidity()) return;
        const data = Object.fromEntries(new FormData(vacationForm));
        const reviewerId = Number(data.administrador_id);
        delete data.administrador_id;
        const button = vacationForm.querySelector("button[type=submit]");
        const feedback = container.querySelector("#admin-availability-message");
        button.disabled = true;
        feedback.innerHTML = "";
        try {
            const result = await api.programarVacaciones(reviewerId, data);
            feedback.innerHTML = showMessage(result.mensaje, "exito");
            vacationForm.reset();
            container.querySelector("#vacation-start").min = localDate();
            container.querySelector("#vacation-end").min = localDate();
            await refreshAdminManagement(container);
        } catch (error) {
            feedback.innerHTML = showMessage(error.message);
        } finally {
            button.disabled = false;
        }
    });

    container.querySelector("#admin-accounts-list").addEventListener("click", async (event) => {
        const button = event.target.closest("[data-account-toggle]");
        if (!button) return;
        button.disabled = true;
        const feedback = container.querySelector("#admin-management-message");
        feedback.innerHTML = "";
        try {
            const result = await api.actualizarEstadoAdministrador(
                Number(button.dataset.accountToggle), button.dataset.active !== "true"
            );
            feedback.innerHTML = showMessage(result.mensaje, "exito");
            await refreshAdminManagement(container);
        } catch (error) {
            feedback.innerHTML = showMessage(error.message);
            button.disabled = false;
        }
    });

    container.querySelector("#admin-absences-list").addEventListener("click", async (event) => {
        const button = event.target.closest("[data-cancel-absence]");
        if (!button) return;
        button.disabled = true;
        const feedback = container.querySelector("#admin-availability-message");
        feedback.innerHTML = "";
        try {
            const result = await api.cancelarVacaciones(Number(button.dataset.cancelAbsence));
            feedback.innerHTML = showMessage(result.mensaje, "exito");
            await refreshAdminManagement(container);
        } catch (error) {
            feedback.innerHTML = showMessage(error.message);
            button.disabled = false;
        }
    });

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
            await refreshAdminManagement(container);
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

    const currentAdminId = Number(api.getUser()?.id);
    const activeSeniorCount = admins.filter((admin) =>
        admin.rol === "senior" && admin.activo && admin.misma_oficina
    ).length;

    target.innerHTML = '<div class="admin-account-list">' + admins.map((admin) => {
        const isActiveSenior = admin.rol === "senior" && admin.activo;
        let actionMessage = "";
        if (!admin.misma_oficina) {
            actionMessage = "No puedes administrar cuentas de otra oficina.";
        } else if (isActiveSenior && Number(admin.id) === currentAdminId) {
            actionMessage = "No tienes permiso para desactivar tu propia cuenta Senior.";
        } else if (isActiveSenior && activeSeniorCount <= 1) {
            actionMessage = "No se puede desactivar al unico Senior activo de esta oficina.";
        }

        const disabled = actionMessage ? "disabled" : "";
        const title = actionMessage ? ' title="' + escapeHtml(actionMessage) + '"' : "";
        return '<article class="admin-account-item">' +
            '<div class="admin-account-person"><strong>' + escapeHtml(admin.nombre_completo || admin.usuario) +
                '</strong><span>' + escapeHtml(admin.correo || "Sin correo registrado") + '</span></div>' +
            '<div class="admin-account-details">' +
                '<span class="admin-role-badge ' + (admin.rol === "senior" ? "is-senior" : "is-junior") + '">' +
                    (admin.rol === "senior" ? "Administrador Senior" : "Administrador Junior") + '</span>' +
                '<span class="admin-account-center">' + escapeHtml(admin.centro_atencion || "Sin centro asignado") + '</span>' +
                '<span class="admin-account-scope">' + (admin.alcance === "provincia" ? "Acceso a toda la provincia" : "Acceso a este centro") + '</span>' +
                '<span class="admin-account-scope">' + Number(admin.carga_abierta || 0) + ' solicitudes abiertas</span>' +
                '<span class="admin-availability-badge ' + (admin.activo ? admin.en_vacaciones ? "is-away" : "is-active" : "is-inactive") + '">' +
                    (!admin.activo ? "Cuenta inactiva" : admin.en_vacaciones ? "De vacaciones" : "Disponible") + '</span>' +
                '<button type="button" class="boton-secundario" data-account-toggle="' + Number(admin.id) +
                    '" data-active="' + Boolean(admin.activo) + '" ' + disabled + title + '>' +
                    (admin.activo ? "Inactivar cuenta" : "Activar cuenta") + '</button>' +
                (actionMessage ? '<span class="admin-account-action-note">' + escapeHtml(actionMessage) + '</span>' : "") +
            '</div></article>';
    }).join("") + '</div>';
}

function fillReviewerSelect(select, admins) {
    const eligibleAccounts = admins.filter((admin) => admin.activo && admin.misma_oficina);
    select.replaceChildren(new Option(eligibleAccounts.length ? "Seleccione un revisor" : "No hay revisores activos", ""));
    for (const admin of eligibleAccounts) {
        const role = admin.rol === "senior" ? "Senior" : "Junior";
        const label = `${admin.nombre_completo || admin.usuario} · ${role} · ${Number(admin.carga_abierta || 0)} abiertas`;
        select.append(new Option(label, String(admin.id)));
    }
    select.disabled = eligibleAccounts.length === 0;
}

function renderAbsences(target, absences) {
    if (!absences.length) {
        target.innerHTML = "<p>No hay vacaciones programadas.</p>";
        return;
    }
    const today = localDate();
    target.innerHTML = `<div class="admin-account-list">${absences.map((absence) => {
        const status = absence.estado === "cancelada" ? "Cancelada"
            : absence.fecha_inicio > today ? "Programada"
            : absence.fecha_fin >= today ? "En curso" : "Finalizada";
        const canCancel = absence.estado === "programada" && absence.fecha_fin >= today;
        return `<article class="admin-account-item vacation-item"><div class="admin-account-person"><strong>${escapeHtml(absence.administrador)}</strong><span>${absence.rol === "senior" ? "Administrador Senior" : "Administrador Junior"}${absence.motivo ? ` · ${escapeHtml(absence.motivo)}` : ""}</span></div><div class="admin-account-details"><span class="admin-account-scope">${escapeHtml(absence.fecha_inicio)} a ${escapeHtml(absence.fecha_fin)}</span><span class="admin-availability-badge ${status === "En curso" ? "is-away" : status === "Cancelada" ? "is-inactive" : "is-active"}">${status}</span>${canCancel ? `<button type="button" class="boton-secundario" data-cancel-absence="${Number(absence.id)}">Cancelar vacaciones</button>` : ""}</div></article>`;
    }).join("")}</div>`;
}

async function refreshAdminManagement(container) {
    const [admins, absences] = await Promise.all([api.listarAdministradores(), api.listarAusencias()]);
    renderAdmins(container.querySelector("#admin-accounts-list"), admins);
    fillReviewerSelect(container.querySelector("#vacation-reviewer"), admins);
    renderAbsences(container.querySelector("#admin-absences-list"), absences);
}

function localDate() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60_000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}
