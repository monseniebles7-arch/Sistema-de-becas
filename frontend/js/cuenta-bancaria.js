import { api } from "./api.js";
import { escapeHtml, showMessage } from "./ui.js";
import { bancosPanama } from "./bancos-panama.js";

const certificationStatus = {
    faltante: "Falta cargar la certificación",
    pendiente_revision: "Pendiente de revisión del Senior",
    verificada: "Certificación verificada",
    rechazada: "Certificación rechazada"
};

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function accountForm(account = null) {
    const oldBank = account?.banco && !bancosPanama.includes(account.banco)
        ? `<option value="${escapeHtml(account.banco)}" selected>${escapeHtml(account.banco)} (registrado)</option>` : "";
    const bankOptions = bancosPanama.map((bank) =>
        `<option value="${escapeHtml(bank)}" ${account?.banco === bank ? "selected" : ""}>${escapeHtml(bank)}</option>`
    ).join("");
    return `<form id="bank-account-form" class="bank-account-form tarjeta-formulario">
        <h3>Datos de la cuenta bancaria</h3>
        <p>Selecciona el banco donde tienes tu cuenta. La lista incluye bancos oficiales y entidades con licencia general en Panamá.</p>
        <label>Banco<select name="banco" required><option value="">Selecciona tu banco</option>${oldBank}${bankOptions}</select></label>
        <label>Tipo de cuenta<select name="tipo_cuenta" required><option value="">Selecciona el tipo</option><option value="ahorro" ${account?.tipo_cuenta === "ahorro" ? "selected" : ""}>Ahorro</option><option value="corriente" ${account?.tipo_cuenta === "corriente" ? "selected" : ""}>Corriente</option><option value="otro" ${account?.tipo_cuenta === "otro" ? "selected" : ""}>Otro</option></select></label>
        <label>Número de cuenta<input name="numero_cuenta" maxlength="50" autocomplete="off" value="" placeholder="Vuelve a escribir el número de cuenta" required></label>
        <label>Nombre del titular como aparece en el banco<input name="titular" maxlength="150" autocomplete="name" value="${escapeHtml(account?.titular || "")}" required></label>
        <label class="bank-certification-upload">Certificación bancaria original (PDF)<input name="certificacion" type="file" accept="application/pdf,.pdf" required><small>PDF original, máximo 10 MB. Debe demostrar que eres el único titular.</small></label>
        <label class="bank-sole-owner"><input name="titular_unico_confirmado" type="checkbox" required><span>Declaro que soy el único titular de esta cuenta bancaria.</span></label>
        <div class="bank-account-actions"><button class="boton-primario" type="submit">Guardar cuenta y certificación</button><button class="boton-secundario" type="button" data-cancel-edit>Cancelar</button></div>
    </form>`;
}

