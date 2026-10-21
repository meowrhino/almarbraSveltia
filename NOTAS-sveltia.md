# Sveltia CMS encima del JSON de almarbra (laboratorio, 20–21/10/2026)

almarbraSveltia es una copia de almarbra para probar un panel (Sveltia CMS) en
las webs del estudio. **Es un experimento**: se usará a veces en una web para
probar. No entra en la receta y no cambia JAMstack (decidido por manu el
21/10/2026).

El panel está en `/admin/`. Es un formulario que lee y escribe los mismos
`data/site.json`, `data/about.json` y `projects/<slug>/project.json`, sin
servidor ([Sveltia CMS](https://sveltiacms.app) por unpkg).

- Publicado: https://meowrhino.github.io/almarbraSveltia/admin/
- En local, dos maneras:
  - `npm run dev` → http://localhost:8000/admin/ (la web construida).
  - Go Live en VS Code → `…/admin/` (sin build; es la del cliente, GUIA §0b).

  En las dos: Chrome o Edge → «Trabajar con un repositorio local» → la carpeta
  del repo. Escribe en el disco y el commit lo hace uno mismo.

Cómo lo he probado: el panel en un Chromium con una copia del repo dentro del
navegador (OPFS). El selector de carpetas del sistema no se puede pulsar desde
aquí, así que le doy la carpeta por código; para Sveltia es lo mismo. Guardo
desde el panel y comparo con el original, línea a línea.

## Cómo funciona Sveltia

Es una página en `/admin/`. Lee su config, pide los JSON a GitHub desde el
navegador, enseña un formulario y, al guardar, hace un commit en el repo. Ese
commit lanza el build de siempre. No tiene datos propios. Para escribir en
GitHub necesita un token del usuario: o un login con GitHub (hace falta un
Worker, `auth/`), o un token pegado a mano, o el modo local (sin GitHub).

## Estado

| | |
|---|---|
| Escribe nuestro JSON | **sí**: guardar solo cambia la línea tocada (los 18 ficheros y un evento) |
| Una forma por campo | **hecho**: `role` siempre por idioma, `visible` en cada `project.json` |
| Config del panel | **sale de `schema/`** (`build/panel.mjs`), en el build y en el navegador |
| Proyecto nuevo + `lists` | **sí**, en dos pasos |
| Fotos | **por nombre de archivo**: subir, miniaturas y ordenar en el panel; el build pasa JPG/PNG a WebP |
| Modo local con Go Live | **hecho** (sin login; solo Chrome/Edge) |
| Login con GitHub | **preparado** en `auth/` (GitHub App) y **sin desplegar**: falta el paso cero y los pasos de manu |
| Webs grandes (1.425 eventos) | va bien en local; el resto, **solo si un cliente lo pide** |
| Versión de Sveltia | fija en **0.229.0**: subirla a mano cada pocos meses, probando antes aquí |

## 1. Una sola forma por campo

El panel solo sabe una forma por campo: lo que el esquema dejaba de dos
maneras (`anyOf`), lo borraba al guardar.

- `role` siempre `{ "es", "en", "ca" }`: 14 roles de 9 proyectos pasados; el
  esquema ya no acepta el texto suelto.
- `visible` sale de `lists` a cada `project.json` (`true` por defecto). Un sí/no
  que no está, el panel lo escribe al guardar: sin `"default": true`,
  **escondía cada proyecto que se guardaba**.
- Si alguien vuelve a poner un `anyOf`, el build avisa (⚠) y publica sin panel.

## 2. Formato canónico

`npm run formato` deja cada JSON como lo escribe el panel:
`JSON.stringify(…, null, 2)`, campos en el orden del esquema, notas `_…` al
final, sin opcionales vacíos y con los sí/no escritos. Comprobado: cambiar una
letra desde el panel y guardar cambia solo esa línea, en los 18 ficheros (y otra
vez después de pasar las fotos a campos de imagen).

## 3. Login

**Decidido**: nuestro Worker, uno para todas las webs, **como GitHub App** (el
cliente la instala solo en su repo y el token solo abre ese). Si Sveltia no
acepta la GitHub App, se vuelve a la OAuth App (permiso «todos tus repos»,
explicado en la GUIA). Plan de emergencia: el token a mano. No se descarta un
Worker por cliente, pero no es el camino.

**Paso cero**: verificación en dos pasos en Cloudflare y GitHub de meowrhino.
Nada se despliega antes.

Todo lo demás está en `auth/README.md`: el Worker
([sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth), MIT, commit
`95733a9811`; leído: no guarda nada, comprueba el CSRF y solo da tokens a los
dominios de `ALLOWED_DOMAINS`), cómo crear la GitHub App y qué marcar.

- Coste: 0 €. Un login son 2 peticiones y se hace una vez por navegador.
- Riesgo: que alguien entre en el Cloudflare de meowrhino y cambie el Worker.
  Contra eso, el paso cero.
- El repo al que guarda el panel lo saca el build (`GITHUB_REPOSITORY` o
  `git remote get-url origin`): no hay que cambiar nada en la copia del
  cliente. Sin probar: que Workers Builds tenga el `origin`. Si no lo tiene,
  el build avisa (⚠) y publica sin panel.

## 4. El config sale de `schema/`

`build/panel.mjs` convierte cada campo del esquema en un campo del panel:

- el `title` es la etiqueta y la `description`, la ayuda;
- `required`, `pattern`;
- `enum` → desplegable;
- `format: "date"` → calendario;
- `$defs/parrafo` → caja de texto;
- `$defs/foto` → campo de imagen;
- un sí/no → casilla con su `default`.

El resto (colecciones, la relación de `lists`, el Worker, el WebP de lo que se
sube) son unas 30 líneas en el mismo archivo.

- **Publicado**: el build escribe `dist/admin/config.yml`.
- **Con Go Live** (sin build): `admin/index.html` no encuentra `config.yml` y
  hace el mismo config en el navegador, con `../schema/` y `../build/panel.mjs`.
- Go Live recarga la página al guardar cualquier archivo, y el panel guarda
  archivos. `admin/index.html` corta su aviso (un WebSocket en `…/ws`).
  **Sin probar con el Go Live de verdad** (no hay VS Code aquí): probado que se
  corta el WebSocket de `…/ws` y pasan los demás.

## 5. Fotos: por nombre de archivo (solo en las webs del experimento)

- `"photos": ["1.webp", "IMG_4032.jpg"]`. Lo mismo en `cover`, `map` y `groups`.
  Las 304 que había, pasadas de `"3"` a `"3.webp"`; la web sale igual, byte a byte.
- **En el panel**: campo de imagen con miniaturas, subir (arrastrar o
  *Explorar*) y ordenar arrastrando. Al subir, el panel la pasa a WebP ≤ 2000 px
  q85 (probado: un JPG de 3000 px entra como `IMG_4032.webp`, 2000 px, y en el
  JSON solo se añade esa línea).
- **El build pasa JPG y PNG a WebP** (lo que llega de Safari, que no sabe hacer
  WebP, o a mano). Las gira como la cámara (EXIF), las deja en ≤ 2000 px y q85,
  en `.cache/webp/`, y publica solo el WebP. Probado: una JPG de 3000 × 1964
  con orientación de iPhone sale de pie, 1309 × 2000, y la portada se hace bien.
  `3.jpg` y `3.webp` en la misma carpeta paran el build con un mensaje.
- La vista previa (Go Live) enseña las JPG/PNG tal cual, con su tamaño de verdad.
- La receta general sigue con fotos por número, sin extensión.

## 6. Webs grandes: lo que se midió (rama borrada)

Se probó en la rama `agenda-1400`, ya borrada; queda un parche
(`agenda-1400.patch`, en la carpeta de notas de la sesión). Era una agenda
inventada tipo paral-lel62 con 1.425 eventos: `agenda/<slug>/event.json` con
título y texto por idioma, fecha, hora, sala, tipo y `publish`, generada con un
script de unas 40 líneas.

| | |
|---|---|
| build sin agenda / con agenda | 0,94 s / 1,26 s (4.054 páginas) |
| panel local: leer 1.443 entradas | 0,6 s |
| abrir la lista (ordenada por fecha) | 23 ms |
| buscar en todo | ~1,2 s (131 resultados) |
| abrir / guardar un evento | 40 ms / ~1 s, diff de una línea |

Lo que sirvió:

- Una colección con orden por fecha, filtros «próximos» (`gte: '{{today}}'`)
  y «sin publicar», y agrupar por año.
- **Publicar con fecha**: un campo `publish` («publicar desde», calendario).
  El build no saca lo que tiene un `publish` futuro (una línea:
  `agenda.filter((e) => !e.publish || e.publish <= hoy)`). Un build cada noche
  lo publica cuando llega el día.
  - En nuestra copia: `on: schedule: - cron: '0 4 * * *'` en la Action.
  - En Workers Builds no hay cron: una Action con cron que lance el build por
    la API de Cloudflare, o un Worker con Cron Trigger. Sin probar.

**Sin probar, solo si un cliente lo pide** (decisión de manu):

- la primera carga desde GitHub con ~1.400 archivos;
- los borradores con revisión (`publish_mode: editorial_workflow`): solo con
  GitHub; cada borrador es una rama y un pull request, y «publicar» es hacer
  merge;
- publicar con fecha en Workers Builds.

## Versión de Sveltia

Fija en **0.229.0** en `admin/index.html`. Sveltia saca versiones casi cada día
(el 20/10, la 0.249). Se sube a mano cada pocos meses, probando antes en este
repo: guardar un proyecto y mirar que el diff sea de una línea.

## Si algún día sale del laboratorio

- El esquema manda: sin `anyOf`, un `title` por campo, los sí/no con `default`,
  `$defs/foto` y `$defs/parrafo` con nombre.
- Los JSON en el formato del panel desde el principio (`npm run formato`).
- `admin/index.html` y `build/panel.mjs`; el build escribe `dist/admin/config.yml`.
- Un solo Worker de login (GitHub App) para todo el estudio, en su propio repo.
- Lo aprendido se podría juntar en un repo `jamstackSveltia` (manu lo ofreció;
  preguntar antes si público o privado).
