import { api } from "./api.js";
import { escapeHtml, showMessage } from "./ui.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const UNIVERSITY_LEVELS = new Set(["licenciatura", "maestria", "doctorado"]);
const SCHOOL_LEVELS = new Set(["primaria", "premedia", "media", "tecnico"]);
const SOCIOECONOMIC_PROGRAMS = new Set(["socioeconomico", "vulnerabilidad", "corregimiento", "trabajo_infantil"]);
const MERIT_PROGRAMS = new Set(["puesto_distinguido", "deporte", "bellas_artes", "cultura"]);
const PROGRAM_HELP = {
    concurso_primaria: "Concurso General para primaria. Se solicitarán datos escolares y el boletín correspondiente.",
    concurso_premedia_media: "Concurso General para premedia o media. Se solicitarán datos escolares y el boletín correspondiente.",
    concurso_primer_ingreso: "Concurso General universitario de primer ingreso. Completa tu carrera e información universitaria.",
    concurso_continuacion: "Concurso General universitario de continuación. Completa tu carrera y el índice académico.",
    concurso_postgrado: "Programa de postgrado. Indica tu nivel y los datos de la institución donde estudiarás.",
    puesto_distinguido: "Programa por mérito académico. Describe el puesto o reconocimiento obtenido.",
    exoneracion: "Exoneración para estudios en centros privados. Completa la información del centro educativo.",
    deporte: "Programa deportivo. Describe tu disciplina y logro deportivo.",
    bellas_artes: "Programa de bellas artes. Describe la disciplina y el logro artístico.",
    cultura: "Programa cultural. Describe la actividad o logro cultural.",
    pase_u: "PASE-U. Completa el nivel escolar y la información del centro educativo.",
    socioeconomico: "Asistencia socioeconómica. Se habilitarán los datos del hogar y su declaración.",
    discapacidad: "Apoyo para estudiantes con discapacidad. Se habilitará la sección y documento de sustento.",
    vulnerabilidad: "Asistencia por vulnerabilidad o pobreza. Se habilitarán los datos del hogar y su declaración.",
    corregimiento: "Asistencia por corregimiento. Se habilitarán los datos socioeconómicos del hogar.",
    trabajo_infantil: "Programa de erradicación del trabajo infantil. Completa los datos escolares y socioeconómicos aplicables.",
    internacional: "Beca internacional. Indica país e institución de destino; cada convocatoria establece los requisitos finales.",
    servidores_publicos: "Perfeccionamiento profesional para servidores públicos. Indica la institución y curso o especialidad.",
};
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
let programasBeca = [];
let estudiantePendienteId = null;
let archivosPendientes = [];
let estudianteEnEdicionId = null;
let documentosExistentes = [];
let studentMode = false;
let pendingApplicationId = null;

