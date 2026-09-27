import { api } from "./api.js";
import { escapeHtml, showMessage } from "./ui.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const UNIVERSITY_LEVELS = new Set(["licenciatura", "maestria", "doctorado"]);
const SCHOOL_LEVELS = new Set(["primaria", "premedia", "media", "tecnico"]);
const DOCUMENT_TYPES = {
    identificacion_estudiante: "Identificación del estudiante",
    foto_carne: "Foto carné",
    identificacion_representante: "Identificación del representante",
    constancia_migratoria: "Certificación migratoria",
    boletin_calificaciones: "Boletín de calificaciones",
    creditos_academicos: "Créditos académicos",
    comprobante_matricula: "Comprobante de matrícula",
    declaracion_socioeconomica: "Declaración jurada socioeconómica",
    formulario_discapacidad: "Formulario de discapacidad",
    certificacion_bancaria: "Certificación bancaria",
    otro_documento: "Otro documento",
};

let centrosEducativos = [];
let tiposDocumento = [];
let estudiantePendienteId = null;
let archivosPendientes = [];
let estudianteEnEdicionId = null;
let documentosExistentes = [];

export async function renderRegister(studentId = null) {
    const form = document.querySelector("#student-form");
    const busqueda = document.querySelector("#universidad_busqueda");
    const lista = document.querySelector("#lista-sugerencias");
    const nacimiento = document.querySelector("#fecha_nacimiento");
    estudianteEnEdicionId = studentId;
    estudiantePendienteId = null;
    archivosPendientes = [];
    documentosExistentes = [];

    const hoy = new Date();
    hoy.setMinutes(hoy.getMinutes() - hoy.getTimezoneOffset());
    nacimiento.max = hoy.toISOString().slice(0, 10);
    try {
        [centrosEducativos, tiposDocumento] = await Promise.all([
            api.listarUniversidades(),
            api.listarTiposDocumento(),
        ]);
    } catch (error) {
        document.querySelector("#register-message").innerHTML = showMessage(
            `No se pudieron cargar los centros o tipos de documento: ${error.message}`
        );
        return;
    }

    if (estudianteEnEdicionId) {
        try {
            const [student, docs] = await Promise.all([
                api.obtenerEstudiante(estudianteEnEdicionId),
                api.listarDocumentos(estudianteEnEdicionId),
            ]);
            cargarDatosEstudiante(student);
            documentosExistentes = docs;
            document.querySelector("#register-title").textContent = "Actualizar estudiante";
            document.querySelector("#register-description").textContent = "Modifique los datos y gestione los documentos del estudiante.";
            document.querySelector("#registrar-estudiante").textContent = "Guardar cambios";
            document.querySelector("#existing-documents-section").hidden = false;
            renderDocumentosExistentes();
        } catch (error) {
            document.querySelector("#register-message").innerHTML = showMessage(
                `No se pudieron cargar los datos del estudiante: ${error.message}`
            );
            return;
        }
    }

    busqueda.addEventListener("input", () => mostrarSugerencias(busqueda.value));
    lista.addEventListener("pointerdown", (event) => {
        const item = event.target.closest(".sugerencia-item");
        if (!item) return;
        event.preventDefault();
        seleccionarCentro(item.dataset.id, item.dataset.nombre);
    });
    busqueda.addEventListener("blur", () => {
        setTimeout(() => cerrarSugerencias(), 150);
    });

    form.querySelectorAll("[data-file-target]").forEach((button) => {
        button.addEventListener("click", () => {
            document.getElementById(button.dataset.fileTarget)?.click();
        });
    });
    form.querySelectorAll(".input-archivo").forEach((input) => {
        input.addEventListener("change", () => mostrarArchivos(input));
    });
    form.addEventListener("click", quitarArchivoSeleccionado);
    if (estudianteEnEdicionId) enlazarAccionesDocumentosExistentes();

    ["#fecha_nacimiento", "#nacionalidad", "#nivel_educativo", "#programa_solicitado",
        "#tipo_carrera", "#tiene_discapacidad"].forEach((selector) => {
        document.querySelector(selector).addEventListener("change", actualizarSecciones);
    });
    form.addEventListener("submit", handleRegister);
    actualizarSecciones();
}

