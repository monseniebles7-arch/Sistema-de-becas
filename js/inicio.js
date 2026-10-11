
const profileButton = document.getElementById("profile-button");
const profileSidebar = document.getElementById("profile-sidebar");
const sidebarOverlay = document.getElementById("sidebar-overlay");
const closeSidebarButton = document.getElementById("close-sidebar");
const logoutButton = document.getElementById("logout-button");
const userNameElement = document.getElementById("user-name");

// Mostrar el nombre guardado al iniciar sesión.
// La clave debe coincidir con la que utilice el login.
const storedName =
    localStorage.getItem("nombreUsuario") ||
    localStorage.getItem("nombre") ||
    sessionStorage.getItem("nombreUsuario");

if (storedName) {
    userNameElement.textContent = storedName;
}

function openSidebar() {
    profileSidebar.classList.add("open");
    sidebarOverlay.classList.add("open");

    profileSidebar.setAttribute("aria-hidden", "false");
    profileButton.setAttribute("aria-expanded", "true");

    closeSidebarButton.focus();
}

function closeSidebar() {
    profileSidebar.classList.remove("open");
    sidebarOverlay.classList.remove("open");

    profileSidebar.setAttribute("aria-hidden", "true");
    profileButton.setAttribute("aria-expanded", "false");
}

profileButton.addEventListener("click", openSidebar);
closeSidebarButton.addEventListener("click", closeSidebar);
sidebarOverlay.addEventListener("click", closeSidebar);

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeSidebar();
    }
});

// Cerrar sesión
logoutButton.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("nombreUsuario");
    localStorage.removeItem("nombre");

    sessionStorage.removeItem("token");
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("nombreUsuario");

    window.location.href = "../index.html";
});
