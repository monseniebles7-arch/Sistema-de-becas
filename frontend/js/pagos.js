import { api } from "./api.js";
import { escapeHtml, showMessage } from "./ui.js";

const stateLabel = { pendiente: "Pendiente", pagado_simulado: "Pago simulado exitoso", fallido_simulado: "Simulación fallida", cancelado: "Cancelado", pagado: "Pagado (registro anterior)" };
const certificationLabel = { faltante: "Falta certificación", pendiente_revision: "Certificación pendiente de revisión", verificada: "Titularidad verificada", rechazada: "Certificación rechazada" };

function renderTimeline(payment) {
    if (!payment.historial?.length) return "";
    return `<details class="payment-timeline"><summary>Ver trazabilidad (${payment.historial.length})</summary><ol>${payment.historial.map((event) => `<li>${escapeHtml(event.fecha_evento || "")} - ${escapeHtml(event.estado_anterior || "Inicio")} - ${escapeHtml(event.estado_nuevo)}${event.nota ? ` - ${escapeHtml(event.nota)}` : ""}</li>`).join("")}</ol></details>`;
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || "certificacion_bancaria.pdf";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function renderPayments(container) {
    container._paymentEventsAbort?.abort();
    const eventController = new AbortController();
    container._paymentEventsAbort = eventController;
    container.innerHTML = '<section class="payments-page"><h2>Pagos simulados</h2><p class="payments-notice">Simulación académica: no se transfieren fondos ni se contacta a un banco.</p><div id="payments-feedback" aria-live="polite"></div><h3>Becas activas</h3><div id="payment-scholarships">Cargando...</div><h3>Registro de pagos</h3><div id="payment-history">Cargando...</div></section>';
    const load = async () => {
        const data = await api.pagosGestion();
        const scholarships = container.querySelector("#payment-scholarships");
        scholarships.innerHTML = data.becas_activas.length ? data.becas_activas.map((row) => {
            const student = row.estudiante;
            const account = row.cuenta_bancaria;
            const certificationState = account?.certificacion_estado || "faltante";
            const paymentForm = account?.certificacion_estado === "verificada" && account.titular_unico_confirmado
                ? `<form class="payment-create" data-scholarship="${Number(row.beca.id)}"><label>Monto<input name="monto" type="number" min="0.01" step="0.01" required></label><label>Fecha programada<input name="fecha_pago" type="date" required></label><label>Periodo (opcional)<input name="periodo" maxlength="40" placeholder="Ej. Octubre 2026"></label><button class="boton-primario">Programar pago</button></form>`
                : `<p class="bank-review-message">${account ? "Para programar pagos, el estudiante debe cargar la certificación y un Senior debe verificar que es el único titular." : "El estudiante todavía no registra una cuenta bancaria."}</p>`;
            const reviewActions = account?.certificacion_estado === "pendiente_revision" && account.certificacion_disponible
                ? `<div class="bank-certification-actions"><button class="boton-primario" type="button" data-bank-review="verificada" data-student-id="${Number(student.id)}">Verificar titularidad única</button><button class="boton-secundario" type="button" data-bank-review="rechazada" data-student-id="${Number(student.id)}">Rechazar certificación</button></div>` : "";
            return `<article class="payment-card"><div><h4>${escapeHtml(student.nombre)} ${escapeHtml(student.apellido)}</h4><p>${escapeHtml(student.cedula)} | ${escapeHtml(row.beca.tipo_beca)}</p><p>${account ? `${escapeHtml(account.banco)} | ${escapeHtml(account.tipo_cuenta)} | ${escapeHtml(account.numero_mascara)}<br>Titular: ${escapeHtml(account.titular)}` : "Sin cuenta bancaria activa"}</p>${account ? `<p><strong>Certificación:</strong> ${escapeHtml(certificationLabel[certificationState] || certificationState)}${account.certificacion_nombre_archivo ? ` · ${escapeHtml(account.certificacion_nombre_archivo)}` : ""}</p>${account.certificacion_disponible ? `<button class="boton-secundario" type="button" data-bank-certification="${Number(student.id)}">Descargar certificación PDF</button>` : ""}${account.certificacion_observacion ? `<p class="bank-review-message">Observación al estudiante: ${escapeHtml(account.certificacion_observacion)}</p>` : ""}${reviewActions}` : ""}</div>${paymentForm}</article>`;
        }).join("") : '<p>No hay becas activas en tu alcance.</p>';
        const payments = container.querySelector("#payment-history");
        payments.innerHTML = data.pagos.length ? `<div class="payment-list">${data.pagos.map((payment) => `<article class="payment-card"><div><h4>${escapeHtml(payment.estudiante?.nombre || "Estudiante")} ${escapeHtml(payment.estudiante?.apellido || "")}</h4><p>${escapeHtml(payment.tipo_beca || "Beca")} | ${escapeHtml(payment.periodo || "Sin periodo")} | $${escapeHtml(payment.monto)}</p><p>Fecha: ${escapeHtml(payment.fecha_pago)} | Cuenta: ${escapeHtml(payment.cuenta_bancaria?.numero_mascara || "Cuenta anterior")}</p><strong>${escapeHtml(stateLabel[payment.estado] || payment.estado)}</strong>${payment.referencia_simulacion ? `<p>Referencia: ${escapeHtml(payment.referencia_simulacion)}</p>` : ""}${renderTimeline(payment)}</div>${payment.estado === "pendiente" ? `<div class="payment-actions"><button class="boton-primario" data-simulate="${payment.id}" data-result="exitoso">Simular pago exitoso</button><button class="boton-secundario" data-simulate="${payment.id}" data-result="fallido">Simular fallo</button><button class="boton-secundario" data-cancel="${payment.id}">Cancelar</button></div>` : ""}</article>`).join("")}</div>` : "<p>Aún no se han programado pagos.</p>";
    };
    try { await load(); } catch (error) { container.querySelector("#payments-feedback").innerHTML = showMessage(error.message); }
    container.addEventListener("submit", async (event) => {
        const form = event.target.closest(".payment-create");
        if (!form) return;
        event.preventDefault();
        const values = new FormData(form);
        const button = form.querySelector("button"); button.disabled = true;
        try {
            await api.crearPago({ beca_id: Number(form.dataset.scholarship), monto: values.get("monto"), fecha_pago: values.get("fecha_pago"), periodo: values.get("periodo") });
            container.querySelector("#payments-feedback").innerHTML = showMessage("Pago programado.", "exito");
            await load();
        } catch (error) { container.querySelector("#payments-feedback").innerHTML = showMessage(error.message); }
        finally { button.disabled = false; }
    }, { signal: eventController.signal });
    container.addEventListener("click", async (event) => {
        const cert = event.target.closest("[data-bank-certification]");
        const review = event.target.closest("[data-bank-review]");
        const simulate = event.target.closest("[data-simulate]");
        const cancel = event.target.closest("[data-cancel]");
        if (!cert && !review && !simulate && !cancel) return;
        const button = cert || review || simulate || cancel;
        button.disabled = true;
        try {
            if (cert) {
                const blob = await api.descargarCertificacionSenior(Number(cert.dataset.bankCertification));
                downloadBlob(blob, "certificacion_bancaria.pdf");
            } else if (review) {
                let observation = "";
                if (review.dataset.bankReview === "rechazada") {
                    observation = window.prompt("Indica al estudiante por qué se rechaza la certificación:", "") ?? null;
                    if (observation === null) { button.disabled = false; return; }
                }
                await api.revisarCertificacionBancaria(Number(review.dataset.studentId), review.dataset.bankReview, observation);
                container.querySelector("#payments-feedback").innerHTML = showMessage("Revisión de certificación guardada.", "exito");
                await load();
            } else if (simulate) {
                await api.simularPago(Number(simulate.dataset.simulate), simulate.dataset.result);
                container.querySelector("#payments-feedback").innerHTML = showMessage("Registro actualizado.", "exito");
                await load();
            } else {
                await api.cancelarPago(Number(cancel.dataset.cancel));
                container.querySelector("#payments-feedback").innerHTML = showMessage("Registro actualizado.", "exito");
                await load();
            }
        } catch (error) {
            container.querySelector("#payments-feedback").innerHTML = showMessage(error.message);
            button.disabled = false;
        }
    }, { signal: eventController.signal });
}