function cargarDatosEstudiante(student) {
    const form = document.querySelector("#student-form");
    const aliases = {
        tipo_cuenta: "tipo_cuenta_bancaria",
        universidad_busqueda: "centro_educativo",
    };
    for (const element of form.elements) {
        if (!element.name || element.type === "file") continue;
        const sourceName = aliases[element.name] || element.name;
        let value = student[sourceName];
        if (element.name === "tiene_discapacidad") value = student.tiene_discapacidad ? "si" : "no";
        if (element.name === "nacionalidad" && !value) value = student.es_extranjero ? "extranjera" : "panamena";
        if (value !== null && value !== undefined) element.value = String(value);
    }
    document.querySelector("#universidad_id").value = student.universidad_id || "";
    actualizarSecciones();
}

function mostrarSugerencias(texto) {
    const lista = document.querySelector("#lista-sugerencias");
    document.querySelector("#universidad_id").value = "";
    const termino = texto.trim().toLocaleLowerCase();
    if (!termino) {
        cerrarSugerencias();
        return;
    }

    const coincidencias = centrosEducativos.filter((centro) =>
        centro.nombre.toLocaleLowerCase().includes(termino)
    );
    if (coincidencias.length === 0) {
        lista.innerHTML = "<li class=\"sugerencia-vacia\">Sin coincidencias; puede escribir el nombre del centro.</li>";
        actualizarEstadoSugerencias(true);
        return;
    }

    lista.innerHTML = coincidencias.map((centro) =>
        `<li class="sugerencia-item" data-id="${escapeHtml(centro.id)}" data-nombre="${escapeHtml(centro.nombre)}" role="option">${escapeHtml(centro.nombre)}</li>`
    ).join("");
    actualizarEstadoSugerencias(true);
}

function actualizarEstadoSugerencias(abierto) {
    document.querySelector("#universidad_busqueda").setAttribute("aria-expanded", String(abierto));
}

function cerrarSugerencias() {
    const lista = document.querySelector("#lista-sugerencias");
    if (lista) lista.innerHTML = "";
    const busqueda = document.querySelector("#universidad_busqueda");
    if (busqueda) busqueda.setAttribute("aria-expanded", "false");
}

function seleccionarCentro(id, nombre) {
    document.querySelector("#universidad_busqueda").value = nombre;
    document.querySelector("#universidad_id").value = id;
    cerrarSugerencias();
}

function mostrarArchivos(input) {
    const card = input.closest(".upload-card");
    const display = card.querySelector(".archivo-seleccionado");
    const files = [...input.files];
    display.innerHTML = files.length
        ? files.map((file, index) => `
            <span class="archivo-seleccionado-item">
                ${escapeHtml(file.name)}
                <button type="button" class="boton-quitar-archivo" data-remove-file-index="${index}" aria-label="Quitar ${escapeHtml(file.name)}">Quitar</button>
            </span>`).join("")
        : "No se han seleccionado archivos.";
}

function quitarArchivoSeleccionado(event) {
    const button = event.target.closest("[data-remove-file-index]");
    if (!button) return;
    const input = button.closest(".upload-card").querySelector(".input-archivo");
    const removeIndex = Number(button.dataset.removeFileIndex);
    const transfer = new DataTransfer();
    [...input.files].forEach((file, index) => {
        if (index !== removeIndex) transfer.items.add(file);
    });
    input.files = transfer.files;
    mostrarArchivos(input);
}

function categoryForDocument(documento) {
    return Object.entries(DOCUMENT_TYPES).find(([, label]) =>
        label.toLocaleLowerCase() === (documento.tipo_documento || "").toLocaleLowerCase()
    )?.[0];
}

function renderDocumentosExistentes() {
    const list = document.querySelector("#existing-documents-list");
    if (!documentosExistentes.length) {
        list.innerHTML = "<p>Este estudiante todavía no tiene documentos guardados.</p>";
        return;
    }
    list.innerHTML = documentosExistentes.map((documento) => `
        <div class="archivo-existente" data-document-row="${Number(documento.id)}">
            <div>
                <strong>${escapeHtml(documento.tipo_documento)}</strong>
                <small>Subido: ${escapeHtml(documento.fecha_carga || "sin fecha")} · Estado: ${escapeHtml(documento.estado || "pendiente")}</small>
            </div>
            <div class="acciones-archivo-existente">
                <input type="file" class="input-reemplazo-documento" data-document-id="${Number(documento.id)}" accept=".pdf,.png,.jpg,.jpeg" hidden>
                <button type="button" class="boton-subir-archivo" data-replace-document="${Number(documento.id)}">Reemplazar</button>
                <button type="button" class="boton-quitar-archivo" data-delete-document="${Number(documento.id)}">Quitar</button>
            </div>
        </div>`).join("");
}

