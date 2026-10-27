*** Settings ***
Library    Browser
Suite Setup    Start Test Browser
Suite Teardown    Close Browser
Test Teardown    Close Page

*** Variables ***
${BASE_URL}    %{FRONTEND_BASE_URL=http://127.0.0.1:8000}

*** Keywords ***
Start Test Browser
    New Browser    chromium    headless=${TRUE}
    New Context

Open Public Portal
    New Page    ${BASE_URL}
    Wait For Elements State    #public-hero-title    visible    timeout=15s

*** Test Cases ***
Root opens the public news and scholarship landing page
    Open Public Portal
    ${title}=    Get Text    #public-hero-title
    Should Contain    ${title}    oportunidad

Public login button opens the single login page
    Open Public Portal
    Click    .public-login-button
    Wait For Elements State    h1    visible    timeout=10s
    ${heading}=    Get Text    h1
    Should Contain    ${heading}    Inicio de Sesión
    ${url}=    Get Url
    Should Contain    ${url}    /login.html

Public registration button displays the student account form
    Open Public Portal
    Click    .public-register-button
    Wait For Elements State    #account-form    visible    timeout=10s
    Wait For Elements State    input[name="cedula"]    visible