export async function renderRegister(studentId = null, forStudent = false) {
    const form = document.querySelector("#student-form");
    const busqueda = document.querySelector("#universidad_busqueda");
    const lista = document.querySelector("#lista-sugerencias");
    const nacimiento = document.querySelector("#fecha_nacimiento");
    estudianteEnEdicionId = studentId;
    studentMode = forStudent;
    pendingApplicationId = null;
    estudiantePendienteId = null;
    archivosPendientes = [];
    documentosExistentes = [];

    // Conecta los selectores de archivos antes de las llamadas a la API. Así,
    // un fallo al cargar datos no deja los botones de archivos sin respuesta.
    form.querySelectorAll("[data-file-target]").forEach((button) => {
        button.addEventListener("click", () => {
            const input = document.getElementById(button.dataset.fileTarget);
            if (input) input.click();
        });
    });
    form.querySelectorAll(".input-archivo").forEach((input) => {
        input.addEventListener("change", () => mostrarArchivos(input));
    });
    form.addEventListener("click", quitarArchivoSeleccionado);
    enlazarValidacionesDeIdentidad(form);

    const hoy = new Date();
    hoy.setMinutes(hoy.getMinutes() - hoy.getTimezoneOffset());
    nacimiento.max = hoy.toISOString().slice(0, 10);
    try {
        [centrosEducativos, tiposDocumento, programasBeca] = await Promise.all([
            api.listarUniversidades(),
            api.listarTiposDocumento(),
            api.listarProgramasBeca(),
        ]);
        renderProgramasBeca();
    } catch (error) {
        document.querySelector("#register-message").innerHTML = showMessage(
            `No se pudieron cargar los centros, tipos de documento o programas de beca: ${error.message}`
        );
        return;
    }

    if (studentMode) {
        try {
            const profile = await api.perfilEstudiante();
            cargarDatosEstudiante(profile);
            const applications = await api.misSolicitudes();
            const draft = applications.find((item) => item.estado === "borrador");
            if (draft) {
                pendingApplicationId = draft.id;
                documentosExistentes = draft.documentos || [];
                const section = document.querySelector("#existing-documents-section");
                if (section) {
                    section.hidden = false;
                    section.querySelector("h3")?.replaceChildren("Archivos subidos a este borrador");
                    section.querySelector(":scope > p")?.replaceChildren("Puedes revisar y quitar archivos antes de enviar la solicitud.");
                }
                renderDocumentosExistentes();
            }
            document.querySelector("#cedula").readOnly = true;
            document.querySelector("#correo").readOnly = true;
            setText("#register-title", "Nueva solicitud de beca");
            setText("#register-description", "Completa tu información y adjunta los documentos de esta solicitud.");
            setText("#registrar-estudiante", "Enviar solicitud y documentos");
            document.querySelector('a[href="#estudiantes"]').setAttribute("href", "#portal-estudiante");
        } catch (error) {
            console.error("No se pudo cargar el perfil o inicializar el formulario de solicitud:", error);
            document.querySelector("#register-message").innerHTML = showMessage(error.message);
            return;
        }
    }

    if (estudianteEnEdicionId) {
        try {
            const [student, docs] = await Promise.all([
                api.obtenerEstudiante(estudianteEnEdicionId),
                api.listarDocumentos(estudianteEnEdicionId),
            ]);
            cargarDatosEstudiante(student);
            documentosExistentes = docs;
            setText("#register-title", "Actualizar estudiante");
            setText("#register-description", "Modifique los datos y gestione los documentos del estudiante.");
            setText("#registrar-estudiante", "Guardar cambios");
            const section = document.querySelector("#existing-documents-section");
            if (section) section.hidden = false;
            renderDocumentosExistentes();
        } catch (error) {
            console.error("No se pudo cargar el estudiante para editar:", error);
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

    if (estudianteEnEdicionId) enlazarAccionesDocumentosExistentes();
    if (studentMode) {
        const uploadButton = document.querySelector("#subir-documentos-solicitud");
        if (uploadButton) {
            uploadButton.hidden = false;
            uploadButton.addEventListener("click", subirArchivosDelBorrador);
        }
        if (pendingApplicationId) enlazarAccionesDocumentosExistentes();
    }

    ["#fecha_nacimiento", "#nacionalidad", "#nivel_educativo", "#programa_solicitado",
        "#tipo_carrera", "#tiene_discapacidad"].forEach((selector) => {
        document.querySelector(selector).addEventListener("change", actualizarSecciones);
    });
    form.addEventListener("submit", handleRegister);
    actualizarSecciones();
}

function renderProgramasBeca() {
    const select = document.querySelector("#programa_solicitado");
    const selected = select.value;
    select.replaceChildren(new Option("Selecciona un programa", ""));
    const grupos = new Map();
    for (const programa of programasBeca) {
        if (!grupos.has(programa.categoria)) {
            const grupo = document.createElement("optgroup");
            grupo.label = programa.categoria;
            grupos.set(programa.categoria, grupo);
            select.append(grupo);
        }
        grupos.get(programa.categoria).append(new Option(programa.nombre, programa.id));
    }
    if (selected && programasBeca.some((programa) => programa.id === selected)) select.value = selected;
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
        list.innerHTML = studentMode
            ? "<p>Aún no has subido documentos a esta solicitud.</p>"
            : "<p>Este estudiante todavía no tiene documentos guardados.</p>";
        return;
    }
    list.innerHTML = documentosExistentes.map((documento) => `
        <div class="archivo-existente" data-document-row="${Number(documento.id)}">
            <div>
                <strong>${escapeHtml(documento.tipo_documento)}</strong>
                <small>Subido: ${escapeHtml(documento.fecha_carga || "sin fecha")} · Estado: ${escapeHtml(documento.estado || "pendiente")}</small>
            </div>
            <div class="acciones-archivo-existente">
                ${studentMode ? "" : `
                <input type="file" class="input-reemplazo-documento" data-document-id="${Number(documento.id)}" accept=".pdf,.png,.jpg,.jpeg" hidden>
                <button type="button" class="boton-subir-archivo" data-replace-document="${Number(documento.id)}">Reemplazar</button>`}
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
            if (studentMode) await api.eliminarDocumentoSolicitud(pendingApplicationId, documentId);
            else await api.eliminarDocumento(documentId);
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
    const element = document.querySelector(selector);
    if (element) element.hidden = !visible;
}

function setText(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
}

function setRequired(selector, required) {
    const element = document.querySelector(selector);
    if (element) element.required = required;
}

function esCedulaPanamena(value) {
    const text = value.trim();
    if (!/^\d+(?:-\d+){0,2}$/.test(text)) return false;
    if (text.includes("-")) {
        const parts = text.split("-");
        if (parts.length !== 3 || parts[0].length > 2 || parts[1].length > 4 || parts[2].length > 6) return false;
    }
    return text.replaceAll("-", "").length === 8;
}

function enlazarValidacionesDeIdentidad(form) {
    const idType = form.querySelector("#tipo_identificacion");
    const idNumber = form.querySelector("#cedula");
    const validateId = () => {
        const value = idNumber.value.trim();
        if (!value) {
            idNumber.setCustomValidity(idNumber.required ? "Ingrese el número de identificación." : "");
            return;
        }
        const panamanianId = ["cedula", "cedula_juvenil"].includes(idType.value);
        const valid = panamanianId
            ? esCedulaPanamena(value)
            : /^[\p{L}0-9][\p{L}0-9./-]{2,19}$/u.test(value);
        idNumber.setCustomValidity(valid
            ? ""
            : panamanianId
                ? "La cédula debe tener 8 dígitos. Puede escribirla seguida o con guiones, por ejemplo 8-123-1234."
                : "Ingrese un número de identificación válido (letras, números, punto, guion o barra; máximo 20 caracteres).");
    };
    idType.addEventListener("change", validateId);
    idNumber.addEventListener("input", validateId);
    validateId();

    form.querySelectorAll("#nombre, #apellido, #representante_nombre").forEach((input) => {
        input.addEventListener("input", () => {
            const value = input.value.trim();
            const valid = (!value && !input.required)
                || /^[\p{L}]+(?:[ '\u2019.-][\p{L}]+)*$/u.test(value);
            input.setCustomValidity(valid ? "" : "Use solo letras, espacios, apóstrofes o guiones.");
        });
    });

    const representativeId = form.querySelector("#representante_cedula");
    const validateRepresentativeId = () => {
        const value = representativeId.value.trim();
        representativeId.setCustomValidity((!value && !representativeId.required) || esCedulaPanamena(value)
            ? ""
            : "La cédula del representante debe tener 8 dígitos; puede usar guiones, por ejemplo 8-123-1234.");
    };
    representativeId.addEventListener("input", validateRepresentativeId);
    validateRepresentativeId();
}

function actualizarSecciones() {
    const age = edadEnFecha(document.querySelector("#fecha_nacimiento").value);
    const esMenor = age !== null && age < 18;
    const esExtranjero = document.querySelector("#nacionalidad").value === "extranjera";
    const program = document.querySelector("#programa_solicitado").value;
    const nivelPorPrograma = {
        concurso_primaria: "primaria",
        concurso_primer_ingreso: "licenciatura",
        concurso_continuacion: "licenciatura",
    };
    if (nivelPorPrograma[program]) document.querySelector("#nivel_educativo").value = nivelPorPrograma[program];
    if (program === "concurso_primer_ingreso") document.querySelector("#tipo_carrera").value = "primer_ingreso";
    if (program === "concurso_continuacion") document.querySelector("#tipo_carrera").value = "continuacion";
    const level = document.querySelector("#nivel_educativo").value;
    const esUniversitario = UNIVERSITY_LEVELS.has(level);
    const esEscolar = SCHOOL_LEVELS.has(level);
    const seleccionado = Boolean(program);
    const carreraUniversitaria = level === "licenciatura";
    const campoDiscapacidad = document.querySelector("#tiene_discapacidad");
    if (program === "discapacidad") campoDiscapacidad.value = "si";
    const discapacidad = campoDiscapacidad.value === "si";
    const esSocioeconomico = SOCIOECONOMIC_PROGRAMS.has(program);
    const esInternacional = program === "internacional";
    const esMerito = MERIT_PROGRAMS.has(program);

    mostrar("#application-fields", seleccionado);
    setText("#programa-ayuda", PROGRAM_HELP[program]
        || "Selecciona una opción para ver el formulario correspondiente.");
    mostrar("#socioeconomico-form-section", esSocioeconomico);
    mostrar("#condiciones-section", seleccionado);
    mostrar("#discapacidad-section", discapacidad);
    mostrar("#discapacidad-upload-card", program === "discapacidad");
    mostrar("#financiero-section", false);
    mostrar("#otros-section", esInternacional || esMerito || program === "servidores_publicos");
    mostrar("#program-specific-section", esInternacional || esMerito || program === "servidores_publicos");
    mostrar("#pais-destino-field", esInternacional);
    const esServidorPublico = program === "servidores_publicos";
    mostrar("#modalidad-beca-field", esInternacional);
    mostrar("#institucion-destino-field", esInternacional || esServidorPublico);
    mostrar("#logro-field", esMerito);
    mostrar("#convocatoria-field", esInternacional || esMerito || esServidorPublico);
    const documentoAdicional = document.querySelector('[data-upload-card="otro_documento"]');
    const detalleDocumento = {
        internacional: ["Documentos de la convocatoria", "Carta de admisión, oferta académica y demás documentos solicitados por la convocatoria."],
        puesto_distinguido: ["Sustento del mérito académico", "Adjunte constancia del puesto distinguido o reconocimiento."],
        deporte: ["Sustento del logro deportivo", "Adjunte constancias de participación o logros deportivos."],
        bellas_artes: ["Sustento del mérito artístico", "Adjunte constancias, reconocimientos o portafolio solicitado."],
        cultura: ["Sustento del mérito cultural", "Adjunte constancias del evento o reconocimiento."],
        servidores_publicos: ["Documentación del curso", "Adjunte la información del programa de perfeccionamiento que indique la convocatoria."],
    }[program];
    if (documentoAdicional) {
        const tituloDocumento = documentoAdicional.querySelector("strong");
        const ayudaDocumento = documentoAdicional.querySelector("small");
        if (tituloDocumento) tituloDocumento.textContent = detalleDocumento?.[0] || "Documento adicional";
        if (ayudaDocumento) ayudaDocumento.textContent = detalleDocumento?.[1]
            || "Adjunte archivos complementarios que el programa haya solicitado.";
    }
    setRequired("#nombre", seleccionado);
    setRequired("#apellido", seleccionado);
    setRequired("#fecha_nacimiento", seleccionado);
    setRequired("#sexo", seleccionado);
    setRequired("#tipo_identificacion", seleccionado);
    setRequired("#cedula", seleccionado);
    setRequired("#nacionalidad", seleccionado);
    setRequired("#correo", seleccionado);
    setRequired("#telefono", seleccionado);
    setRequired("#nivel_educativo", seleccionado);
    setRequired("#universidad_busqueda", seleccionado);
    setRequired("#tipo_centro", seleccionado);
    setRequired("#tiene_discapacidad", seleccionado);
    setRequired("#pais_destino", esInternacional);
    setRequired("#modalidad_internacional", esInternacional);
    setRequired("#institucion_destino", esInternacional || esServidorPublico);
    setRequired("#detalle_logro", esMerito);
    setRequired("#detalle_convocatoria", esInternacional || esMerito || esServidorPublico);
    setRequired("#detalle_discapacidad", seleccionado && discapacidad);
    if (!esInternacional) {
        document.querySelector("#pais_destino").value = "";
    }
    if (!esInternacional) document.querySelector("#modalidad_internacional").value = "";
    if (!esInternacional && !esServidorPublico) document.querySelector("#institucion_destino").value = "";
    if (!esMerito) document.querySelector("#detalle_logro").value = "";
    if (!esInternacional && !esMerito) document.querySelector("#detalle_convocatoria").value = "";

    mostrar("#representante-section", esMenor);
    ["representante_nombre", "representante_cedula", "representante_parentesco", "representante_telefono"]
        .forEach((id) => setRequired(`#${id}`, seleccionado && esMenor));
    if (!esMenor) {
        ["representante_nombre", "representante_cedula", "representante_parentesco", "representante_telefono"]
            .forEach((id) => { document.getElementById(id).value = ""; });
    }

    mostrar("#residencia-section", esExtranjero);
    setRequired("#anios_residencia", seleccionado && esExtranjero);
    setRequired("#pais_origen", seleccionado && esExtranjero);
    mostrar("#extranjero-section", esExtranjero);
    if (!esExtranjero) {
        document.querySelector("#anios_residencia").value = "";
        document.querySelector("#pais_origen").value = "";
    }

    mostrar("#universidad-fields", esUniversitario);
    mostrar("#tipo-carrera-field", carreraUniversitaria);
    setRequired("#carrera", seleccionado && esUniversitario);
    setRequired("#tipo_carrera", seleccionado && carreraUniversitaria);
    mostrar("#escolar-fields", esEscolar);
    setRequired("#promedio_academico", seleccionado && esEscolar);
    mostrar("#indice-fields", seleccionado && esUniversitario);
    setRequired("#indice_academico", seleccionado && esUniversitario);
    mostrar("#boletin-section", esEscolar);
    mostrar("#universidad-docs-section", esUniversitario);
    mostrar("#matricula-section", esUniversitario || program === "discapacidad");
    setRequired("#ingreso_familiar", seleccionado && esSocioeconomico);
    setRequired("#personas_hogar", seleccionado && esSocioeconomico);
    if (!esEscolar) document.querySelector("#promedio_academico").value = "";
    if (!esUniversitario) {
        document.querySelector("#carrera").value = "";
        document.querySelector("#tipo_carrera").value = "";
    }

    const referenciaPromedio = document.querySelector("#referencia-academica");
    const referenciaIndice = document.querySelector("#referencia-indice");
    if (referenciaPromedio) referenciaPromedio.textContent = program === "pase_u"
        ? "Referencia PASE-U 2026: promedio final mínimo de 3.0 en primaria y 3.0 por materia en premedia/media. Confirme el criterio de la convocatoria vigente."
        : program.startsWith("concurso_")
            ? "Referencia Concurso General 2026: promedio mínimo escolar de 4.5/5. El sistema registra el promedio, pero no decide elegibilidad."
            : "El promedio requerido depende del programa y su convocatoria vigente; el sistema registra el dato sin decidir elegibilidad.";
    if (referenciaIndice) referenciaIndice.textContent = program.startsWith("concurso_")
        ? document.querySelector("#tipo_carrera").value === "continuacion"
            ? "Referencia para continuación universitaria: índice mínimo publicado de 2.0/3. El sistema registra el índice, pero no decide elegibilidad."
            : "Referencia para primer ingreso universitario: promedio mínimo publicado de 4.5/5. Confirme siempre las reglas de la convocatoria."
        : "El índice requerido depende del programa y la convocatoria vigente; el sistema registra el dato sin decidir elegibilidad.";

    if (!discapacidad) document.querySelector("#detalle_discapacidad").value = "";
    ["#cedula", "#nombre", "#apellido", "#representante_nombre", "#representante_cedula"]
        .forEach((selector) => {
            const input = document.querySelector(selector);
            if (input) input.dispatchEvent(new Event("input", { bubbles: true }));
        });
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
    if (document.querySelector("#programa_solicitado").value === "discapacidad" && SCHOOL_LEVELS.has(level)) {
        required.push("comprobante_matricula");
    }
    if (SOCIOECONOMIC_PROGRAMS.has(program)) required.push("declaracion_socioeconomica");
    if (document.querySelector("#tiene_discapacidad").value === "si") required.push("formulario_discapacidad");
    if (program === "internacional" || MERIT_PROGRAMS.has(program) || program === "servidores_publicos") {
        required.push("otro_documento");
    }
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
    data.programa_campos = {
        pais_destino: document.querySelector("#pais_destino").value.trim() || null,
        institucion_destino: document.querySelector("#institucion_destino").value.trim() || null,
        modalidad_internacional: document.querySelector("#modalidad_internacional").value || null,
        detalle_logro: document.querySelector("#detalle_logro").value.trim() || null,
        detalle_convocatoria: document.querySelector("#detalle_convocatoria").value.trim() || null,
    };
    return data;
}

function validarExpediente(data, files, revisarDocumentosRequeridos = true) {
    const savedCategories = new Set(documentosExistentes.map(categoryForDocument).filter(Boolean));
    const missing = revisarDocumentosRequeridos ? documentosObligatorios().filter((category) =>
        !files.some((item) => item.category === category) && !savedCategories.has(category)
    ) : [];
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
            if (studentMode) await api.subirDocumentoSolicitud(pendingApplicationId, typeId, item.file);
            else await api.subirDocumento(estudiantePendienteId, typeId, item.file);
            uploaded.push(item);
        } catch (error) {
            failed.push({ ...item, reason: error.message });
        }
    }
    archivosPendientes = failed;
    return { uploaded, failed };
}