function enlazarAccionesDocumentosExistentes() {
    const list = document.querySelector("#existing-documents-list");
    list.addEventListener("click", async (event) => {
        const replaceButton = event.target.closest("[data-replace-document]");
        if (replaceButton) {
            list.querySelector(`[data-document-id="${replaceButton.dataset.replaceDocument}"]`)?.click();
            return;
        }
        const deleteButton = event.target.closest("[data-delete-document]");
        if (!deleteButton) return;
        const documentId = Number(deleteButton.dataset.deleteDocument);
        if (!window.confirm("¿Quitar este documento guardado? Esta acción elimina el archivo asociado.")) return;
        deleteButton.disabled = true;
        try {
            await api.eliminarDocumento(documentId);
            documentosExistentes = documentosExistentes.filter((item) => item.id !== documentId);
            renderDocumentosExistentes();
            document.querySelector("#existing-documents-message").innerHTML = showMessage("Documento eliminado.", "exito");
        } catch (error) {
            document.querySelector("#existing-documents-message").innerHTML = showMessage(error.message);
            deleteButton.disabled = false;
        }
    });
    list.addEventListener("change", async (event) => {
        const input = event.target.closest(".input-reemplazo-documento");
        const file = input?.files?.[0];
        if (!input || !file) return;
        const documentId = Number(input.dataset.documentId);
        const message = document.querySelector("#existing-documents-message");
        if (file.size > MAX_FILE_SIZE) {
            message.innerHTML = showMessage(`${file.name} supera el límite de 10 MB.`);
            input.value = "";
            return;
        }
        try {
            await api.reemplazarDocumento(documentId, file);
            documentosExistentes = await api.listarDocumentos(estudianteEnEdicionId);
            renderDocumentosExistentes();
            message.innerHTML = showMessage("Documento reemplazado correctamente.", "exito");
        } catch (error) {
            message.innerHTML = showMessage(error.message);
        }
    });
}

function edadEnFecha(fechaTexto) {
    if (!fechaTexto) return null;
    const nacimiento = new Date(`${fechaTexto}T00:00:00`);
    if (Number.isNaN(nacimiento.getTime())) return null;
    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    if (hoy.getMonth() < nacimiento.getMonth()
        || (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate())) {
        edad -= 1;
    }
    return edad;
}

function mostrar(selector, visible) {
    document.querySelector(selector).hidden = !visible;
}

