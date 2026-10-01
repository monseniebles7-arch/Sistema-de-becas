import { api } from "./api.js";
import { escapeHtml, showMessage } from "./ui.js";

const labels = { borrador: "Borrador incompleto", en_revision: "En revisión", aprobada: "Aprobada", rechazada: "Rechazada", requiere_cambios: "Requiere cambios" };

export async function renderStudentPortal(container, adminView = false) {
    const target = adminView ? container.querySelector("#admin-applications") : container;
    try {
        const rows = adminView ? await api.listarSolicitudesAdmin() : await api.misSolicitudes();
        if (!rows.length) {
            target.innerHTML = adminView ? "<p>No hay solicitudes registradas.</p>" : `
                <div class="student-welcome"><div><p class="student-kicker">Portal estudiantil</p><h2>¡Hola, ${escapeHtml(api.getUser()?.nombre || "estudiante")}!</h2><p>Aún no has presentado una solicitud. Puedes elegir el programa que mejor se ajuste a tu situación.</p></div><div class="student-summary-number">0<span>solicitudes</span></div></div>
                <section class="student-applications"><div class="student-section-heading"><div><p class="student-kicker">Mi historial</p><h2>Becas a las que he optado</h2></div></div><div class="student-empty"><div class="empty-icon">＋</div><h3>Comienza tu solicitud</h3><p>Solo puedes mantener una solicitud activa a la vez.</p><a class="boton-primario" href="#solicitar">Solicitar beca</a></div></section>`;
            return;
        }
        if (!adminView) {
            const latest = rows[0];
            const link = document.querySelector('a[href="#solicitar"]');
            if (link) {
                const canApply = ["rechazada", "borrador"].includes(latest.estado);
                link.classList.toggle("is-disabled", !canApply);
                link.setAttribute("aria-disabled", String(!canApply));
                link.title = canApply ? "Presentar solicitud" : "Podrás solicitar otra beca si rechazan la solicitud actual.";
            }
        }
        const activeCount = rows.filter((row) => ["borrador", "en_revision", "requiere_cambios", "aprobada"].includes(row.estado)).length;
        const name = api.getUser()?.nombre || "estudiante";
        target.innerHTML = adminView ? rows.map(renderAdminCard).join("") : `
            <section class="student-welcome"><div><p class="student-kicker">Portal estudiantil</p><h2>¡Hola, ${escapeHtml(name)}!</h2><p>${activeCount ? "Tienes una solicitud activa. Aquí puedes consultar su avance." : "Tu historial de solicitudes de beca está aquí."}</p></div><div class="student-summary-number">${activeCount}<span>${activeCount === 1 ? "activa" : "activas"}</span></div></section>
            <section class="student-applications"><div class="student-section-heading"><div><p class="student-kicker">Tu historial</p><h2>Becas a las que has optado</h2><p>Solo puedes tener una solicitud activa a la vez. Si es rechazada, podrás optar nuevamente.</p></div>${rows[0].estado === "rechazada" ? '<a class="boton-primario" href="#solicitar">Solicitar otra beca</a>' : ""}</div>
                <div class="student-scholarship-grid">${rows.map(renderStudentCard).join("")}</div></section>`;
    } catch (error) {
        target.innerHTML = showMessage(error.message);
    }
}

function labelProgram(value) {
    const names = {
        concurso_general: "Concurso General de Becas",
        concurso_primaria: "Concurso General — Primaria",
        concurso_premedia_media: "Concurso General — Premedia y Media",
        concurso_primer_ingreso: "Concurso General — Universidad, primer ingreso",
        concurso_continuacion: "Concurso General — Universidad, continuación",
        concurso_postgrado: "Concurso General — Postgrado / Maestría",
        puesto_distinguido: "Puesto distinguido",
        exoneracion: "Exoneración para centros particulares",
        deporte: "Beca deportiva",
        bellas_artes: "Beca de bellas artes",
        cultura: "Beca del área cultural",
        pase_u: "PASE-U",
        socioeconomico: "Asistencia socioeconómica",
        discapacidad: "Apoyo por discapacidad",
        vulnerabilidad: "Asistencia por vulnerabilidad / pobreza",
        corregimiento: "Asistencia por corregimiento",
        trabajo_infantil: "Erradicación del trabajo infantil",
        internacional: "Beca internacional",
        servidores_publicos: "Perfeccionamiento profesional para servidores públicos",
        otro: "Otro programa",
    };
    return names[value] || value.replaceAll("_", " ");
}

