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

- Inicio de sesión administrativo.
- Resumen y listado de estudiantes.
- Carga de universidades.
- Registro de estudiantes.
- Cierre de sesión local.

Becas, pagos y documentos se incorporarán en una etapa posterior.