function actualizarSecciones() {
    const age = edadEnFecha(document.querySelector("#fecha_nacimiento").value);
    const esMenor = age !== null && age < 18;
    const esExtranjero = document.querySelector("#nacionalidad").value === "extranjera";
    const level = document.querySelector("#nivel_educativo").value;
    const program = document.querySelector("#programa_solicitado").value;
    const esUniversitario = UNIVERSITY_LEVELS.has(level);
    const esEscolar = SCHOOL_LEVELS.has(level);
    const discapacidad = document.querySelector("#tiene_discapacidad").value === "si";

    mostrar("#representante-section", esMenor);
    ["representante_nombre", "representante_cedula", "representante_parentesco", "representante_telefono"]
        .forEach((id) => { document.getElementById(id).required = esMenor; });
    if (!esMenor) {
        ["representante_nombre", "representante_cedula", "representante_parentesco", "representante_telefono"]
            .forEach((id) => { document.getElementById(id).value = ""; });
    }

    mostrar("#residencia-section", esExtranjero);
    document.querySelector("#anios_residencia").required = esExtranjero;
    document.querySelector("#pais_origen").required = esExtranjero;
    mostrar("#extranjero-section", esExtranjero);
    if (!esExtranjero) {
        document.querySelector("#anios_residencia").value = "";
        document.querySelector("#pais_origen").value = "";
    }

    mostrar("#universidad-fields", esUniversitario);
    document.querySelector("#carrera").required = esUniversitario;
    document.querySelector("#tipo_carrera").required = esUniversitario;
    mostrar("#escolar-fields", esEscolar);
    document.querySelector("#promedio_academico").required = esEscolar;
    mostrar("#indice-fields", esUniversitario);
    document.querySelector("#indice_academico").required = esUniversitario;
    mostrar("#boletin-section", esEscolar);
    mostrar("#universidad-docs-section", esUniversitario);
    if (!esEscolar) document.querySelector("#promedio_academico").value = "";
    if (!esUniversitario) {
        document.querySelector("#indice_academico").value = "";
        document.querySelector("#carrera").value = "";
        document.querySelector("#tipo_carrera").value = "";
    }

    const referenciaPromedio = document.querySelector("#referencia-academica");
    const referenciaIndice = document.querySelector("#referencia-indice");
    referenciaPromedio.textContent = program === "pase_u"
        ? "Referencia PASE-U 2026: promedio final mínimo de 3.0 en primaria y 3.0 por materia en premedia/media. Confirme el criterio de la convocatoria vigente."
        : program === "concurso_general"
            ? "Referencia Concurso General 2026: promedio mínimo escolar de 4.5/5. El sistema registra el promedio, pero no decide elegibilidad."
            : "El promedio requerido depende del programa y su convocatoria vigente; el sistema registra el dato sin decidir elegibilidad.";
    referenciaIndice.textContent = program === "concurso_general"
        ? document.querySelector("#tipo_carrera").value === "continuacion"
            ? "Referencia para continuación universitaria: índice mínimo publicado de 2.0/3. El sistema registra el índice, pero no decide elegibilidad."
            : "Referencia para primer ingreso universitario: promedio mínimo publicado de 4.5/5. Confirme siempre las reglas de la convocatoria."
        : "El índice requerido depende del programa y la convocatoria vigente; el sistema registra el dato sin decidir elegibilidad.";

    mostrar("#discapacidad-section", discapacidad);
    if (!discapacidad) document.querySelector("#detalle_discapacidad").value = "";
}

function archivosEnFormulario() {
    const files = [];
    document.querySelectorAll(".input-archivo").forEach((input) => {
        if (input.parentElement.closest("[hidden]")) return;
        const category = input.closest("[data-upload-card]").dataset.uploadCard;
        [...input.files].forEach((file) => files.push({ category, file }));
    });
    return files;
}

function documentosObligatorios() {
    const required = ["identificacion_estudiante", "foto_carne"];
    const age = edadEnFecha(document.querySelector("#fecha_nacimiento").value);
    const level = document.querySelector("#nivel_educativo").value;
    const program = document.querySelector("#programa_solicitado").value;
    if (age !== null && age < 18) required.push("identificacion_representante");
    if (document.querySelector("#nacionalidad").value === "extranjera") required.push("constancia_migratoria");
    if (SCHOOL_LEVELS.has(level)) required.push("boletin_calificaciones");
    if (UNIVERSITY_LEVELS.has(level)) required.push("creditos_academicos", "comprobante_matricula");
    if (["concurso_general", "socioeconomico"].includes(program)) required.push("declaracion_socioeconomica");
    if (document.querySelector("#tiene_discapacidad").value === "si") required.push("formulario_discapacidad");
    return required;
}

function recopilarDatos() {
    const form = document.querySelector("#student-form");
    const data = Object.fromEntries(new FormData(form));
    delete data.universidad_busqueda;
    data.universidad_id = data.universidad_id ? Number(data.universidad_id) : null;
    data.es_extranjero = data.nacionalidad === "extranjera";
    data.tiene_discapacidad = data.tiene_discapacidad === "si";
    data.tipo_cuenta_bancaria = data.tipo_cuenta || null;
    delete data.tipo_cuenta;
    for (const field of ["anios_residencia", "personas_hogar"]) {
        data[field] = data[field] ? Number(data[field]) : null;
    }
    for (const field of ["promedio_academico", "indice_academico", "ingreso_familiar"]) {
        data[field] = data[field] ? Number(data[field]) : null;
    }
    for (const [field, value] of Object.entries(data)) {
        if (value === "") data[field] = null;
    }
    return data;
}

function validarExpediente(data, files) {
    const savedCategories = new Set(documentosExistentes.map(categoryForDocument).filter(Boolean));
    const missing = documentosObligatorios().filter((category) =>
        !files.some((item) => item.category === category) && !savedCategories.has(category)
    );
    if (missing.length) {
        const labels = missing.map((category) => DOCUMENT_TYPES[category]).join(", ");
        return `Faltan los archivos requeridos: ${labels}.`;
    }
    for (const { file } of files) {
        if (file.size > MAX_FILE_SIZE) return `${file.name} supera el límite de 10 MB.`;
        if (file.size === 0) return `${file.name} está vacío.`;
    }
    if (data.es_extranjero && data.anios_residencia === null) {
        return "Indique los años de residencia del estudiante extranjero.";
    }
    return null;
}

