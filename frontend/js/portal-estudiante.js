import { api } from "./api.js";
import { escapeHtml, showMessage } from "./ui.js";

const labels = { borrador: "Borrador incompleto", en_revision: "En revisión", pendiente_aprobacion: "Pendiente de aprobación Senior", aprobada: "Aprobada", rechazada: "Rechazada", requiere_cambios: "Requiere cambios" };
const provinceLabels = {
    bocas_del_toro: "Bocas del Toro", cocle: "Coclé", colon: "Colón", chiriqui: "Chiriquí",
    darien: "Darién", herrera: "Herrera", los_santos: "Los Santos", panama: "Panamá",
    panama_oeste: "Panamá Oeste", veraguas: "Veraguas", guna_yala: "Guna Yala",
    embera_wounaan: "Emberá-Wounaan", ngabe_bugle: "Ngäbe-Buglé",
};

export async function renderStudentPortal(container, adminView = false) {
    const target = adminView ? container.querySelector("#admin-applications") : container;
    try {
        const [rows, profile] = adminView
            ? [await api.listarSolicitudesAdmin(), null]
            : await Promise.all([api.misSolicitudes(), api.perfilEstudiante()]);
        const becaActiva = Boolean(profile?.beca_activa);
        if (!rows.length) {
            target.innerHTML = adminView ? "<p>No hay solicitudes registradas.</p>" : `
                <div class="student-welcome"><div><p class="student-kicker">Portal estudiantil</p><h2>¡Hola, ${escapeHtml(api.getUser()?.nombre || "estudiante")}!</h2><p>Aún no has presentado una solicitud. Puedes elegir el programa que mejor se ajuste a tu situación.</p></div><div class="student-summary-number">0<span>solicitudes</span></div></div>
                <section class="student-applications"><div class="student-section-heading"><div><p class="student-kicker">Mi historial</p><h2>Becas a las que he optado</h2></div></div><div class="student-empty"><div class="empty-icon">＋</div><h3>${becaActiva ? "Ya tienes una beca activa" : "Comienza tu solicitud"}</h3><p>${becaActiva ? "No puedes solicitar otra beca mientras esta siga activa." : "Solo puedes mantener una solicitud activa a la vez."}</p>${becaActiva ? "" : '<a class="boton-primario" href="#solicitar">Solicitar beca</a>'}</div></section>`;
            return;
        }
        if (!adminView) {
            const latest = rows[0];
            const link = document.querySelector('a[href="#solicitar"]');
            if (link) {
                const canApply = !becaActiva && ["rechazada", "borrador", "requiere_cambios"].includes(latest.estado);
                link.classList.toggle("is-disabled", !canApply);
                link.setAttribute("aria-disabled", String(!canApply));
                link.hidden = becaActiva;
                link.title = becaActiva ? "Ya tienes una beca activa." : canApply ? "Presentar solicitud" : "Podrás solicitar otra beca si rechazan la solicitud actual.";
            }
        }
        const activeCount = rows.filter((row) => ["borrador", "en_revision", "pendiente_aprobacion", "requiere_cambios", "aprobada"].includes(row.estado)).length;
        const name = api.getUser()?.nombre || "estudiante";
        target.innerHTML = adminView ? rows.map(renderAdminCard).join("") : `
            <section class="student-welcome"><div><p class="student-kicker">Portal estudiantil</p><h2>¡Hola, ${escapeHtml(name)}!</h2><p>${becaActiva ? "Tienes una beca activa." : activeCount ? "Tienes una solicitud activa. Aquí puedes consultar su avance." : "Tu historial de solicitudes de beca está aquí."}</p></div><div class="student-summary-number">${activeCount}<span>${activeCount === 1 ? "activa" : "activas"}</span></div></section>
            <section class="student-applications"><div class="student-section-heading"><div><p class="student-kicker">Tu historial</p><h2>Becas a las que has optado</h2><p>${becaActiva ? "No puedes solicitar otra beca mientras mantengas una activa." : "Solo puedes tener una solicitud activa a la vez. Si es rechazada, podrás optar nuevamente."}</p></div>${!becaActiva && rows[0].estado === "rechazada" ? '<a class="boton-primario" href="#solicitar">Solicitar otra beca</a>' : rows[0].estado === "requiere_cambios" ? '<a class="boton-primario" href="#solicitar">Corregir solicitud</a>' : ""}</div>
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
    const details = `<div class="student-card-details" id="${detailsId}" hidden><p><strong>Fecha:</strong> ${escapeHtml(row.fecha_solicitud || "Sin fecha")}</p><p><strong>Documentos adjuntos:</strong> ${Number(row.documentos?.length || 0)}</p>${row.observaciones_admin ? `<p><strong>Observación:</strong> ${escapeHtml(row.observaciones_admin)}</p>` : "<p>No hay observaciones del administrador.</p>"}${row.estado === "borrador" ? '<a class="boton-secundario" href="#solicitar">Continuar solicitud</a>' : row.estado === "requiere_cambios" ? '<a class="boton-secundario" href="#solicitar">Corregir solicitud</a>' : ""}</div>`;
    return `<article class="student-scholarship-card"><div class="scholarship-illustration" aria-hidden="true"><span>IFARHU</span><b>${escapeHtml(labelProgram(row.programa_solicitado).slice(0, 1))}</b></div><div class="student-card-body"><h3>${escapeHtml(labelProgram(row.programa_solicitado))}</h3><span class="application-status status-${escapeHtml(row.estado)}">${labels[row.estado] || escapeHtml(row.estado)}</span><div class="student-card-actions"><span class="status-indicator"><i></i> Estado</span><button type="button" class="boton-info" aria-expanded="false" aria-controls="${detailsId}" data-info-toggle="${detailsId}">Información</button></div>${details}</div></article>`;
}

export async function renderStudentProfile(container) {
    try {
        const student = await api.perfilEstudiante();
        const fields = [
            ["Nombre completo", `${student.nombre || ""} ${student.apellido || ""}`.trim()],
            ["Cédula", student.cedula], ["Correo", student.correo], ["Teléfono", student.telefono],
            ["Provincia de residencia", provinceLabels[student.provincia] || student.provincia],
            ["Centro IFARHU", student.centro_atencion],
            ["Fecha de nacimiento", student.fecha_nacimiento], ["Sexo", student.sexo],
            ["Centro educativo", student.centro_educativo || student.universidad],
            ["Nivel educativo", student.nivel_educativo], ["Carrera", student.carrera],
        ];
        container.innerHTML = `<section class="student-welcome"><div><p class="student-kicker">Datos personales</p><h2>Mi perfil</h2><p>Información asociada a tu cuenta estudiantil.</p></div></section><div class="student-profile-grid">${fields.map(([label, value]) => `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || "No registrado")}</strong></article>`).join("")}</div>`;
    } catch (error) { container.innerHTML = showMessage(error.message); }
}

function renderAdminCard(row) {
    const student = row.estudiante || {};
    const role = api.getRole();
    const currentAdminId = Number(api.getUser()?.id);
    const canReview = role === "admin_junior" && row.estado === "en_revision"
        && Number(row.junior_asignado_id) === currentAdminId;
    const canDecide = role === "admin_senior" && row.estado === "pendiente_aprobacion"
        && Number(row.senior_asignado_id) === currentAdminId;
    const documentList = (row.documentos || []).map((doc) => `<li><button type="button" class="boton-secundario open-application-document" data-document-id="${Number(doc.id)}">${escapeHtml(doc.tipo_documento)}</button>${canReview ? doc.estado === "verificado" ? '<span class="application-status">Verificado</span>' : `<button type="button" class="boton-info verify-application-document" data-document-id="${Number(doc.id)}">Marcar verificado</button>` : doc.estado === "verificado" ? '<span class="application-status">Verificado</span>' : ""}</li>`).join("");
    const controls = canReview ? `<label>Resultado de revisión <select class="application-state"><option value="en_revision">Mantener en revisión</option><option value="requiere_cambios">Devolver al estudiante para correcciones</option><option value="pendiente_aprobacion">Enviar al Admin Senior</option></select></label>
        <label>Observaciones <textarea class="application-notes" rows="2">${escapeHtml(row.observaciones_admin || "")}</textarea></label>
        <button type="button" class="boton-primario save-application">Guardar revisión</button>`
        : canDecide ? `<label>Decisión del Admin Senior <select class="application-state"><option value="">Seleccione una decisión</option><option value="aprobada">Aprobar beca</option><option value="rechazada">Rechazar solicitud</option></select></label>
        <label>Observaciones <textarea class="application-notes" rows="2">${escapeHtml(row.observaciones_admin || "")}</textarea></label>
        <button type="button" class="boton-primario save-application">Registrar decisión</button>`
        : `<p><strong>Estado:</strong> ${escapeHtml(labels[row.estado] || row.estado)}</p>`;
    return `<article class="application-card" data-app="${Number(row.id)}"><div><h3>Solicitud #${Number(row.id)} · ${escapeHtml(labelProgram(row.programa_solicitado))}</h3>
        <p><strong>${escapeHtml(student.nombre || "")} ${escapeHtml(student.apellido || "")}</strong> · ${escapeHtml(student.cedula || "")}</p>
        <p>${escapeHtml(student.correo || "")} · Presentada: ${escapeHtml(row.fecha_solicitud || "")}</p>
        ${row.estado === "en_revision" ? `<p><strong>Junior asignado:</strong> ${row.junior_asignado ? escapeHtml(row.junior_asignado.nombre_completo || row.junior_asignado.usuario) : "Sin revisor elegible; solicita apoyo a un Senior."}</p>` : ""}
        ${row.estado === "pendiente_aprobacion" ? `<p><strong>Senior asignado:</strong> ${row.senior_asignado ? escapeHtml(row.senior_asignado.nombre_completo || row.senior_asignado.usuario) : "Sin asignación disponible. Actualiza el backend y vuelve a cargar la página."}</p>` : ""}
        <p><strong>Centro:</strong> ${escapeHtml(student.centro_atencion || "Sin centro asignado")}</p>
        <div><strong>Documentos:</strong>${documentList ? `<ul class="application-document-list">${documentList}</ul>` : " ninguno"}</div>
        ${controls}<span class="application-feedback" aria-live="polite"></span></div></article>`;
}

document.addEventListener("click", async (event) => {
    const openDocument = event.target.closest(".open-application-document");
    if (openDocument) {
        openDocument.disabled = true;
        try { await api.abrirDocumento(Number(openDocument.dataset.documentId)); }
        catch (error) { openDocument.insertAdjacentHTML("afterend", showMessage(error.message)); }
        finally { openDocument.disabled = false; }
        return;
    }
    const verifyDocument = event.target.closest(".verify-application-document");
    if (verifyDocument) {
        verifyDocument.disabled = true;
        try {
            await api.verificarDocumento(Number(verifyDocument.dataset.documentId));
            verifyDocument.replaceWith(Object.assign(document.createElement("span"), { className: "application-status", textContent: "Verificado" }));
        } catch (error) {
            verifyDocument.insertAdjacentHTML("afterend", showMessage(error.message));
            verifyDocument.disabled = false;
        }
        return;
    }
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
    const nextState = card.querySelector(".application-state").value;
    if (!nextState) {
        feedback.innerHTML = showMessage("Seleccione el resultado de la revisión.");
        return;
    }
    button.disabled = true;
    try {
        const result = await api.actualizarSolicitud(Number(card.dataset.app), nextState,
            card.querySelector(".application-notes").value);
        const assignedSenior = result.senior_asignado?.nombre_completo || result.senior_asignado?.usuario;
        feedback.innerHTML = showMessage(nextState === "pendiente_aprobacion" ? `Solicitud enviada a ${assignedSenior || "un administrador Senior"}.` : nextState === "requiere_cambios" ? "Solicitud devuelta al estudiante para correcciones." : nextState === "aprobada" ? "Beca aprobada." : nextState === "rechazada" ? "Solicitud rechazada." : "Revisión guardada.", "exito");
        card.querySelectorAll("select, textarea, button").forEach((control) => { control.disabled = true; });
    } catch (error) { feedback.innerHTML = showMessage(error.message); }
    finally { button.disabled = false; }
});
