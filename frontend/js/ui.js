export async function loadView(path) {
    const response = await fetch(path);
    if (!response.ok) {
        throw new Error("No se pudo cargar la pantalla.");
    }
    return response.text();
}

export function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

export function showMessage(message, type = "error") {
    return `<p class="mensaje-${type}" role="alert">${escapeHtml(message)}</p>`;
}
