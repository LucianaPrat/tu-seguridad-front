# Summary 
Proyecto: UI de seguridad — monitoreo de eventos vía WebSocket + streaming de video no constante desde VDR de cámaras. Sin requerimientos de SEO, lógica compleja o renderizado de alta performance.

Frontend SPA en React 19 + TypeScript con Vite, usando Tailwind + shadcn/ui.

REST/cache: TanStack Query
Estado global: Zustand
Routing: React Router
Forms: react-hook-form + zod
Testing: Vitest + React Testing Library
Package manager: pnpm

Se evita Next.js, Redux, Bootstrap/CSS-in-JS y optimización excesiva porque el proyecto no requiere SEO, SSR ni alta complejidad.

# Menu

En el menu se muestran las opciones:
- Dashboard
- DVR configuration
- Camera monitor behavior configuration
- Events
- Canal de comunicacion
- 

# Auth

Typical user cases for auth. 
Use JWT. access and refresh token.
Endpoints to login and refresh token are http://localhost:3000/docs

## Login with username and password

Tyipical login with username and password. Username is the email registered.
Validation of email syntax.

## Login with magic link

Ask to send an email to an email address . If the email address is registered (do not said it in the UI) , an email must be send to the email with a magic link that onces clicked will auto login into the platform. Send the email is a work on the API, also the process that happens once the link is clicked in the email , happens en the API. The UI must allow the field to enter the email and a button to click and let the user the instruction.

## Login with face-auth

we will use the face-auth package to login using the wizard. in this mvp just add a button similar to "Login with magic link" but named "Login with Face-Auth".

## Logout

Tyipical logout.

## Register

Requires name, lastname, email address, mobile phone, picture, contraseña, repetir contraseña, 

## Password recovery

Ask to send an email to an email address with a link to reset the password. If the email address is registered (do not said it in the UI) , an email must be send to the email with a link to an UI to change a password. Send the email is a work on the API, also the process that happens once the link is clicked in the email , happens en the API. The UI must allow the field to enter the email and a button to click and let the user the instruction. 

## Edit profile

Allows the user to change name , lastname , and picture. Also password can be changed in an special section of this page.

# Business features

## Initialization of DVR

Once the user is registered in the platform, the first step is to initalize the DVR.
Before allowing the user to jump into the home,  the user must initialize some values.

To initialize the DVR , the user must enter:
- url
- username
- password
- zona horaria del DVR (UTC, UTC-1, GMT-3, etc)

Also a name for the space is requered to be entered.

Once the intialization is tested and works, the user is redirected to the dashboard.
If the parameters does not works, the system ask the user to correct them.

The information configured for the intialization can be edited accesing the menu item "DVR configuration". 

## DVR configuration

Es un item del menu, que permite editar los valores inicializaos anteriores.
Antes de guardar una nueva configuración, alertar al usuario que las configuraciones de cada camara se pueden perder.

## Dashboard

Se muestran las camaras que brinda el DVR.
Se muestra una miniatura de la camara (foto), con el badge "Online" o "Offline" si la camara está activa o no (valores que devuelve la API). Si está online, se muestra un tiempo en minutos o horas, por ej "5 mins ago" o "1 hr ago" , que es cuando la foto se obtuvo.
Al pasar el mouse por la camara, esta va a modo realtime, reproduciendo el streaming. Son minuaturas, por lo que se muestran varias por fila y columna. Es una pantallazo rapido del estado de las camaras.

Cada camara debe configurarse el comportamiento. Si una camara no está configurada, se muestra con un badge o overlay acorde.

Además las camaras pueden activarse o desactivarse, si se desactivan, se muestran debajo colapsadas.

En el dahboard se muestra un boton discreto, para invitar a nuevos miembros a este espacio. Al clickear el boton , se redirigue al area de miembros del espacio, donde aparece un modal donde se ingresa el email de la persona a invitar y se envia un email para invitar. La persona invitada clickea el link en su email y se le crea un nuevo usuario y se lo asocia a este espacio. El link es de tipo magic link, puesto que la persona queda auto - logeada, y lo primero que le aparece es una UI para completar los datos de registro (nombre, apellido, etc). Hasta que no completa los datos de registro no puede ir al dashboard.

## Camera monitor behavior configuration

En esta seccion se puede configurar un nombre para la camara y como es que se monitorea cada camara.

La configuracion se realiza sobre una foto captura de la camara.

Una camara se puede monitorear total o parcial.
Si se seleciona total, todo evento identificado en la imagen de la camara genera una alerta. Una alerta puede ser intruso o sospechoso.

En caso de ser parcial, hay que seleccionar un area de la imagen de la captura de la camara, donde se desea monitorear, y luego se selecciona si es una intruso o un sospeechoso. Se pueden selecionar mas de un area en la imagen y asignar un nivel de alerta distinto.

## Events

En esta seccion se muestra el historico de eventos generados. Un evento es una alerta de una camara y un nivel de alerta, que se envio a traves de de un canal de comunicacion.
Se muestran filtros de fecha y nivel de alerta (intruso o sospechoso).

## Miembros del espacio

Se muestran los usuarios del sistema.
Los usuarios se muestran con email, activo y ultimo login.
Se muesta un boton similar al que aparece en el dashboard, para invitar a nuevos usuarios al espacio.

# Configuraciones

## Canal de comunicacion

Se configuran los canales de comunicacion. Los posibles canales son: llamada, whatsapp e email.

Por un lado se seleccionan los niveles de alerta y los canales de comunicacion asignados.

Por otro se seleccionan los usuarios registrados y se los habilita para recibir alertas ( se usa el mail y telefono del usuario cuando se registro).