function renderStudentCard(row) {
    const detailsId = `application-details-${Number(row.id)}`;
    const details = `<div class="student-card-details" id="${detailsId}" hidden><p><strong>Fecha:</strong> ${escapeHtml(row.fecha_solicitud || "Sin fecha")}</p><p><strong>Documentos adjuntos:</strong> ${Number(row.documentos?.length || 0)}</p>${row.observaciones_admin ? `<p><strong>Observación:</strong> ${escapeHtml(row.observaciones_admin)}</p>` : "<p>No hay observaciones del administrador.</p>"}${row.estado === "borrador" ? '<a class="boton-secundario" href="#solicitar">Continuar solicitud</a>' : ""}</div>`;
    return `<article class="student-scholarship-card"><div class="scholarship-illustration" aria-hidden="true"><span>IFARHU</span><b>${escapeHtml(labelProgram(row.programa_solicitado).slice(0, 1))}</b></div><div class="student-card-body"><h3>${escapeHtml(labelProgram(row.programa_solicitado))}</h3><span class="application-status status-${escapeHtml(row.estado)}">${labels[row.estado] || escapeHtml(row.estado)}</span><div class="student-card-actions"><span class="status-indicator"><i></i> Estado</span><button type="button" class="boton-info" aria-expanded="false" aria-controls="${detailsId}" data-info-toggle="${detailsId}">Información</button></div>${details}</div></article>`;
}

export async function renderStudentProfile(container) {
    try {
        const student = await api.perfilEstudiante();
        const fields = [
            ["Nombre completo", `${student.nombre || ""} ${student.apellido || ""}`.trim()],
            ["Cédula", student.cedula], ["Correo", student.correo], ["Teléfono", student.telefono],
            ["Fecha de nacimiento", student.fecha_nacimiento], ["Sexo", student.sexo],
            ["Centro educativo", student.centro_educativo || student.universidad],
            ["Nivel educativo", student.nivel_educativo], ["Carrera", student.carrera],
        ];
        container.innerHTML = `<section class="student-welcome"><div><p class="student-kicker">Datos personales</p><h2>Mi perfil</h2><p>Información asociada a tu cuenta estudiantil.</p></div></section><div class="student-profile-grid">${fields.map(([label, value]) => `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || "No registrado")}</strong></article>`).join("")}</div>`;
    } catch (error) { container.innerHTML = showMessage(error.message); }
}

function renderAdminCard(row) {
    const student = row.estudiante || {};
    return `<article class="application-card" data-app="${Number(row.id)}"><div><h3>Solicitud #${Number(row.id)} · ${escapeHtml(labelProgram(row.programa_solicitado))}</h3>
        <p><strong>${escapeHtml(student.nombre || "")} ${escapeHtml(student.apellido || "")}</strong> · ${escapeHtml(student.cedula || "")}</p>
        <p>${escapeHtml(student.correo || "")} · Presentada: ${escapeHtml(row.fecha_solicitud || "")}</p>
        <p>Documentos: ${(row.documentos || []).map((doc) => escapeHtml(doc.tipo_documento)).join(", ") || "ninguno"}</p>
        <label>Estado <select class="application-state"><option value="en_revision" ${row.estado === "en_revision" ? "selected" : ""}>En revisión</option><option value="requiere_cambios" ${row.estado === "requiere_cambios" ? "selected" : ""}>Requiere cambios</option><option value="aprobada" ${row.estado === "aprobada" ? "selected" : ""}>Aprobada</option><option value="rechazada" ${row.estado === "rechazada" ? "selected" : ""}>Rechazada</option></select></label>
        <label>Observaciones <textarea class="application-notes" rows="2">${escapeHtml(row.observaciones_admin || "")}</textarea></label>
        <button type="button" class="boton-primario save-application">Guardar revisión</button><span class="application-feedback" aria-live="polite"></span></div></article>`;
}

document.addEventListener("click", async (event) => {
    const infoButton = event.target.closest("[data-info-toggle]");
    if (infoButton) {
        const details = document.getElementById(infoButton.dataset.infoToggle);
        const expanded = infoButton.getAttribute("aria-expanded") === "true";
        infoButton.setAttribute("aria-expanded", String(!expanded));
        details.hidden = expanded;
        infoButton.textContent = expanded ? "Información" : "Ocultar información";
        return;
    }
    const button = event.target.closest(".save-application");
    if (!button) return;
    const card = button.closest("[data-app]");
    const feedback = card.querySelector(".application-feedback");
    button.disabled = true;
    try {
        await api.actualizarSolicitud(Number(card.dataset.app), card.querySelector(".application-state").value,
            card.querySelector(".application-notes").value);
        feedback.innerHTML = showMessage("Revisión guardada.", "exito");
    } catch (error) { feedback.innerHTML = showMessage(error.message); }
    finally { button.disabled = false; }
});
