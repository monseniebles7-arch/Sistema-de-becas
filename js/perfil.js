
const userNameElement = document.getElementById("user-name");
const logoutButton = document.getElementById("logout-button");

// Mostrar el nombre guardado durante el inicio de sesión.
const storedName =
    localStorage.getItem("nombreUsuario") ||
    localStorage.getItem("nombre") ||
    sessionStorage.getItem("nombreUsuario");

if (storedName) {
    userNameElement.textContent = storedName;
}

// Cerrar sesión y regresar al login.
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
