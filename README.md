
## Pruebas automatizadas de interfaz

El workflow `Frontend Robot UI tests` ejecuta pruebas Robot Framework con Chromium en GitHub Actions. Verifica que la raíz abra el portal público, que el acceso lleve a la página de inicio de sesión y que el registro muestre el formulario de cuenta estudiantil.

Para ejecutarlas localmente, instala [Robot Framework Browser](https://robotframework-browser.org/) y sus dependencias de navegador:

```powershell
python -m pip install robotframework-browser
rfbrowser init
python -m http.server 8000
```

En otra terminal, desde la raíz del frontend:

```powershell
python -m robot --outputdir results/robot tests/robot/public_site.robot
```
