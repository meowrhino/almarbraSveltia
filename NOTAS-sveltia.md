# Sveltia CMS encima del JSON de almarbra (laboratorio, 20/10/2026)

almarbraSveltia es una copia de almarbra para ver si un panel (Sveltia CMS)
sirve para las webs del estudio. El panel está en `/admin/`: un formulario que
lee y escribe los mismos `data/site.json`, `data/about.json` y
`projects/<slug>/project.json`, sin servidor ([Sveltia CMS](https://sveltiacms.app)
0.229.0 por unpkg, con la versión fija).

- Publicado: https://meowrhino.github.io/almarbraSveltia/admin/ (hoy se entra
  con un token; con GitHub, cuando esté el Worker: punto 3).
- En local: `npm run dev` → http://localhost:8000/admin/ en Chrome o Edge →
  «Trabajar con un repositorio local» → la carpeta del repo. Escribe en el
  disco; el commit lo haces tú.

Cómo lo he probado: el panel en un Chromium con una copia del repo dentro del
navegador (OPFS; el selector de carpetas del sistema no se puede pulsar desde
aquí, así que le doy la carpeta por código: para Sveltia es lo mismo). Guardo
desde el panel y comparo con el original, línea a línea.

## Resumen

| | |
|---|---|
| Escribe nuestro JSON | **sí**, y guardar solo cambia la línea tocada (18 de 18 ficheros y un evento) |
| Una forma por campo | **hecho**: `role` siempre por idioma, `visible` en el `project.json` |
| Config del panel | **sale de `schema/`** (`build/panel.mjs`): ya no hay dos sitios |
| Proyecto nuevo + `lists` | **sí**, en dos pasos (ficha nueva y elegirla en la lista) |
| Login con GitHub | **preparado** en `auth/` y sin desplegar: falta el sí de manu |
| 1.425 eventos | **va bien en local**: carga 0,6 s, abrir 40 ms, guardar 1 s; build +0,3 s |
| Borradores y revisión | existen, pero **solo con GitHub**: sin probar |
| Publicar con fecha | campo `publish` + el build lo filtra + build cada noche (rama `agenda-1400`) |
| Fotos | subir funciona y **las pasa a WebP ≤ 2000 px** (como imgToWeb), pero escribe un nombre de archivo, no un número: **decisión de manu** |

## 1. Una sola forma por campo (hecho)

El panel solo sabe una forma por campo: lo que el esquema dejaba de dos maneras
(`anyOf`), el panel lo borraba al guardar.

- **`role` siempre por idioma**: 14 roles de 9 proyectos pasados de
  `"Make up & hair"` a `{ "es": …, "en": …, "ca": … }` (el mismo texto tres
  veces). El esquema ya no acepta el texto suelto.
- **`visible` sale de `lists`** y pasa a cada `project.json`: `"visible": true`
  (por defecto) o `false` (tiene su página, pero no sale en el mapa, las listas
  ni Google). `lists` ya solo tiene nombres de carpeta. La forma vieja para el
  build con un mensaje que dice dónde va ahora.
- **Trampa encontrada**: un sí/no que no está en el JSON, el panel lo escribe
  al guardar con su valor por defecto. Con `visible` sin `default`, guardar
  cualquier proyecto lo **escondía** (`"visible": false`). Ahora el esquema
  dice `"default": true` y el formato canónico lo escribe siempre.
- `GUIA.md` y `README.md`, al día. La web publicada sale **igual, byte a byte**
  (comparado `dist/` antes y después).

## 2. Formato canónico (hecho y comprobado)

`npm run formato` (`build/panel.mjs`) deja cada JSON como lo escribe el panel:
`JSON.stringify(…, null, 2)`, los campos en el orden del esquema, las notas
`_…` al final (por orden alfabético), sin los opcionales vacíos
(`"credits": []`, `"url": null`) y con los sí/no escritos. Pasados los 18
JSON una vez (405 → 1.217 líneas: las listas cortas ya no van en una línea).

**Comprobado**: en los 16 proyectos, `site.json` y `about.json`, cambiar una
letra desde el panel y guardar cambia **solo esa línea**. Desmarcar «visible»
cambia solo `"visible": false`. Un evento de la agenda (con fecha), lo mismo.

