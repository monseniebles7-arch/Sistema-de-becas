import { api } from "./api.js";
import { escapeHtml, showMessage } from "./ui.js";

export async function renderStudents() {
    const content = document.querySelector("#students-content");
    try {
        const estudiantes = await api.listarEstudiantes();
        const rows = estudiantes.map((student) => `
            <tr>
                <td>${escapeHtml(student.cedula)}</td>
                <td>${escapeHtml(student.nombre)} ${escapeHtml(student.apellido)}</td>
                <td>${escapeHtml(student.universidad || "Sin universidad")}</td>
                <td>${escapeHtml(student.correo || "-")}</td>
            </tr>`).join("");
        content.innerHTML = rows
            ? `<table><thead><tr><th>Cédula</th><th>Nombre</th><th>Universidad</th><th>Correo</th></tr></thead><tbody>${rows}</tbody></table>`
            : "<p>No hay estudiantes registrados.</p>";
    } catch (error) {
        content.innerHTML = showMessage(error.message);
    }
}
