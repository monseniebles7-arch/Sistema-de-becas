const TOKEN_KEY = "becas_token";
const ADMIN_KEY = "becas_admin";

function getToken() {
    return sessionStorage.getItem(TOKEN_KEY);
}

function getAdmin() {
    const value = sessionStorage.getItem(ADMIN_KEY);
    return value ? JSON.parse(value) : null;
}

function saveSession(data) {
    sessionStorage.setItem(TOKEN_KEY, data.token);
    sessionStorage.setItem(ADMIN_KEY, JSON.stringify(data.administrador));
}

function clearSession() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_KEY);
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
    clearSession,
    async login(usuario, contrasena) {
        const data = await request("/auth/login", {
            method: "POST",
            body: JSON.stringify({ usuario, contrasena })
        });
        saveSession(data);
        return data;
    },
    listarEstudiantes() {
        return request("/estudiantes");
    },
    listarUniversidades() {
        return request("/universidades");
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
    }
};
