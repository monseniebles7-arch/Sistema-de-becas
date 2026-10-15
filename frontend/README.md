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

Desde la raíz del repositorio:

```powershell
python -m http.server 8000
```

Abre `http://localhost:8000/` para ver las noticias y la información pública. El inicio de sesión está en `http://localhost:8000/login.html`; después de autenticarte, el portal se carga desde `frontend/index.html`. Si alguien abre `frontend/index.html#login`, será redirigido a `login.html`. La API debe estar activa en paralelo.

## Alcance actual

- Inicio de sesión compartido para administradores y estudiantes, con registro de cuentas estudiantiles.
- Panel administrativo, resumen y gestión de estudiantes y solicitudes.
- Portal estudiantil con perfil, creación/actualización de borradores, carga de documentos e historial de solicitudes.

# Portal con acceso de estudiantes y administradores

El inicio público ofrece registro e inicio de sesión compartido. El inicio de sesión envía al estudiante a `#portal-estudiante` y al administrador a su panel existente. El formulario estudiantil genera una solicitud por separado y conserva su historial.

Para ejecutar esta versión, actualiza también el backend y aplica, en orden, `migrations/20260927_student_application.sql`, `migrations/20260930_student_portal.sql`, `migrations/20261013_application_constraints.sql` y `migrations/20261013_student_province_admin_email.sql`. Después de la última migración, registra el correo de cada administrador en la columna `administradores.correo` para habilitar ese método de acceso. Configura `frontend/config.js` para que `apiBaseUrl` apunte al backend activo.
