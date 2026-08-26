# Live HLS — estado del debug, DVR / RTSP / MediaMTX

Handoff para retomar en sesión limpia. Todo lo probado, lo que funcionó, lo que
no, y lo que sigue.

Fecha del último trabajo: 2026-08-21.

---

## 1. Resumen en una línea

El pipeline completo (API → MediaMTX → hls.js → browser) está **correcto y
verificado punto por punto**. El bloqueante actual es que el **DVR emite H.264
corrupto por RTSP**: parameter sets in-band basura y slice headers ilegibles. No
se arregla en código.

---

## 2. Arquitectura (para no re-descubrirla)

**MediaMTX es un proceso aparte, un sidecar de Docker. No es una librería dentro
de la API NestJS.** RTSP entra desde el DVR, HLS sale al browser.

```
browser (hls.js)  --HLS + Bearer-->  MediaMTX :8888
                                        |  authMethod: http
                                        |  POST por playlist Y por cada segmento
                                        v
                                     API :3000/api/v1/streaming/authorize
                                        |  verifica JWT, chequea cámara en DB
                                        v
MediaMTX  --RTSP on demand-->  DVR 192.168.1.250:554
```

### Cómo autentica MediaMTX

MediaMTX **nunca descifra el JWT**. No tiene DB ni `JWT_SECRET`. Con
`authMethod: http` hace un POST por cada request:

```json
{ "action": "read", "path": "<camera-id>", "token": "<credencial vista>", "protocol": "hls" }
```

HTTP 200 = pasa, cualquier otra cosa = deny. `token` es copia literal del valor
del header `Authorization: Bearer`, o del password si viene por Basic. No lo
parsea.

Quien decide:

- `src/cross/common/access-token.ts` → `verifyAccessToken()`: firma con
  `JWT_SECRET`, rechaza `type: refresh`, exige `spaceId` y `role`
- `src/modules/streaming/live-stream.service.ts` → `authorize()`: exige
  `action === "read"`, `protocol === "hls"`, `profileCompleted`, y que la cámara
  exista en ese space y esté habilitada

Detalles que importan:

- El path name **es el camera id** y no es secreto: se autoriza cada segmento
- Memo de 3s (`AUTHORIZATION_MEMO_TTL_MS`) porque el hook dispara por segmento
- `authHTTPExclude` **tiene que conservar `action: api`** o la propia API recibe
  401 al registrar paths (comprobado: al sacarlo, el registro devuelve 401)

### Front

`src/components/camera/LiveThumbnail.tsx` monta hls.js solo mientras hay hover.
Un `<video src>` no puede poner headers, así que el token va por
`xhrSetup`, leído de `sessionStore` en cada request (no capturado en el closure,
para que un refresh a mitad de stream no deje los segmentos con el token viejo).

### Back: cómo se arma la URL RTSP

`src/modules/dvr/http-dvr-client.service.ts:166` `streamUrl()`:

```
rtsp://<user>:<pass>@<host>:<DVR_RTSP_PORT>/Streaming/Channels/<canal><stream>
```

`stream` = `1` main, `2` sub, elegido por `DVR_RTSP_STREAM` (default `sub`).
**Hoy no está seteado en `.env`.**

`src/modules/streaming/mediamtx-stream-publisher.service.ts:58` registra el path
con `POST /v3/config/paths/replace/{name}`:

```json
{ "source": "<rtsp url>", "sourceOnDemand": true, "sourceOnDemandCloseAfter": "10s" }
```

---

## 3. Entorno

| Qué | Dónde |
|---|---|
| Front | `/home/daniel/Documents/i+d/paulina-camaras/code/tu-seguridad-front`, branch `develop` |
| Back | `/home/daniel/Documents/i+d/paulina-camaras/code/tu-seguridad-back` |
| API | `http://localhost:3000/api/v1` |
| Front dev | `http://localhost:8443` — **exacto**, ver §7 |
| MediaMTX HLS | `http://127.0.0.1:8888` |
| MediaMTX Control API | `http://127.0.0.1:9997` (solo loopback) |
| Imagen | `bluenviron/mediamtx:1.20.1` |
| DVR | Hikvision `DVR-208G-M1` @ `192.168.1.250`, RTSP 554 |
| Firmware DVR | `V4.71.410` build 230918 · encoder `V5.0` build 230916 |
| SDP server string | `HIK Media Server V4.71.410` |