Quien edita a mano puede seguir escribiendo `["1", "2"]` en una línea: vale
igual, y la primera vez que se guarde desde el panel se abre en varias
líneas. `npm run formato` lo deja como el panel cuando haga falta.

## 3. Login con GitHub (preparado, sin desplegar)

`auth/` tiene el Worker [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth)
tal cual (MIT, commit `95733a9811` del 2/10/2026, leído: no guarda nada,
comprueba el CSRF y solo da el token a los dominios de `ALLOWED_DOMAINS`), su
`wrangler.jsonc` y los pasos en **`auth/README.md`**:

1. `npx wrangler deploy` en `auth/` (en el Cloudflare de meowrhino) → la dirección del Worker.
2. OAuth App en la cuenta de meowrhino (https://github.com/settings/applications/new),
   con callback `https://sveltia-cms-auth.<algo>.workers.dev/callback`.
3. El Client ID en `auth/wrangler.jsonc`; el secret con `npx wrangler secret put GITHUB_CLIENT_SECRET`.
4. Otra vez `npx wrangler deploy`.
5. `const AUTH = 'https://…workers.dev'` en `build/panel.mjs` → el build lo
   pone de `base_url`.

Coste: 0 € y unos 20 minutos, **uno para todas las webs** (cada web nueva, su
dominio en `ALLOWED_DOMAINS`). Pega: GitHub pide acceso a todos los repos del
cliente (las OAuth Apps no pueden pedir solo uno); quien no quiera, entra con
un token *fine-grained* de solo su repo.

**El repo de la copia ya no hay que cambiarlo a mano**: el build lo saca de la
Action (`GITHUB_REPOSITORY`) o de `git remote get-url origin`. Sin probar:
que Workers Builds (la copia del cliente) tenga el `origin` de git. Si no lo
tiene, el build avisa con ⚠ y publica sin panel.

## 4. El config sale de `schema/` (hecho)

`admin/config.yml` ya no existe en el repo: el build lo escribe en
`dist/admin/` con `build/panel.mjs`. Cada campo del esquema da un campo del
panel: el `title` es la etiqueta (se ha añadido un `title` en castellano a cada
campo del esquema; VS Code también lo enseña), la `description` es la ayuda,
`required`, `pattern`, `enum` → desplegable, `format: "date"` → calendario,
`$defs/parrafo` → caja de texto grande, `boolean` → casilla con su `default`.

Lo que el esquema no sabe y se queda en `build/panel.mjs` (unas 30 líneas):
dónde vive cada JSON (las colecciones), que los proyectos de una lista son
carpetas de `projects/` (la relación), el Worker del login y que las fotos
subidas se pasen a WebP. Las listas (`textil`, `foto`) salen de `site.json`:
una lista nueva aparece en el panel en el siguiente build.

Si alguien vuelve a poner un `anyOf` en el esquema, el build lo dice (⚠) y
publica sin panel: la web nunca depende del panel.

## 5. Rendimiento con 1.425 eventos (rama `agenda-1400`)

Una agenda inventada tipo paral-lel62: `agenda/<slug>/event.json` con título y
texto por idioma, fecha, hora, sala, tipo y `publish`
(`build/agenda-falsa.mjs`). En el panel: orden por fecha, filtros «próximos»
y «sin publicar», agrupar por año. En el build, una página sin diseño por
evento e idioma.

| | |
|---|---|
| build sin agenda / con agenda | 0,94 s / 1,26 s (4.054 páginas) |
| panel: leer 1.443 entradas (local) | 0,6 s |
| abrir la lista de la agenda | 23 ms (ordenada por fecha) |
| buscar «Orquestra 62» en todo | ~1,2 s, 131 resultados |
| abrir un evento | 40 ms |
| guardar | ~1 s; diff: solo la línea tocada |

**Sin probar**: la primera carga con GitHub (no en local). Sveltia baja el
repo por la API de GitHub y lo guarda en el navegador; con 1.400 ficheros
puede tardar decenas de segundos la primera vez. Se prueba en cuanto haya login
(punto 3), apuntando el panel a la rama `agenda-1400`.

Los datos están solo en la rama `agenda-1400`; main está limpio.

## 6. Flujo editorial y publicar con fecha

**Borradores y revisión**: Sveltia los tiene (`publish_mode: editorial_workflow`),
**solo con GitHub o GitLab, no en local**, así que no lo he podido probar.
Cada borrador es una rama y un pull request; «publicar» es hacer merge a
main. Con Workers Builds, cada rama tiene su URL de vista previa y el panel
la enseña (`preview_context`); con GitHub Pages, no hay vista previa por rama.
Para un equipo como el de paral-lel62 vale la pena probarlo con login.

**Publicar con fecha** (hecho en la rama): un campo `publish` («publicar
desde», con calendario); el build no saca lo que tiene un `publish` futuro
(95 de los 1.425 eventos esperan) y un build cada noche lo publica cuando
llega el día:

- en nuestra copia (Action), dos líneas en `.github/workflows/deploy.yml`:
  `on: schedule: - cron: '0 4 * * *'` (las 5–6 h en Madrid). Solo corre en main.
- en la copia del cliente (Workers Builds), no hay cron. O una Action con cron
  en su repo que lance el build por la API de Cloudflare (con un token de su
  Cloudflare guardado como secreto), o un Worker con Cron Trigger que haga lo
  mismo. Sin probar.

## 7. Fotos

**Probado** (en Chromium; en este Mac no hay Google Chrome): con un campo de
imagen en la ficha, se sube un JPG de 3000 px y queda
`projects/helen/img/foto-de-prueba.webp`, **WebP de 2000 × 1334 px, 58 KB**: lo
que hace imgToWeb, en el propio panel (`media_libraries` → `transformations`:
webp, q85, ≤ 2000 px). Se puede cambiar el nombre desde la biblioteca.

**El problema**: un campo de imagen escribe el **nombre del archivo**
(`"foto-de-prueba.webp"`), no el número sin extensión (`"3"`). Y desde la
biblioteca no se puede subir a la carpeta de un proyecto («Subir» está
apagado): solo desde un campo de imagen. Hoy `photos` son números, así que
el formulario no enseña las fotos ni deja subirlas. Dos salidas:

- **A. En las webs con panel, las fotos por nombre de archivo**
  (`"photos": ["1.webp", "foto-de-prueba.webp"]`). El build ya lo lee (quita el
  `.webp`); cambian el `pattern` del esquema y la regla «por número, sin
  extensión». A cambio: miniaturas en el formulario, subir y ordenar
  arrastrando, y no hace falta imgToWeb. Ojo: Safari no sabe hacer WebP y
  sacaría PNG (el build lo para con un mensaje claro).
- **B. Seguir con números**: las fotos con imgToWeb, numeradas a mano, subidas
  con GitHub o VS Code, y en el panel solo se escriben los números.

Recomiendo **A** para las webs con panel: es lo que más se nota para el
cliente. No lo he hecho, porque cambia una regla de la casa.

## Preguntas para manu

1. **Login (punto 3)**: ¿monto el Worker y la OAuth App? Los pasos 2 y 3
   (crear la app en tu GitHub y pegar el secret) son tuyos; los `wrangler
   deploy` los puedo lanzar yo con tu sí, cuando hayas hecho `npx wrangler login`.
2. **Fotos**: ¿A (por nombre de archivo, con subida y miniaturas en el panel) o
   B (números, como ahora)?
3. **Versión de Sveltia**: saca versiones casi cada día (hoy, la 0.249). La
   dejo fija (0.229.0) y propongo subirla a mano cada pocos meses, probando
   antes en este repo. ¿Vale?
4. **La rama `agenda-1400`**: ¿la dejo para la prueba con GitHub o la borro?

## Para la receta con panel (si seguimos)

- El esquema manda: sin `anyOf`, un `title` por campo, los sí/no con `default`.
  El config del panel sale de él en el build (`build/panel.mjs`).
- Los JSON en el formato del panel desde el principio (`npm run formato`).
- `admin/index.html` + el build escribe `dist/admin/config.yml`; un solo Worker
  de login para todo el estudio (`auth/`, que pasaría a su propio repo).
- Las fotos, según la pregunta 2.
- Para webs grandes (paral-lel62): una carpeta por entrada, `publish` + build
  cada noche y, si hay equipo, el flujo editorial. Falta probar la primera
  carga con GitHub.
