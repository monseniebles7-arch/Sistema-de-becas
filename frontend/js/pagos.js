import { api } from "./api.js";
import { escapeHtml, showMessage } from "./ui.js";

const stateLabel = { pendiente: "Pendiente", pagado_simulado: "Pago simulado exitoso", fallido_simulado: "Simulacion fallida", cancelado: "Cancelado", pagado: "Pagado (registro anterior)" };

function renderTimeline(payment) {
    if (!payment.historial?.length) return "";
    return `<details class="payment-timeline"><summary>Ver trazabilidad (${payment.historial.length})</summary><ol>${payment.historial.map((event) => `<li>${escapeHtml(event.fecha_evento || "")} - ${escapeHtml(event.estado_anterior || "Inicio")} - ${escapeHtml(event.estado_nuevo)}${event.nota ? ` - ${escapeHtml(event.nota)}` : ""}</li>`).join("")}</ol></details>`;
}

export async function renderPayments(container) {
    container._paymentEventsAbort?.abort();
    const eventController = new AbortController();
    container._paymentEventsAbort = eventController;
    container.innerHTML = '<section class="payments-page"><h2>Pagos simulados</h2><p class="payments-notice">Simulacion academica: no se transfieren fondos ni se contacta a un banco.</p><div id="payments-feedback" aria-live="polite"></div><h3>Becas activas</h3><div id="payment-scholarships">Cargando...</div><h3>Registro de pagos</h3><div id="payment-history">Cargando...</div></section>';
    const load = async () => {
        const data = await api.pagosGestion();
        const scholarships = container.querySelector("#payment-scholarships");
        scholarships.innerHTML = data.becas_activas.length ? data.becas_activas.map((row) => {
            const student = row.estudiante;
            const account = row.cuenta_bancaria;
            return `<article class="payment-card"><div><h4>${escapeHtml(student.nombre)} ${escapeHtml(student.apellido)}</h4><p>${escapeHtml(student.cedula)} | ${escapeHtml(row.beca.tipo_beca)}</p><p>${account ? `${escapeHtml(account.banco)} | ${escapeHtml(account.tipo_cuenta)} | ${escapeHtml(account.numero_mascara)}` : "Sin cuenta bancaria activa"}</p></div>${account ? `<form class="payment-create" data-scholarship="${Number(row.beca.id)}"><label>Monto<input name="monto" type="number" min="0.01" step="0.01" required></label><label>Fecha programada<input name="fecha_pago" type="date" required></label><label>Periodo (opcional)<input name="periodo" maxlength="40" placeholder="Ej. Octubre 2026"></label><button class="boton-primario">Programar pago</button></form>` : ""}</article>`;
        }).join("") : '<p>No hay becas activas en tu alcance.</p>';
        const payments = container.querySelector("#payment-history");
        payments.innerHTML = data.pagos.length ? `<div class="payment-list">${data.pagos.map((payment) => `<article class="payment-card"><div><h4>${escapeHtml(payment.estudiante?.nombre || "Estudiante")} ${escapeHtml(payment.estudiante?.apellido || "")}</h4><p>${escapeHtml(payment.tipo_beca || "Beca")} | ${escapeHtml(payment.periodo || "Sin periodo")} | $${escapeHtml(payment.monto)}</p><p>Fecha: ${escapeHtml(payment.fecha_pago)} | Cuenta: ${escapeHtml(payment.cuenta_bancaria?.numero_mascara || "Cuenta anterior")}</p><strong>${escapeHtml(stateLabel[payment.estado] || payment.estado)}</strong>${payment.referencia_simulacion ? `<p>Referencia: ${escapeHtml(payment.referencia_simulacion)}</p>` : ""}${renderTimeline(payment)}</div>${payment.estado === "pendiente" ? `<div class="payment-actions"><button class="boton-primario" data-simulate="${payment.id}" data-result="exitoso">Simular pago exitoso</button><button class="boton-secundario" data-simulate="${payment.id}" data-result="fallido">Simular fallo</button><button class="boton-secundario" data-cancel="${payment.id}">Cancelar</button></div>` : ""}</article>`).join("")}</div>` : "<p>Aun no se han programado pagos.</p>";
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
        const simulate = event.target.closest("[data-simulate]");
        const cancel = event.target.closest("[data-cancel]");
        if (!simulate && !cancel) return;
        const button = simulate || cancel; button.disabled = true;
        try {
            if (simulate) await api.simularPago(Number(simulate.dataset.simulate), simulate.dataset.result);
            else await api.cancelarPago(Number(cancel.dataset.cancel));
            container.querySelector("#payments-feedback").innerHTML = showMessage("Registro actualizado.", "exito");
            await load();
        } catch (error) { container.querySelector("#payments-feedback").innerHTML = showMessage(error.message); button.disabled = false; }
    }, { signal: eventController.signal });
}