function quitarArchivosYaSubidos(items) {
    const uploaded = new Map();
    for (const item of items) {
        if (!uploaded.has(item.category)) uploaded.set(item.category, new Set());
        uploaded.get(item.category).add(item.file);
    }
    document.querySelectorAll(".input-archivo").forEach((input) => {
        const category = input.closest("[data-upload-card]")?.dataset.uploadCard;
        const completed = uploaded.get(category);
        if (!completed?.size) return;
        const transfer = new DataTransfer();
        [...input.files].forEach((file) => {
            if (!completed.has(file)) transfer.items.add(file);
        });
        input.files = transfer.files;
        mostrarArchivos(input);
    });
}

async function actualizarDocumentosDelBorrador() {
    if (!pendingApplicationId) return;
    const applications = await api.misSolicitudes();
    const draft = applications.find((item) => item.id === pendingApplicationId);
    documentosExistentes = draft?.documentos || [];
    const section = document.querySelector("#existing-documents-section");
    if (section) section.hidden = false;
    renderDocumentosExistentes();
}

async function prepararArchivosSolicitud(data, files) {
    if (!pendingApplicationId) {
        const application = await api.crearSolicitud(data);
        pendingApplicationId = application.id;
        const section = document.querySelector("#existing-documents-section");
        if (section) {
            section.hidden = false;
            section.querySelector("h3")?.replaceChildren("Archivos subidos a este borrador");
            section.querySelector(":scope > p")?.replaceChildren("Puedes revisar y quitar archivos antes de enviar la solicitud.");
        }
        enlazarAccionesDocumentosExistentes();
    }
    archivosPendientes = files;
    const result = await cargarArchivosPendientes();
    quitarArchivosYaSubidos(result.uploaded);
    await actualizarDocumentosDelBorrador();
    return result;
}

