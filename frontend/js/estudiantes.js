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
                <td>${escapeHtml(student.centro_educativo || student.universidad || "Sin centro educativo")}</td>
                <td>${escapeHtml(student.correo || "-")}</td>
            </tr>`).join("");
        content.innerHTML = rows
            ? `<table id="tabla-estudiantes"><thead><tr><th>Cédula</th><th>Nombre</th><th>Universidad</th><th>Correo</th></tr></thead><tbody>${rows}</tbody></table><p class="sin-resultados" id="sin-resultados" hidden>No se encontraron estudiantes que coincidan con la búsqueda.</p>`
            : "<p class=\"sin-resultados\">No hay estudiantes registrados.</p>";
        const search = document.querySelector("#buscador-estudiantes");
        search.addEventListener("input", () => {
            const term = search.value.trim().toLowerCase();
            const tableRows = document.querySelectorAll("#tabla-estudiantes tbody tr");
            let visibleRows = 0;
            tableRows.forEach((row) => {
                const matches = row.textContent.toLowerCase().includes(term);
                row.hidden = !matches;
                if (matches) visibleRows += 1;
            });
            document.querySelector("#sin-resultados").hidden = visibleRows !== 0;
        });
    } catch (error) {
        content.innerHTML = showMessage(error.message);
    }
}
