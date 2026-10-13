# Frontend del Sistema de Becas

Este directorio contiene el cliente web estático. No requiere Flask, MySQL ni las dependencias de `requirements.txt` para ejecutarse.

## Configuración

Edita `config.js` si la API no está disponible en `http://localhost:5000`:

```js
window.APP_CONFIG = {
    apiBaseUrl: "http://localhost:5000"
};
```

La API debe permitir solicitudes CORS desde el origen donde se sirva este frontend. El token de autenticación se mantiene en `sessionStorage`.

## Ejecución local

Desde la raíz del proyecto:

```powershell
python -m http.server 8000 --directory frontend
```

Abre `http://localhost:8000` en el navegador. La API debe estar activa en paralelo.

## Alcance actual

- Inicio de sesión compartido para administradores y estudiantes, con registro de cuentas estudiantiles.
- Panel administrativo, resumen y gestión de estudiantes y solicitudes.
- Portal estudiantil con perfil, creación/actualización de borradores, carga de documentos e historial de solicitudes.

# Portal con acceso de estudiantes y administradores

El inicio público ofrece registro e inicio de sesión compartido. El inicio de sesión envía al estudiante a `#portal-estudiante` y al administrador a su panel existente. El formulario estudiantil genera una solicitud por separado y conserva su historial.

Para ejecutar esta versión, actualiza también el backend y aplica, en orden, `migrations/20260927_student_application.sql`, `migrations/20260930_student_portal.sql` y `migrations/20261013_application_constraints.sql`. Configura `frontend/config.js` para que `apiBaseUrl` apunte al backend activo.
