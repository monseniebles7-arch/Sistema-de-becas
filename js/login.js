const API_BASE_URL = window.APP_CONFIG?.apiBaseUrl || "http://127.0.0.1:5000";

const form = document.querySelector("#login-form");
const message = document.querySelector("#login-message");
const button = document.querySelector("#login-button");

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "";
    button.disabled = true;
    button.textContent = "Ingresando...";

    try {
        const formData = new FormData(form);
        const response = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                usuario: formData.get("usuario").trim(),
                contrasena: formData.get("contrasena"),
            }),
        });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "No se pudo iniciar sesión.");
        }

        sessionStorage.setItem("becas_token", result.token);
        sessionStorage.setItem("becas_user", JSON.stringify(result.usuario));
        sessionStorage.setItem("becas_role", result.rol);
        if (result.rol === "admin") {
            sessionStorage.setItem("becas_admin", JSON.stringify(result.usuario));
        } else {
            sessionStorage.removeItem("becas_admin");
        }

        window.location.href = `frontend/index.html#${result.rol === "student" ? "portal-estudiante" : "inicio"}`;
    } catch (error) {
        message.textContent = error instanceof TypeError
            ? "No se pudo conectar con el servidor. Verifica que el backend esté encendido."
            : error.message;
        button.disabled = false;
        button.textContent = "Acceder";
    }
});