async function subirArchivosDelBorrador() {
    const form = document.querySelector("#student-form");
    const message = document.querySelector("#register-message");
    const button = document.querySelector("#subir-documentos-solicitud");
    if (!form.reportValidity()) return;
    const data = recopilarDatos();
    const files = archivosEnFormulario();
    const invalid = validarExpediente(data, files, false);
    if (invalid) {
        message.innerHTML = showMessage(invalid);
        return;
    }
    if (!files.length) {
        message.innerHTML = showMessage("Selecciona uno o más archivos antes de subirlos.");
        return;
    }
    button.disabled = true;
    message.innerHTML = "";
    try {
        const { uploaded, failed } = await prepararArchivosSolicitud(data, files);
        if (failed.length) {
            message.innerHTML = showMessage(`Se subieron ${uploaded.length} archivo(s), pero fallaron: ${failed.map((item) => `${item.file.name}: ${item.reason}`).join("; ")}`);
            return;
        }
        message.innerHTML = showMessage(`${uploaded.length} archivo(s) subido(s) al borrador. Puedes agregar más o quitar los que ya aparecen guardados.`, "exito");
    } catch (error) {
        message.innerHTML = showMessage(error.message);
    } finally {
        button.disabled = false;
    }
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
        const validationError = validarExpediente(data, files, !studentMode);
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

        if (studentMode) {
            const { uploaded, failed } = await prepararArchivosSolicitud(data, files);
            if (failed.length) {
                message.innerHTML = showMessage(`El borrador #${pendingApplicationId} se guardó, pero algunos archivos no se cargaron. Corrige el error y vuelve a subirlos: ${failed.map((item) => `${item.file.name}: ${item.reason}`).join("; ")}`);
                return;
            }
            const savedCategories = new Set(documentosExistentes.map(categoryForDocument).filter(Boolean));
            const missing = documentosObligatorios().filter((category) => !savedCategories.has(category));
            if (missing.length) {
                const labels = missing.map((category) => DOCUMENT_TYPES[category]).join(", ");
                message.innerHTML = showMessage(`El borrador #${pendingApplicationId} y los archivos seleccionados se guardaron. Aún faltan: ${labels}. Sube esos archivos y luego vuelve a enviar la solicitud.`);
                return;
            }
            try {
                await api.enviarSolicitud(pendingApplicationId);
            } catch (error) {
                message.innerHTML = showMessage(error.message);
                return;
            }
            const id = pendingApplicationId;
            pendingApplicationId = null;
            archivosPendientes = [];
            form.querySelectorAll(".input-archivo").forEach((input) => { input.value = ""; mostrarArchivos(input); });
            message.innerHTML = showMessage(`Solicitud #${id} enviada correctamente con ${uploaded.length} archivo(s) en esta carga.`, "exito");
            window.location.hash = "#portal-estudiante";
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
