import { api } from "./api.js";
import { renderLogin, renderActiveAdmin, renderRegistroCuenta } from "./auth.js";
import { renderHome } from "./inicio.js";
import { renderStudents } from "./estudiantes.js";
import { renderRegister } from "./registrar-estudiante.js";
import { renderStudentPortal, renderStudentProfile } from "./portal-estudiante.js";
import { loadView, showMessage } from "./ui.js";

const app = document.querySelector("#app");

function navigate(view) {
    if (window.location.hash !== view) window.history.pushState(null, "", view);
    render(view);
}

async function renderShell(role) {
    app.innerHTML = await loadView(role === "student" ? "views/shell-estudiante.html" : "views/shell.html");
    renderActiveAdmin();
    document.querySelector("#logout-button").addEventListener("click", () => {
        api.clearSession();
        navigate("#publico");
    });
}

async function renderPrivateView(view, role) {
    await renderShell(role);
    const content = document.querySelector("#view-content");
    if (role === "student") {
        const activeNav = view === "#perfil-estudiante" ? "profile" : view === "#solicitar" ? "apply" : "home";
        document.querySelectorAll("[data-student-nav]").forEach((link) => {
            const active = link.dataset.studentNav === activeNav;
            link.classList.toggle("active", active);
            if (active) link.setAttribute("aria-current", "page");
            else link.removeAttribute("aria-current");
        });
        if (view === "#solicitar") {
            let applications;
            try {
                applications = await api.misSolicitudes();
            } catch (error) {
                content.innerHTML = `<h2>Solicitar beca</h2>${showMessage(`No se pudo consultar el estado de tus solicitudes: ${error.message}. Verifica que el backend esté encendido y vuelve a intentarlo.`)}`;
                return;
            }
            const latest = applications[0];
            if (latest && !["rechazada", "borrador"].includes(latest.estado)) {
                content.innerHTML = '<div class="student-welcome"><h2>Tu solicitud está en proceso</h2><p>Solo puedes mantener una solicitud activa a la vez. Si el IFARHU la rechaza, podrás presentar otra solicitud.</p></div>';
                await renderStudentPortal(content);
                return;
            }
            content.innerHTML = await loadView("views/registrar-estudiante.html");
            await renderRegister(null, true);
        } else if (view === "#perfil-estudiante") {
            content.innerHTML = '<div class="student-welcome"><h2>Mi perfil</h2><p>Cargando tus datos...</p></div>';
            await renderStudentProfile(content);
        } else {
            await renderStudentPortal(content);
        }
        return;
    }
    const editMatch = view.match(/^#editar-estudiante\/(\d+)$/);
    if (view === "#registrar" || editMatch) {
        content.innerHTML = await loadView("views/registrar-estudiante.html");
        await renderRegister(editMatch ? Number(editMatch[1]) : null);
    } else if (view === "#estudiantes") {
        content.innerHTML = await loadView("views/estudiantes.html");
        await renderStudents();
    } else if (view === "#solicitudes") {
        content.innerHTML = '<h2>Solicitudes de beca</h2><div id="admin-applications">Cargando solicitudes…</div>';
        await renderStudentPortal(content, true);
    } else {
        content.innerHTML = await loadView("views/inicio.html");
        await renderHome();
    }
}

async function render(view = window.location.hash || "#publico") {
    if (!api.getToken()) {
        if (view === "#login") return renderLogin(app);
        if (view === "#registro") return renderRegistroCuenta(app);
        app.innerHTML = await loadView("views/publico.html");
        return;
    }
    const role = api.getRole();
    const allowed = role === "student" ? ["#portal-estudiante", "#perfil-estudiante", "#solicitar"]
        : ["#inicio", "#estudiantes", "#registrar", "#solicitudes"];
    if (!allowed.includes(view) && !/^#editar-estudiante\/\d+$/.test(view)) {
        view = role === "student" ? "#portal-estudiante" : "#inicio";
        window.history.replaceState(null, "", view);
    }
    await renderPrivateView(view, role);
}

app.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const view = link.getAttribute("href");
    if (!["#publico", "#login", "#registro", "#inicio", "#estudiantes", "#registrar", "#solicitudes", "#portal-estudiante", "#perfil-estudiante", "#solicitar"].includes(view)
        && !/^#editar-estudiante\/\d+$/.test(view)) return;
    event.preventDefault();
    navigate(view);
});

window.addEventListener("hashchange", () => render());
window.addEventListener("popstate", () => render());
window.addEventListener("auth-expired", () => navigate("#login"));
if (!window.location.hash) {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#publico`);
}
render(window.location.hash || "#publico");
