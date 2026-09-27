import { api } from "./api.js";
import { showMessage } from "./ui.js";

export async function renderHome() {
    const content = document.querySelector("#home-content");
    try {
        const estudiantes = await api.listarEstudiantes();
        content.innerHTML = `
            <p>Conexión exitosa con la API.</p>
            <p>Estudiantes registrados: <strong>${estudiantes.length}</strong></p>`;
    } catch (error) {
        content.innerHTML = showMessage(error.message);
    }
}
