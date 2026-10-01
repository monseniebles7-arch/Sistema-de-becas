const TOKEN_KEY = "becas_token";
const ADMIN_KEY = "becas_admin";
const USER_KEY = "becas_user";
const ROLE_KEY = "becas_role";

function getToken() {
    return sessionStorage.getItem(TOKEN_KEY);
}

function getAdmin() {
    const value = sessionStorage.getItem(ADMIN_KEY);
    return value ? JSON.parse(value) : null;
}
function getUser() {
    const value = sessionStorage.getItem(USER_KEY);
    return value ? JSON.parse(value) : null;
}
function getRole() { return sessionStorage.getItem(ROLE_KEY) || "admin"; }

function saveSession(data) {
    sessionStorage.setItem(TOKEN_KEY, data.token);
    const user = data.usuario || data.administrador;
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    sessionStorage.setItem(ROLE_KEY, data.rol || "admin");
    if (data.rol === "admin") sessionStorage.setItem(ADMIN_KEY, JSON.stringify(user));
}

function clearSession() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(ROLE_KEY);
}

async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    const token = getToken();

    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    if (options.body && !(options.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`${window.APP_CONFIG.apiBaseUrl}${path}`, {
        ...options,
        headers
    });

    let data = null;
    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (response.status === 401) {
        clearSession();
        window.dispatchEvent(new CustomEvent("auth-expired"));
    }

    if (!response.ok) {
        const error = new Error(data?.error || "No se pudo completar la solicitud.");
        error.status = response.status;
        throw error;
    }

    return data;
}

export const api = {
    getToken,
    getAdmin,
    getUser,
    getRole,
    clearSession,
    async login(usuario, contrasena) {
        const data = await request("/auth/login", {
            method: "POST",
            body: JSON.stringify({ usuario, contrasena })
        });
        saveSession(data);
        return data;
    },
    registrarCuentaEstudiante(datos) {
        return request("/auth/registro-estudiante", { method: "POST", body: JSON.stringify(datos) });
    },
    perfilEstudiante() { return request("/estudiante/perfil"); },
    misSolicitudes() { return request("/estudiante/solicitudes"); },
    crearSolicitud(estudiante) {
        return request("/estudiante/solicitudes", { method: "POST", body: JSON.stringify({ estudiante }) });
    },
    enviarSolicitud(id) { return request(`/estudiante/solicitudes/${id}/enviar`, { method: "POST", body: JSON.stringify({}) }); },
    subirDocumentoSolicitud(solicitudId, tipoDocumentoId, archivo) {
        const body = new FormData();
        body.append("tipo_documento_id", tipoDocumentoId);
        body.append("archivo", archivo);
        return request(`/estudiante/solicitudes/${solicitudId}/documentos`, { method: "POST", body });
    },
    eliminarDocumentoSolicitud(solicitudId, documentoId) {
        return request(`/estudiante/solicitudes/${solicitudId}/documentos/${documentoId}`, { method: "DELETE" });
    },
    listarSolicitudesAdmin() { return request("/solicitudes"); },
    actualizarSolicitud(id, estado, observaciones_admin) {
        return request(`/solicitudes/${id}`, { method: "PATCH", body: JSON.stringify({ estado, observaciones_admin }) });
    },
    listarEstudiantes() {
        return request("/estudiantes");
    },
    obtenerEstudiante(id) {
        return request(`/estudiantes/${id}`);
    },
    actualizarEstudiante(id, estudiante) {
        return request(`/estudiantes/${id}`, {
            method: "PUT",
            body: JSON.stringify(estudiante)
        });
    },
    listarUniversidades() {
        return request("/universidades");
    },
    listarProgramasBeca() {
        return request("/programas-beca");
    },
    listarTiposDocumento() {
        return request("/tipos-documento");
    },
    registrarEstudiante(estudiante) {
        return request("/estudiantes", {
            method: "POST",
            body: JSON.stringify(estudiante)
        });
    },
    subirDocumento(estudianteId, tipoDocumentoId, archivo) {
        const body = new FormData();
        body.append("estudiante_id", estudianteId);
        body.append("tipo_documento_id", tipoDocumentoId);
        body.append("archivo", archivo);
        return request("/documentos", { method: "POST", body });
    },
    listarDocumentos(estudianteId) {
        return request(`/estudiantes/${estudianteId}/documentos`);
    },
    reemplazarDocumento(documentoId, archivo) {
        const body = new FormData();
        body.append("archivo", archivo);
        return request(`/documentos/${documentoId}`, { method: "PUT", body });
    },
    eliminarDocumento(documentoId) {
        return request(`/documentos/${documentoId}`, { method: "DELETE" });
    }
};
