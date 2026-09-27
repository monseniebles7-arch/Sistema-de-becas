import { api } from "./api.js";
import { renderLogin, renderActiveAdmin } from "./auth.js";
import { renderHome } from "./inicio.js";
import { renderStudents } from "./estudiantes.js";
import { renderRegister } from "./registrar-estudiante.js";
import { loadView } from "./ui.js";

const app = document.querySelector("#app");

function navigate(view) {
    if (window.location.hash !== view) {
        window.history.pushState(null, "", view);
    }
    render(view);
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

    const editMatch = view.match(/^#editar-estudiante\/(\d+)$/);
    if (view === "#registrar" || editMatch) {
        content.innerHTML = await loadView("views/registrar-estudiante.html");
        await renderRegister(editMatch ? Number(editMatch[1]) : null);
    } else if (view === "#estudiantes") {
        content.innerHTML = await loadView("views/estudiantes.html");
        await renderStudents();
    } else {
        content.innerHTML = await loadView("views/inicio.html");
        await renderHome();
    }
}

async function render(view = window.location.hash || "#inicio") {
    if (!api.getToken()) {
        await renderLogin(app);
        return;
    }

    await renderPrivateView(view);
}

app.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;

    const view = link.getAttribute("href");
    if (!["#inicio", "#estudiantes", "#registrar", "#login"].includes(view)) return;

    event.preventDefault();
    navigate(view);
});

window.addEventListener("hashchange", () => render());
window.addEventListener("popstate", () => render());
window.addEventListener("auth-expired", () => navigate("#login"));
render();
