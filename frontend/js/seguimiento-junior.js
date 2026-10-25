import { api } from "./api.js";
import { escapeHtml, showMessage } from "./ui.js";

export async function renderJuniorWork(container) {
    container.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-reassign-junior]");
        if (!button) return;

        const card = button.closest("[data-work-id]");
        const select = card.querySelector("[data-reviewer-select]");
        const feedback = container.querySelector("#junior-work-message");
        const reviewerId = Number(select.value);
        if (!reviewerId) {
            feedback.innerHTML = showMessage("Selecciona un Junior disponible para recibir la solicitud.");
            return;
        }

        button.disabled = true;
        feedback.innerHTML = "";
        try {
            const result = await api.reasignarJunior(
                Number(card.dataset.workId),
                reviewerId,
                card.querySelector("[data-reassignment-reason]").value
            );
            await refreshJuniorWork(container, result.mensaje, "exito");
        } catch (error) {
            await refreshJuniorWork(container, error.message);
        }
    });

    await refreshJuniorWork(container);
}

async function refreshJuniorWork(container, message = "", messageType = "error") {
    const list = container.querySelector("#junior-work-list");
    const summary = container.querySelector("#junior-work-summary");
    const feedback = container.querySelector("#junior-work-message");
    if (feedback) feedback.innerHTML = message ? showMessage(message, messageType) : "";

    try {
        const rows = await api.listarTrabajoJunior();
        summary.textContent = rows.length === 1
            ? "1 solicitud est\u00e1 en revisi\u00f3n Junior."
            : rows.length + " solicitudes est\u00e1n en revisi\u00f3n Junior.";
        if (!rows.length) {
            list.innerHTML = '<div class="junior-work-empty"><h3>No hay solicitudes pendientes de revisi\u00f3n Junior</h3><p>Las nuevas solicitudes asignadas aparecer\u00e1n aqu\u00ed.</p></div>';
            return;
        }
        list.innerHTML = '<div class="junior-work-list">' + rows.map(renderTask).join("") + "</div>";
    } catch (error) {
        summary.textContent = "";
        list.innerHTML = showMessage(error.message);
    }
}

function renderTask(row) {
    const student = row.estudiante || {};
    const candidates = row.revisores_disponibles || [];
    const assigned = row.junior_asignado
        ? escapeHtml(row.junior_asignado.nombre_completo || row.junior_asignado.usuario)
        : "Sin Junior asignado";
    const candidateOptions = candidates.map((reviewer) =>
        '<option value="' + Number(reviewer.id) + '">' +
        escapeHtml(reviewer.nombre_completo || reviewer.usuario) +
        " &middot; " + Number(reviewer.carga_abierta || 0) + " solicitudes abiertas</option>"
    ).join("");
    const program = escapeHtml(String(row.programa_solicitado || "").replaceAll("_", " "));
    const eligibleMessage = candidates.length
        ? candidates.length + (candidates.length === 1 ? " Junior disponible" : " Juniors disponibles")
        : "No hay otro Junior activo y disponible para esta solicitud.";

    return '<article class="junior-work-card" data-work-id="' + Number(row.id) + '">' +
        '<div class="junior-work-details">' +
            '<p class="junior-work-kicker">Solicitud #' + Number(row.id) + '</p>' +
            '<h3>' + escapeHtml(student.nombre || "") + " " + escapeHtml(student.apellido || "") + '</h3>' +
            '<p><strong>C&#233;dula:</strong> ' + escapeHtml(student.cedula || "No registrada") + '</p>' +
            '<p><strong>Programa:</strong> ' + program + '</p>' +
            '<p><strong>Centro:</strong> ' + escapeHtml(student.centro_atencion || "Sin centro asignado") + '</p>' +
            '<p><strong>Presentada:</strong> ' + escapeHtml(row.fecha_solicitud || "Sin fecha") + '</p>' +
            '<p><strong>Junior asignado:</strong> ' + assigned + '</p>' +
        '</div>' +
        '<div class="junior-reassignment">' +
            '<label>Reasignar a<select data-reviewer-select ' + (candidates.length ? "required" : "disabled") + '>' +
                '<option value="">Seleccione un Junior disponible</option>' + candidateOptions +
            '</select></label>' +
            '<label>Motivo (opcional)<input type="text" maxlength="500" data-reassignment-reason placeholder="Ej. redistribuci&#243;n de carga"></label>' +
            '<p class="junior-work-eligibility">' + escapeHtml(eligibleMessage) + ' &middot; Los Juniors inactivos o de vacaciones no aparecen.</p>' +
            '<button type="button" class="boton-primario" data-reassign-junior ' + (candidates.length ? "" : "disabled") + '>Confirmar reasignaci&#243;n</button>' +
        '</div>' +
    '</article>';
}
