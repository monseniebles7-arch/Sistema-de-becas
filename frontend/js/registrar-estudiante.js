import { api } from "./api.js";
import { escapeHtml, showMessage } from "./ui.js";

export async function renderRegister() {
    const select = document.querySelector("#universidad_id");
    try {
        const universidades = await api.listarUniversidades();
        select.innerHTML = `<option value="">Seleccione una universidad</option>${universidades.map((university) => `<option value="${escapeHtml(university.id)}">${escapeHtml(university.nombre)}</option>`).join("")}`;
    } catch (error) {
        select.innerHTML = "<option value=\"\">No se pudieron cargar</option>";
        document.querySelector("#register-message").innerHTML = showMessage(error.message);
        return;
    }
    document.querySelector("#student-form").addEventListener("submit", handleRegister);
}

async function handleRegister(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const message = document.querySelector("#register-message");
    const button = form.querySelector("button");
    const data = Object.fromEntries(new FormData(form));
    data.universidad_id = Number(data.universidad_id);
    button.disabled = true;
    message.innerHTML = "";

    try {
        await api.registrarEstudiante(data);
        message.innerHTML = showMessage("Estudiante registrado correctamente.", "exito");
        form.reset();
    } catch (error) {
        message.innerHTML = showMessage(error.message);
    } finally {
        button.disabled = false;
    }
}