export async function renderStudentBankAccount(container) {
    container.innerHTML = `<section class="bank-account-page"><div id="bank-account-message" aria-live="polite"></div><div id="bank-account-content">Cargando los datos de tu cuenta...</div></section>`;
    const message = (text, type = "") => {
        const target = container.querySelector("#bank-account-message");
        target.innerHTML = text ? showMessage(text, type) : "";
        if (text) target.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    const explainSaveError = (error) => {
        if (error.status === 404 || error.status === 405) {
            return "El backend activo no reconoce la ruta para guardar la certificación. Reinicia Flask desde el repositorio actualizado del backend.";
        }
        if (error.status === 500) {
            return "El servidor falló al guardar. Revisa la consola de Flask; si indica columnas inexistentes de certificación, ejecuta la migración 20261027_student_bank_certification.sql en Supabase.";
        }
        return error.message;
    };
    let account = null;
    let editing = false;

    const load = async () => {
        account = await api.cuentaBancariaEstudiante();
        const content = container.querySelector("#bank-account-content");
        const formVisible = !account || editing;
        content.innerHTML = `${account ? `<article class="bank-account-summary tarjeta-formulario">
            <div class="bank-account-summary-heading"><div><span class="panel-eyebrow">PAGOS Y TITULARIDAD</span><h2>Mi cuenta bancaria</h2></div><span class="bank-certification-status" data-status="${escapeHtml(account.certificacion_estado || "faltante")}">${escapeHtml(certificationStatus[account.certificacion_estado] || "Certificación pendiente")}</span></div>
            <dl><div><dt>Banco</dt><dd>${escapeHtml(account.banco)}</dd></div><div><dt>Tipo</dt><dd>${escapeHtml(account.tipo_cuenta)}</dd></div><div><dt>Número</dt><dd>${escapeHtml(account.numero_mascara)}</dd></div><div><dt>Titular</dt><dd>${escapeHtml(account.titular)}</dd></div><div><dt>Certificación</dt><dd>${account.certificacion_disponible ? escapeHtml(account.certificacion_nombre_archivo || "PDF cargado") : "No hay un archivo cargado"}</dd></div></dl>
            <p class="bank-account-explanation">El Senior revisará la certificación antes de que se puedan programar pagos simulados.</p>
            ${account.certificacion_observacion ? `<p class="bank-account-review-note"><strong>Observación:</strong> ${escapeHtml(account.certificacion_observacion)}</p>` : ""}
            <div class="bank-account-actions">${account.certificacion_disponible ? `<button class="boton-secundario" type="button" data-download-certification>Descargar certificación</button><button class="boton-secundario" type="button" data-remove-certification>Quitar archivo</button>` : ""}<button class="boton-primario" type="button" data-edit-account>Actualizar cuenta y certificación</button></div>
        </article>` : `<div class="student-welcome"><h2>Registra una cuenta bancaria</h2><p>La cuenta debe estar a tu nombre y el PDF debe ser una certificación bancaria original que demuestre titularidad única.</p></div>`}${formVisible ? accountForm(account) : ""}`;
        const form = content.querySelector("#bank-account-form");
        form?.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (!form.reportValidity()) return;
            const file = form.elements.certificacion.files[0];
            if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
                message("Selecciona la certificación bancaria en formato PDF.");
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                message("El archivo supera el límite de 10 MB.");
                return;
            }
            const submit = form.querySelector('[type="submit"]');
            submit.disabled = true;
            const data = new FormData(form);
            data.set("titular_unico_confirmado", form.elements.titular_unico_confirmado.checked ? "true" : "false");
            try {
                await api.guardarCuentaConCertificacion(data);
                editing = false;
                message("Cuenta y certificación guardadas. Quedaron pendientes de revisión del administrador Senior.", "exito");
                try { await load(); }
                catch { message("La cuenta sí se guardó, pero no se pudo refrescar la vista. Recarga la página para confirmar."); }
            } catch (error) {
                message(explainSaveError(error));
                submit.disabled = false;
            }
        });
        content.querySelector("[data-cancel-edit]")?.addEventListener("click", () => {
            editing = false;
            load().catch((error) => message(error.message));
        });
        content.querySelector("[data-edit-account]")?.addEventListener("click", () => {
            editing = true;
            load().catch((error) => message(error.message));
        });
        content.querySelector("[data-download-certification]")?.addEventListener("click", async (event) => {
            const button = event.currentTarget;
            button.disabled = true;
            try {
                const blob = await api.descargarCertificacionEstudiante();
                downloadBlob(blob, account.certificacion_nombre_archivo || "certificacion_bancaria.pdf");
            } catch (error) { message(error.message); }
            finally { button.disabled = false; }
        });
        content.querySelector("[data-remove-certification]")?.addEventListener("click", async (event) => {
            if (!window.confirm("¿Quieres quitar la certificación bancaria? Para programar pagos tendrás que volver a cargarla y esperar la revisión.")) return;
            event.currentTarget.disabled = true;
            try {
                await api.eliminarCertificacionBancaria();
                message("Certificación eliminada. Debes cargar otra para volver a habilitar pagos.", "exito");
                await load();
            } catch (error) { message(error.message); event.currentTarget.disabled = false; }
        });
    };

    try { await load(); }
    catch (error) { message(error.message); container.querySelector("#bank-account-content").innerHTML = ""; }
}
