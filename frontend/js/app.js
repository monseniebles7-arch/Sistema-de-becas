import { api } from "./api.js";
import { renderLogin, renderActiveAdmin } from "./auth.js";
import { renderHome } from "./inicio.js";
import { renderStudents } from "./estudiantes.js";
import { renderRegister } from "./registrar-estudiante.js";
import { loadView } from "./ui.js";

const app = document.querySelector("#app");

function navigate(view) {
    window.location.hash = view;
}

async function renderShell() {
    app.innerHTML = await loadView("views/shell.html");
    renderActiveAdmin();
    document.querySelector("#logout-button").addEventListener("click", () => {
        api.clearSession();
        navigate("#login");
    });
}

async function renderPrivateView(view) {
    await renderShell();
    const content = document.querySelector("#view-content");

    if (view === "#registrar") {
        content.innerHTML = await loadView("views/registrar-estudiante.html");
        await renderRegister();
    } else if (view === "#estudiantes") {
        content.innerHTML = await loadView("views/estudiantes.html");
        await renderStudents();
    } else {
        content.innerHTML = await loadView("views/inicio.html");
        await renderHome();
    }
}

async function render() {
    if (!api.getToken()) {
        await renderLogin(app);
        return;
    }

    const view = window.location.hash || "#inicio";
    await renderPrivateView(view);
}

window.addEventListener("hashchange", render);
window.addEventListener("auth-expired", () => navigate("#login"));
render();