function tipoDocumentoId(category) {
    const expectedName = DOCUMENT_TYPES[category];
    return tiposDocumento.find((type) => type.nombre.toLocaleLowerCase() === expectedName.toLocaleLowerCase())?.id;
}

async function cargarArchivosPendientes() {
    const uploaded = [];
    const failed = [];
    for (const item of archivosPendientes) {
        const typeId = tipoDocumentoId(item.category);
        if (!typeId) {
            failed.push({ ...item, reason: `No está configurado el tipo de documento “${DOCUMENT_TYPES[item.category]}”.` });
            continue;
        }
        try {
            await api.subirDocumento(estudiantePendienteId, typeId, item.file);
            uploaded.push(item);
        } catch (error) {
            failed.push({ ...item, reason: error.message });
        }
    }
    archivosPendientes = failed;
    return { uploaded, failed };
}

function limpiarRegistro() {
    document.querySelector("#student-form").reset();
    document.querySelectorAll(".archivo-seleccionado").forEach((element) => {
        element.textContent = "No se han seleccionado archivos.";
    });
    document.querySelector("#universidad_id").value = "";
    cerrarSugerencias();
    actualizarSecciones();
}

async function handleRegister(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const message = document.querySelector("#register-message");
    const button = document.querySelector("#registrar-estudiante");

    button.disabled = true;
    message.innerHTML = "";
    try {
        if (!form.reportValidity()) return;
        const data = recopilarDatos();
        const files = archivosEnFormulario();
        const validationError = validarExpediente(data, files);
        if (validationError) {
            message.innerHTML = showMessage(validationError);
            return;
        }

        const missingTypes = [...new Set(files.map((item) => item.category))]
            .filter((category) => !tipoDocumentoId(category));
        if (missingTypes.length) {
            message.innerHTML = showMessage(
                `Falta ejecutar la migración del backend para estos tipos de documento: ${missingTypes.map((item) => DOCUMENT_TYPES[item]).join(", ")}.`
            );
            return;
        }

        if (estudianteEnEdicionId) {
            await api.actualizarEstudiante(estudianteEnEdicionId, data);
            if (estudiantePendienteId !== estudianteEnEdicionId) {
                estudiantePendienteId = estudianteEnEdicionId;
                archivosPendientes = files;
            }
        } else if (!estudiantePendienteId) {
            const created = await api.registrarEstudiante(data);
            estudiantePendienteId = created.id;
            archivosPendientes = files;
        }

        const { uploaded, failed } = await cargarArchivosPendientes();
        if (failed.length) {
            const errors = failed.map((item) => `${item.file.name}: ${item.reason}`).join("; ");
            message.innerHTML = showMessage(
                `El estudiante ${estudianteEnEdicionId ? "se actualizó" : "quedó registrado"} (ID ${estudiantePendienteId}), pero algunos archivos no se cargaron: ${errors}. Vuelva a pulsar “${estudianteEnEdicionId ? "Guardar cambios" : "Registrar estudiante y documentos"}” para reintentar.`
            );
            return;
        }

        const studentId = estudiantePendienteId;
        const total = uploaded.length;
        estudiantePendienteId = null;
        archivosPendientes = [];
        if (estudianteEnEdicionId) {
            documentosExistentes = await api.listarDocumentos(estudianteEnEdicionId);
            renderDocumentosExistentes();
            document.querySelectorAll(".input-archivo").forEach((input) => {
                input.value = "";
                mostrarArchivos(input);
            });
            message.innerHTML = showMessage(`Estudiante actualizado (ID ${studentId}); ${total} archivo(s) nuevo(s) vinculado(s).`, "exito");
        } else {
            limpiarRegistro();
            message.innerHTML = showMessage(
                `Estudiante registrado (ID ${studentId}) y ${total} archivo(s) vinculado(s) correctamente.`,
                "exito"
            );
        }
    } catch (error) {
        message.innerHTML = showMessage(error.message);
    } finally {
        button.disabled = false;
    }
}
