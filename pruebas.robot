*** Settings ***
Library    RequestsLibrary

*** Variables ***
${URL}    http://127.0.0.1:5000

*** Test Cases ***
La Pagina Principal Carga Correctamente
    [Documentation]    Verifica que el servidor Flask responda correctamente
    Create Session    app    ${URL}
    ${respuesta}=    GET On Session    app    /
    Should Be Equal As Numbers    ${respuesta.status_code}    200

La Pagina Muestra Conexion Exitosa
    [Documentation]    Verifica que la base de datos esté conectada
    Create Session    app    ${URL}
    ${respuesta}=    GET On Session    app    /
    Should Contain    ${respuesta.text}    Conexión exitosa