### Archivos del sidecar

Viven en la branch del back **`build/mediamtx-sidecar`** (PR #56, `MERGEABLE /
CLEAN`, local == remote en `bbe96b7`):

- `docker/mediamtx.yml`
- `docker-compose.yml`
- `scripts/mediamtx.sh` (`up | down | restart | logs | check | env`)

**Ojo:** el working tree del back quedó en `feat/space-members-api` con trabajo
sin commitear (módulo members). Esos tres archivos **no están en disco** ahí. El
container sigue corriendo, pero su bind mount apunta a `./docker/mediamtx.yml`,
que no existe en esa branch: un `up -d --force-recreate` desde ahí fallaría o
arrancaría con defaults (**sin autorización**).

### Config de MediaMTX cargada (verificada por Control API)

```
authMethod        = http
authHTTPAddress   = http://host.docker.internal:3000/api/v1/streaming/authorize
authHTTPExclude   = [action:api, action:metrics, action:pprof]
hlsVariant        = fmp4
hlsAllowOrigins   = ['http://localhost:8443']
hlsAlwaysRemux    = false
rtsp/rtmp/webrtc/srt/moq = no
```

---

## 4. Bloqueante actual: el DVR manda H.264 corrupto

### Evidencia 1 — el SDP está bien, el wire no

SDP de la cámara (canal 3, sub):

```
m=video 0 RTP/AVP 96
a=rtpmap:96 H264/90000
a=fmtp:96 profile-level-id=4D0014;packetization-mode=0;sprop-parameter-sets=Z2QAC6wbGoFgloQAAC7gAAV+QBA=,aO48sA==
```

Decodificado:

```
SPS (SDP, correcto):  67 64 00 0b ac 1b 1a 81 60 96 84 00 00 2e e0 00 05 7e 40 10   High, 352x288
PPS (SDP, correcto):  68 ee 3c b0
```

Lo que realmente viaja in-band, capturado con
`filter_units=pass_types=7|8`, 7 veces en 6 segundos:

```
SPS (wire, BASURA):   67 ee eb 9d 4b 31 20 db ee 49 61 db 03 b8 79 72 32 05 7e 40 10
PPS (wire, correcto): 68 ee 3c b0
```

`profile_idc = 0xEE = 238`. **No existe ese perfil en H.264.** 21 bytes contra 20
del real. El PPS coincide exacto; solo el SPS está roto.

Dos implementaciones independientes (el depacketizer de ffmpeg y
MediaMTX/gortsplib) producen **basura byte por byte idéntica** → es lo que hay en
el cable, no un bug de parser.

### Evidencia 2 — por eso el browser no reproduce

MediaMTX prefiere el SPS in-band sobre el del SDP. Resultado:

```
avcC del init segment:  01 ee eb 9d ff e1 00 15 67 ee eb 9d 4b 31 20 db ...
ffprobe del init:       width 32  height 64
master playlist:        #EXT-X-STREAM-INF:...,CODECS="avc1.eeeb9d",RESOLUTION=32x64
```

`MediaSource.isTypeSupported('video/mp4; codecs="avc1.eeeb9d"')` es `false` en
todo browser. hls.js aborta **antes de pedir un solo segmento**. En consola:

```
[live] <camera-id> mediaError/manifestIncompatibleCodecsError
```

### Evidencia 3 — la corrupción va más profundo que el SPS

Los slice headers referencian PPS ids `1, 2, 3, 5, 6, 9, 10, 19, 24, 82` al
azar. El DVR solo transmite PPS `0`.

`first_mb_in_slice`, `slice_type` y `pic_parameter_set_id` se leen como
exp-Golomb al principio del slice header, **sin depender del SPS activo**. Ids
al azar prueban que los bits del slice son basura, no que el SPS los desalinee.

En el main stream (canal `301`) la firma es `illegal POC type 5` —
`pic_order_cnt_type` legal va de 0 a 2.

### Evidencia 4 — ni ffmpeg saca una imagen

ffmpeg **sí** usa el SPS bueno del SDP y aun así no decodifica nada. Sesión
única, 30 segundos, nada más tirando del DVR:

```
273 errores de decode
73  decode_slice_header error
37  no frame!
36  Missing reference picture
31  number of reference frames exceeds max (probably corrupt input)
30  Error submitting packet to decoder: Invalid data found
28  A non-intra slice in an IDR NAL unit
```

Todos los frames muestreados: **verde plano**, sin imagen. Muestreo cada 4-5s
sobre 14s y 30s.

### Evidencia 5 — el path JPEG está sano

Los snapshots del dashboard salen perfectos. Van por ISAPI HTTP JPEG, otro
encoder, otro camino. **Por eso las miniaturas se ven bien y el live no.**

`GET /ISAPI/Streaming/channels/302` confirma la config aplicada:

```xml
<videoCodecType>H.264</videoCodecType>
<videoResolutionWidth>352</videoResolutionWidth>
<videoResolutionHeight>288</videoResolutionHeight>
<videoQualityControlType>VBR</videoQualityControlType>
<vbrUpperCap>200</vbrUpperCap>
```

`/ISAPI/Security/streamEncryption` → `Can't locate the url`. **Encriptación de
stream descartada.**

---

## 5. Probado y NO funcionó

| Intento | Resultado |
|---|---|
| `DVR_RTSP_STREAM=main` (canal `301`) | Igual de roto. `illegal POC type 5`. No es workaround |
| UDP en vez de TCP | Igual de roto. Emite más frames, todos verdes |
| Sesión única sin contención (30s) | Misma tasa de error. No es sobre-suscripción del DVR |
| `-c copy` + `filter_units=remove_types=7` (sacar el SPS in-band para que MediaMTX caiga al del SDP) | mp4 sin `moov`, `non-existing PPS 2` persiste. Inútil: los slices también están corruptos |
| Transcodificar `libx264 -preset ultrafast` | Produce un avcC **válido** (`avc1.42c00c`, Constrained Baseline 1.2, 352x288) a 2% de CPU — pero el video sigue verde. Basura entra, basura sale |
| `hlsVariant: fmp4` | Necesario cuando era H.265, no es el problema |
| Cambiar encoding del canal a H.264 en el DVR | **Sí arregló** el crash del muxer (ver §6), no la corrupción |

---

## 6. Probado y SÍ funcionó / descartado como causa

### H.265 → H.264: arregló un crash real

Antes, el sub-stream era H.265. Los logs, idéntico en las 5 cámaras:

```
stream is available and online, 2 tracks (H265, G711)
skipping track 2 (G711)
is converting into HLS, 1 track (H265)
no UDP packets received, switching to TCP
muxer error: unable to extract DTS: not enough bits    <- muere a los ~3s
```

El master playlist se servía apenas se creaba el muxer, **sin un solo segmento
producido** — por eso `curl index.m3u8` daba 200 y el video nunca arrancaba:
hls.js pedía la variante y el muxer ya estaba destruido.

Con H.264 el muxer sobrevive y emite `seg0`, `seg1`. **Ese problema se fue.**

Esto también respondió el ítem abierto "Codec verification" de
`docs/decisions/002-hls-live-streaming.md`.

### cookieCheck / CORS: DESCARTADO

MediaMTX redirige a `?cookieCheck=1` con:

```
HTTP/1.1 302 Found
Set-Cookie: cookieCheck=1; HttpOnly; Secure; SameSite=None; Partitioned
Access-Control-Allow-Origin: http://localhost:8443
```

Falta `Access-Control-Allow-Credentials`, lo que **parece** fatal para XHR
cross-origin. **No lo es.** El browser recibió **200 OK** en
`index.m3u8?cookieCheck=1` con un Bearer válido. El redirect solo ocurre cuando
la auth falla — MediaMTX lo usa para decidir cómo pedir credenciales. Con token
válido sirve directo.

Trampa en la que caí: probé el redirect con un token **inválido**, donde 302 y
401 son indistinguibles. No repetir.

### Auth completa: verificada punto por punto

- Bearer header → el hook recibe `token: "<jwt>"` ✅
- Basic `cualquiera:<jwt>` → `token: "<jwt>"` (MediaMTX copia el password) ✅
- `?jwt=<x>` → `token: ""`, cae en `query` que el DTO descarta ❌ doblemente muerto
- `WWW-Authenticate: Basic realm="mediamtx"` sale en todo 401 y es lo que
  dispara el diálogo del browser. No significa que espere un password
- `authHTTPExclude` sin `action: api` → el registro de paths da 401. Verificado
  rompiéndolo a propósito

---

## 7. Gotchas operativos (arrastrar a la próxima sesión)

- **`docker compose restart` NO recarga un config bind-mounted.** Hay que
  `up -d --force-recreate`. Esto ya causó un incidente: el container quedó
  llamando a un hook de debug muerto y **todo daba 401**, mientras
  `scripts/mediamtx.sh check` reportaba verde. Un 401 no distingue "el hook
  rechazó" de "nunca se llegó al hook", y v1.20.1 no loguea nada a nivel `info`.
  Arreglado en `bbe96b7`: el check ahora lee `authHTTPAddress` del proceso vivo
  por Control API y compara contra el yml.
- **MediaMTX en Docker no puede recibir RTP por UDP.** Solo 8888 y 9997 están
  publicados; los puertos efímeros que el cliente RTSP negocia, no. Siempre cae
  a TCP interleaved (`no UDP packets received, switching to TCP`). No es la causa
  actual (UDP está igual de roto) pero importa si alguna vez hace falta. Fixes:
  correr el binario nativo, o usar el contexto `default` (dockerd real) con
  `network_mode: host`. **Docker Desktop en Linux es VM-backed, así que
  `network_mode: host` es un no-op silencioso** — bindea nada y MediaMTX loguea
  "started with listener on :8888" igual.
- **Entrar al front por `http://localhost:8443` exacto.** `hlsAllowOrigins` es
  ese origin literal y Vite escucha en `0.0.0.0`; por IP de LAN todos los
  requests HLS fallan por CORS sin explicación clara.
- `POST /v3/config/paths/delete/{name}` da 404. El verbo correcto es `DELETE`.
- Una imagen puede aparecer dos veces en `docker images` con dos tags
  (`1.20.1` y `latest`) y el mismo digest. Es una sola imagen, un solo container.
- El `ADMIN_PASSWORD` del `.env` del back fue rotado a mitad de sesión.
  `/auth/login` con el viejo da 401.
- El access token vive 15 min. **Sigue sin haber interceptor de auto-refresh en
  401 en el front.** Hace falta antes de que alguna pantalla consuma endpoints
  protegidos en serio.
- El refresh token es cookie HttpOnly, el access token vive solo en memoria en
  `sessionStore`. Deliberado, no mover a localStorage.
- Control API de MediaMTX (`:9997`) no autentica a nadie. Solo loopback, nunca
  interfaz pública.

---

## 8. Próximo a probar, en orden

1. **Reiniciar el DVR.** El encoding se cambió en vivo; este firmware
   probablemente necesita restart para emitir parameter sets consistentes. Lo más
   barato y lo más probable.
2. **Contrastar con un cliente independiente.** VLC sobre
   `rtsp://<user>:<pass>@192.168.1.250:554/Streaming/Channels/302`. Si VLC
   también sale verde, es el DVR sin discusión.
3. **Subir el bitrate del sub-stream:** `Max. Bitrate` 200 → 512 Kbps, y
   `Video Type: Video Stream` (sin audio G711, que MediaMTX descarta igual).
   200 Kbps en CIF/15fps con calidad Medium es muy justo; estos encoders emiten
   slices malformados cuando no llegan al cap.
4. **Cambiar la resolución del sub-stream** fuera de CIF: 704×576 o 640×360.
5. **Firmware.** `V4.71.410 build 230918` es de septiembre 2023. Buscar update
   para `DVR-208G-M1`.
6. **Revisar el canal analógico en sí.** El path JPEG prueba que el sensor y el
   encoder-para-JPEG funcionan; no prueba nada del encoder H.264.
7. **Fallback si el DVR no se arregla:** pseudo-live refrescando el snapshot
   ISAPI cada ~1s durante el hover. Ese path está demostradamente sano. Cuesta
   reusar la captura de snapshot existente y un `setInterval` en
   `LiveThumbnail.tsx`. No es video real, pero da movimiento.

Nota sobre transcodificar: **no lo intentes como fix de esto.** Ya está medido —
produce un codec string válido y video verde. Solo tendría sentido si el DVR
empieza a emitir H.264 correcto pero con parameter sets que MediaMTX no digiere,
o si vuelve a H.265. En ese caso el patrón es `runOnDemand` con ffmpeg
publicando al propio MediaMTX, lo que exige `rtsp: yes` en el yml y la imagen
`bluenviron/mediamtx:1.20.1-ffmpeg`.

---

## 9. Comandos de diagnóstico útiles

```bash
# Config viva de MediaMTX (lo que el proceso realmente cargó, no el yml)
curl -s http://127.0.0.1:9997/v3/config/global/get | tr ',' '\n' | grep -i 'authHTTP\|hlsAllow\|hlsVariant'

# Paths registrados y si están sirviendo
curl -s http://127.0.0.1:9997/v3/paths/list | python3 -c 'import json,sys
for p in json.load(sys.stdin)["items"]: print(p["name"], p["ready"], p["bytesReceived"])'

# Source RTSP de un path (trae credenciales — enmascarar antes de pegar)
curl -s http://127.0.0.1:9997/v3/config/paths/get/<camera-id> \
 | python3 -c 'import json,sys,re;print(re.sub(r"//[^@]*@","//***@",json.load(sys.stdin)["source"]))'

# Logs del muxer
docker logs --tail 60 mediamtx

# SDP crudo del DVR
ffmpeg -loglevel trace -rtsp_transport tcp -i "$SRC" -t 0.2 -f null - 2>&1 \
 | grep -iE 'sprop|fmtp|rtpmap'

# SPS/PPS in-band reales del cable
ffmpeg -rtsp_transport tcp -i "$SRC" -t 6 -c copy \
  -bsf:v 'filter_units=pass_types=7|8' -f h264 -y ps.h264
# después: partir por start codes 00000001 y hexdump cada NAL

# ¿Sale imagen de verdad?
ffmpeg -rtsp_transport udp -i "$SRC" -t 14 -vf fps=1/4 -y f_%02d.png

# Codec string que ve el browser, por cámara (necesita Bearer válido)
curl -sL "http://127.0.0.1:8888/<camera-id>/index.m3u8" \
  -H "Authorization: Bearer $TOK" -H 'Origin: http://localhost:8443' | grep STREAM-INF

# Config del canal en el DVR
curl -s --digest -u "$CRED" "http://192.168.1.250/ISAPI/Streaming/channels/302"
```

---

## 10. Estado del código

### Front — sin commitear

`src/components/camera/LiveThumbnail.tsx`: los errores fatales de hls.js ya no
se comen en silencio, se loguean con tipo, detalle y status HTTP. Antes un
stream muerto y uno lento eran indistinguibles, que es por qué este bug tardó
tanto en mostrarse.

`pnpm verify` verde: typecheck, lint, 110 tests, build.

### Front — ya mergeado (plan `panel-camaras-api-live-hover.md`)

Dashboard sobre la API real, hover live con hls.js, `useCameraLive` con
`retry: false` **y `retryOnMount: false`** (el `staleTime` no aplica a queries
en error, así que sin lo segundo re-fetchea en cada hover), `InviteModal` contra
`POST /invitations`, deep-link `?camera=<id>` a `/cameras/monitor`, entrada
duplicada del Sidebar eliminada.

### Back — branch `build/mediamtx-sidecar`, PR #56 abierto

`docker/mediamtx.yml`, `docker-compose.yml`, `scripts/mediamtx.sh`, y una
sección nueva en el `README.md` que arranca con "MediaMTX is a separate process,
not a library in this API".

Ambos PRs necesitan review de alguien que no escribió el código; `PR.md` prohíbe
self-approve y self-merge.

### Invocación de pnpm en esta máquina

`mise` no está instalado aunque el repo trae `.mise.toml`. El node del shell es
v20, donde `pnpm test` muere con
`webidl.util.markAsUncloneable is not a function`.

```bash
source ~/.nvm/nvm.sh && nvm use 22 && \
  npm_config_manage_package_manager_versions=false \
  node /home/daniel/.nvm/versions/node/v20.19.6/lib/node_modules/pnpm/bin/pnpm.cjs verify
```

Corepack bajo node 22 resuelve pnpm 11, que aborta queriendo purgar
`node_modules` (`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`). Llamar al binario
instalado bajo node 20 saltea corepack; la env var evita el self-upgrade.

---

## 11. ROOT CAUSE ENCONTRADO — cifrado de stream de Hik-Connect (2026-08-21, sesión 2)

**No es el encoder del DVR. Es una opción de configuración.**

```
GET /ISAPI/System/Network/EZVIZ
  <enabled>true</enabled>
  <registerStatus>true</registerStatus>
  <serverAddress><hostName>litedev.sa.hilookview.com</hostName></serverAddress>
  <verificationCode>***</verificationCode>     <- credencial, no pegar en logs
  <streamEncrypteEnabled>true</streamEncrypteEnabled>   <- ESTO
```

`GET /ISAPI/System/capabilities` confirma soporte:
`<isSupportStreamingEncrypt>true</isSupportStreamingEncrypt>`

El endpoint que §4 probó (`/ISAPI/Security/streamEncryption`) no existe en este
firmware; la opción vive bajo el nodo **EZVIZ / Hik-Connect**. Por eso se
descartó cifrado por error.

### Por qué encaja con toda la evidencia previa

| Síntoma de §4 | Explicación |
|---|---|
| SPS in-band basura, largo 21 vs 20 | payload del NAL cifrado en bloque |
| PPS in-band **correcto** (`68 ee 3c b0`) | 3 bytes de payload, no llenan un bloque, quedan en claro |
| slice headers con PPS ids al azar | payload de slice cifrado |
| frames verde plano con el SPS bueno del SDP | los slices siguen cifrados |
| transcodificar da avcC válido y video verde | basura entra, basura sale |
| snapshots JPEG por ISAPI perfectos | otro path, no pasa por este cifrado |
| `illegal POC type 5` en main, `log2_max_frame_num_minus4 out of range: 32` en sub | firmas distintas del mismo payload cifrado |

### Evidencia nueva de esta sesión

SPS in-band de ch302, capturado con `filter_units=pass_types=7|8`:

```
sesión 1 (§4):  67 ee eb 9d 4b 31 20 db ee 49 61 db 03 b8 79 72 32 05 7e 40 10
sesión 2:       67 4c 64 78 81 6f f7 e8 42 9f 86 bc 28 e0 da 31 f6 15 f9 00 40
PPS ambas:      68 ee 3c b0
```

- **Estable** en 3 capturas consecutivas dentro de la misma sesión.
- **Cambia** entre sesiones separadas por un reinicio del encoder.
- Sin emulation-prevention bytes (no hay `00 00 03`): 21 bytes de payload crudo.
- No es el SPS bueno desplazado a bits ni XOR con constante — verificado
  offline contra `67 64 00 0b ac 1b 1a 81 60 96 84 00 00 2e e0 00 05 7e 40 10`.

Basura **estable pero distinta por arranque del encoder** = clave/IV derivada al
inicializar, no encoder corrupto. Un encoder roto produciría basura variable
dentro de la misma sesión.

### El fix

Poner `streamEncrypteEnabled` en `false`. Cambio de un campo, reversible.

```bash
CRED='<user>:<pass>'; H=192.168.1.250
curl -s --digest -u "$CRED" "http://$H/ISAPI/System/Network/EZVIZ" > ezviz.xml
sed -E 's#(<streamEncrypteEnabled>)true#\1false#' ezviz.xml > ezviz_off.xml
curl -s --digest -u "$CRED" -X PUT -H 'Content-Type: application/xml' \
  --data-binary @ezviz_off.xml "http://$H/ISAPI/System/Network/EZVIZ"
# verificar
curl -s --digest -u "$CRED" "http://$H/ISAPI/System/Network/EZVIZ" | grep -i streamEncrypte
```

Revertir: mismo PUT con `ezviz.xml` original.

**Trade-off:** quita el cifrado de aplicación de los streams que el DVR empuja a
la nube Hik-Connect. El acceso remoto por la app sigue funcionando. En LAN no
cambia nada. Puede requerir re-agregar el dispositivo en la app Hik-Connect.

Alternativa si el cifrado en la nube es requisito: `<enabled>false</enabled>` en
EZVIZ (deshabilitar Hik-Connect por completo, sin acceso remoto por app) — el
cifrado de stream deja de aplicarse.

### Después de aplicarlo, verificar en este orden

```bash
# 1. SPS in-band debe coincidir con el del SDP
ffmpeg -nostdin -rtsp_transport tcp -i "$SRC" -t 6 -c copy \
  -bsf:v 'filter_units=pass_types=7|8' -f h264 -y ps.h264
# esperado: 67 64 00 0b ac 1b 1a 81 60 96 84 00 00 2e e0 00 05 7e 40 10

# 2. imagen real, no verde
ffmpeg -rtsp_transport tcp -i "$SRC" -t 8 -vf fps=1/4 -y f_%02d.png

# 3. codec string que ve el browser: debe ser avc1.64000b, RESOLUTION=352x288
curl -sL "http://127.0.0.1:8888/<camera-id>/index.m3u8" \
  -H "Authorization: Bearer $TOK" -H 'Origin: http://localhost:8443' | grep STREAM-INF
```

Si el paso 1 sigue dando basura, **entonces** sí seguir con §8 (reiniciar DVR
primero — el cambio de encoding se hizo en vivo).

### Ojo con el verification code

`GET /ISAPI/System/Network/EZVIZ` devuelve `<verificationCode>` en claro. Es la
credencial de emparejamiento de Hik-Connect. Enmascararla siempre antes de pegar
salida en logs, issues o planes. Quedó expuesta en el log de la sesión 2 —
rotarla.

### §8 queda reordenado

Los pasos 3 (subir bitrate), 4 (cambiar resolución), 5 (firmware) y 6 (canal
analógico) atacaban un encoder que no está roto. Dejarlos como plan B.
El paso 7 (pseudo-live con snapshots ISAPI) probablemente ya no hace falta.

### CONFIRMADO — fix aplicado y verificado (2026-08-21)

`PUT /ISAPI/System/Network/EZVIZ` con `streamEncrypteEnabled=false` →
`statusCode 1 / OK`. Efecto inmediato, **sin reiniciar el DVR**.

Antes y después, SPS in-band de ch302:

```
antes:   67 4c 64 78 81 6f f7 e8 42 9f 86 bc 28 e0 da 31 f6 15 f9 00 40   (21 bytes, basura)
después: 67 64 00 0b ac 1b 1a 81 41 fa 10 00 00 bb 80 00 15 f9 00 40      (20 bytes, valido)
```

`64 00 0b` = High profile, level 1.1. Los primeros 8 bytes coinciden exacto con
el SPS del SDP. La cola difiere solo en VUI (`00 00 bb 80` = time_scale 48000
contra 12000 del `sprop-parameter-sets`): el sprop del SDP estaba viejo, no roto.

Decode de 10s con ffmpeg: **0 errores** (antes: 273). Tres frames muestreados de
~70 KB cada uno — verde plano pesaba 1-2 KB. Imagen real, vista IR nocturna con
overlay `08-21-2026 Vie 21:51:52 / Camera 03`.

ffprobe de los 5 canales:

| Path | Canal | Stream |
|---|---|---|
| `21b274e6…` | 302 | h264 High 320x240 @15fps |
| `499484a5…` | 402 | h264 High 320x240 |
| `6fce9055…` | 502 | h264 High 352x288 |
| `6c9007c5…` | 702 | h264 High 352x288 |
| `b542e035…` | 802 | h264 High 352x288 |

Fix device-wide, no por canal. Ojo: 302 y 402 dan 320x240 aunque
`/ISAPI/Streaming/channels/302` reporta 352x288 — el cable manda 320x240. No
importa para HLS, solo cambia el `RESOLUTION` del playlist.

**Paso 3 confirmado por el usuario:** el live sale en vivo y correcto en el
dashboard del front. Cadena completa verde: DVR → RTSP → MediaMTX → HLS → hls.js
→ browser. No hizo falta ni reiniciar el DVR ni transcodificar.

Queda una deuda menor de tooling: `/auth/login` con el `ADMIN_PASSWORD` del
`.env` sigue dando 401, así que el chequeo del codec string por curl no se pudo
correr desde script (§7, password rotado). Irrelevante para el bug, molesto para
diagnosticar el próximo.

**§8 queda obsoleto.** Ningún paso de esa lista hacía falta: no era el encoder,
no era el firmware, no era el bitrate, no era CIF, y el fallback de pseudo-live
con snapshots no se necesita.

**Higiene de credenciales pendiente:** el `verificationCode` de Hik-Connect y el
password de admin del DVR quedaron expuestos en claro durante el debug. Rotar
ambos.
