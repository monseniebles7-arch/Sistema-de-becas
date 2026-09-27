import { api } from "./api.js";
import { escapeHtml, showMessage } from "./ui.js";

let centrosEducativos = [];

export async function renderRegister() {
    const busqueda = document.querySelector("#universidad_busqueda");
    const lista = document.querySelector("#lista-sugerencias");
    try {
        centrosEducativos = await api.listarUniversidades();
    } catch (error) {
        busqueda.placeholder = "No se pudieron cargar los centros";
        document.querySelector("#register-message").innerHTML = showMessage(error.message);
        return;
    }

    busqueda.addEventListener("input", () => mostrarSugerencias(busqueda.value));
    busqueda.addEventListener("blur", () => {
        setTimeout(() => { lista.innerHTML = ""; }, 150);
    });

    document.querySelector("#student-form").addEventListener("submit", handleRegister);
}

function mostrarSugerencias(texto) {
    const lista = document.querySelector("#lista-sugerencias");
    document.querySelector("#universidad_id").value = "";

    const termino = texto.trim().toLocaleLowerCase();
    if (termino.length === 0) {
        lista.innerHTML = "";
        return;
    }

    const coincidencias = centrosEducativos.filter((centro) =>
        centro.nombre.toLocaleLowerCase().includes(termino)
    );

    if (coincidencias.length === 0) {
        lista.innerHTML = "<li class=\"sugerencia-vacia\">Sin coincidencias</li>";
        return;
    }

    lista.innerHTML = coincidencias.map((centro) =>
        `<li class="sugerencia-item" data-id="${escapeHtml(centro.id)}" data-nombre="${escapeHtml(centro.nombre)}">${escapeHtml(centro.nombre)}</li>`
    ).join("");

    lista.querySelectorAll(".sugerencia-item").forEach((item) => {
        item.addEventListener("mousedown", () => seleccionarCentro(item.dataset.id, item.dataset.nombre));
    });
}

function seleccionarCentro(id, nombre) {
    document.querySelector("#universidad_busqueda").value = nombre;
    document.querySelector("#universidad_id").value = id;
    document.querySelector("#lista-sugerencias").innerHTML = "";
}

async function handleRegister(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const message = document.querySelector("#register-message");
    const button = form.querySelector("button");
    const universidadId = document.querySelector("#universidad_id").value;

    if (!universidadId) {
        message.innerHTML = showMessage("Seleccione un centro educativo de la lista de sugerencias.");
        return;
    }

    const data = Object.fromEntries(new FormData(form));
    delete data.universidad_busqueda;
    data.universidad_id = Number(universidadId);
    button.disabled = true;
    message.innerHTML = "";

    try {
        await api.registrarEstudiante(data);
        message.innerHTML = showMessage("Estudiante registrado correctamente.", "exito");
        form.reset();
        document.querySelector("#universidad_id").value = "";
    } catch (error) {
        message.innerHTML = showMessage(error.message);
    } finally {
        button.disabled = false;
    }
}
