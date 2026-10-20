# Sveltia CMS encima del JSON de almarbra (prueba, 20/10/2026)

Qué es: un panel (formulario) en `/admin/` que lee y escribe los mismos
`data/site.json`, `data/about.json` y `projects/<slug>/project.json`. Sin
servidor: es un solo script ([Sveltia CMS](https://sveltiacms.app) 0.229.0,
por unpkg) más `admin/config.yml`, que dice qué campos enseña. El build copia
`admin/` a `dist/` (una palabra en `build/build.mjs`) y sigue pasando sin ✗.

- Publicado: https://meowrhino.github.io/almarbraSveltia/admin/
- En local: `npm run dev` → http://localhost:8000/admin/ en **Chrome o Edge**
  → «Trabajar con un repositorio local» → elegir la carpeta del repo. Escribe en
  el disco; el commit lo haces tú.

Cómo lo he probado: el panel en un Chrome con una copia del repo dentro del
navegador (OPFS: el selector de carpetas no se puede pulsar desde aquí, así que
le he dado la carpeta por código; para Sveltia es lo mismo). Cada fichero,
guardado desde el panel y comparado con el original, campo a campo y con
`validar` de `build/proyectos.mjs` contra `schema/`.

## 1. ¿Escribe nuestro JSON tal cual? Casi: sí en la forma, no en el formato, y hay dos trampas

Sin cambios no deja guardar (el botón está apagado), así que he cambiado una
letra de un título y he comparado el resto. En `roma`, `cuerpo-esquema`,
`agueda`, `site.json` y `about.json`:

| | |
|---|---|
| Idiomas por campo `{ "es", "en", "ca" }` | **sí**: un `object` con tres subcampos. No hace falta el i18n de Sveltia. Un idioma vacío no se escribe (`omit_empty_optional_fields`): `cuerpo-esquema` sigue sin `"ca"` en el título |
| Textos como lista de párrafos | **sí**: `list` con un subcampo `text`. En el panel, «Agregar párrafo» y arrastrar para ordenar. Los `\n` dentro de un párrafo se quedan |
| Fotos por número (`"3"`) | **sí**, como texto: una lista de números, uno por fila. Salen `["1", "2"]`, sin extensión. No enseña la foto (ver abajo) |
| Créditos, una persona por bloque | **sí** en la forma (`{ role, name, url }`); **no** «una por línea»: cada uno ocupa 5–9 líneas |
| `$schema` | se conserva; en un proyecto nuevo lo pone él (`hidden` con `default`) |
| Notas `_`, `_nota`, `_borrador` | se conservan, pero **pasan al final** del fichero |
| Orden de los campos | el del config (que es el de los JSON); el de `lists` (textil, foto) y el de los proyectos dentro, igual |
| Vacíos | se quitan: `"credits": []`, `"text": {}`, `"url": null`. Para el build da igual (todos son opcionales) |
| **Formato** | **no**: lo reescribe todo con `JSON.stringify(…, null, 2)`. Las listas cortas en una línea (`["10"]`, `{ "es": …, "en": … }`) se abren: `site.json` pasa de 37 a 82 líneas, `agueda` de 19 a 62. Si se pasara todo el repo, de 405 a 1.162 líneas |
| **Trampa 1: dos formas para un campo** | **pierde datos**. El esquema deja `role` como texto (`"Make up & hair"`) o por idioma; el panel solo sabe una forma (por idioma) y **borra el rol escrito como texto** al guardar. Le pasa a 9 proyectos (agueda, cap, helen, herdes, kaltbult, lula, sicky ×2, vein) |
| **Trampa 2** | lo mismo con `{ "project": "roma", "visible": false }` en `lists`: el panel solo sabe nombres de carpeta. Hoy no hay ninguno escondido |

Todo lo que ha escrito el panel pasa el esquema (`validar`: 0 errores).

**Para que el diff salga vacío**: (a) una sola forma por campo en las webs con
panel (el rol siempre por idioma, que ya es la regla de la casa; esconder un
proyecto con un campo en su `project.json` en vez de un bloque en `lists`), y (b)
pasar una vez todos los JSON por `JSON.stringify(…, null, 2)`, para que el
primer guardado desde el panel no cambie el fichero entero. Lo de (a) cambia el
esquema y lo de (b) el aspecto de los JSON para quien edita a mano: lo decide
manu. **No lo he hecho.**

## 2. Proyecto nuevo + su entrada en `lists`: sí, en dos pasos

1. «proyectos» → «Nuevo» → título y fotos → Guardar. Crea
   `projects/prueba-del-panel/project.json` (la carpeta sale del título en
   castellano, con `slug: {{fields.title.es}}`, y solo se puede cambiar al
   crearlo), con `$schema`, `title` y `photos`. Es el JSON de la casa, y pasa el esquema.
2. «la web» → «general y listas» → en la lista, «Selecciona una opción…» →
   el proyecto (salen por título). Lo añade al final de `projects`. Los chips son
   arrastrables para cambiar el orden; con el ratón simulado no he podido
   comprobarlo.

No se hace en un paso: un proyecto que no está en ninguna lista no sale (el
build avisa con ⚠). La descripción de la colección lo dice.

Lo que falta: **las fotos**. Hay biblioteca (ve las 194, por proyecto), y
Sveltia puede pasar a WebP al subir (`transformations`: webp, q85, ≤ 2000 px,
lo mismo que imgToWeb), pero **no sabe ponerles número** (1.webp, 2.webp…): las
sube con su nombre. Lo que haría falta: hacerlas con imgToWeb como hasta ahora
y subirlas a `projects/<slug>/img/`. Subir no lo he podido probar (el selector
de archivos del sistema no se puede pulsar desde aquí), y tampoco sé si la
carpeta de un proyecto recién creado aparece en la biblioteca antes de tener
una foto. Tampoco hay miniaturas en el formulario: las fotos son números.

Las listas (`textil`, `foto`) están escritas a mano en el config: una lista
nueva es tocar el config, no el panel.

## 3. El login

El panel publicado enseña tres botones: repositorio local, GitHub, token.

- **Token** (ya funciona, sin montar nada, 0 €): el cliente se hace en GitHub un
  *fine-grained token* solo para su repo con permiso de escribir en *Contents*, y
  lo pega una vez por navegador. Coste: nada; unos 5 minutos del cliente con una
  guía de pantallazos. Pega: caduca (la fecha la eligen ellos al crearlo) y
  hay que explicar qué es un token.
- **«Iniciar sesión con GitHub»** (lo normal para el cliente): necesita
  [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth), un Worker de
  Cloudflare pequeño, y una OAuth App de GitHub. Coste: 0 € (el plan gratis de
  Workers da 100.000 peticiones al día; un login son 2 o 3). Montarlo: una OAuth
  App en la cuenta de meowrhino (callback `https://<worker>.workers.dev/callback`)
  y el Worker con `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` y `ALLOWED_DOMAINS`.
  Luego, `base_url: https://<worker>.workers.dev` en `backend` del config. Unos 30 minutos
  la primera vez. **Un solo Worker sirve para todos los clientes**: en cada web
  nueva, su dominio a `ALLOWED_DOMAINS`. Pegas: las OAuth Apps de GitHub piden
  `repo` (acceso a todos los repos del cliente, no solo al de la web), y el
  token pasa por nuestro Worker. **No lo he desplegado**: falta que manu diga sí.
  Hasta entonces el botón de GitHub no funciona (sin `base_url` va a Netlify).
- **En la copia del cliente** hay que cambiar `repo:` en `admin/config.yml` por
  el suyo (`<su-usuario>/almarbra`). Sería un paso más en `TRASPASO.md`.
  Al guardar, el panel hace commit en su repo y Workers Builds publica, como
  cuando editan en GitHub.

## 4. ¿El config sale del esquema? Hoy se duplica; podría salir de él casi entero

`admin/config.yml` repite de `schema/` los nombres de campo, qué es obligatorio,
los tipos (texto, lista, bloque por idioma), los `pattern` y los `enum`, más o
menos una línea por campo. Si alguien añade un campo al esquema y no al config,
el panel no lo enseña pero lo conserva; si lo quita del esquema y no del config, el
build para con «no es un campo de aquí». No se rompe en silencio, pero son dos sitios.

El paso de uno a otro es mecánico: `string` → `string`, `$defs/texto` →
`object` con es/en/ca, `$defs/parrafos` → object de listas de `text`, lista de
números → lista con `pattern`, `enum` → `select`, `description` → `hint`.
Lo que el esquema no sabe y hay que decírselo aparte (unas 15 líneas):

- dónde vive cada cosa (colección de carpetas `projects/{{slug}}/project`, los
  dos ficheros de `data/`), el slug y el resumen;
- que `lists.*.projects` es una relación con la colección de proyectos;
- qué listas hay (`textil`, `foto`): el esquema dice «un mapa», el panel quiere
  campos fijos, así que salen de `site.json`;
- etiquetas cortas en castellano (o un `title` en cada campo del esquema);
- con `anyOf`, qué rama usar (y eso es justo la trampa del punto 1).

Sveltia acepta el config como JSON (YAML lo lee igual) o por código
(`CMS.init({ config })`), así que el build podría escribir
`dist/admin/config.yml` a partir de `schema/` con un script de unas 80 líneas.
**No lo he hecho**: primero hay que decidir lo del punto 1.

## Veredicto

**Recomiendo seguir**, con condiciones. Lo bueno: escribe nuestra forma de JSON
sin trucos (idiomas por campo, párrafos, fotos por número, una carpeta por
proyecto, `lists` con relación), pasa el esquema, no necesita servidor, en local
no hace falta login y el login por token ya funciona. Lo que no:

1. **Borra datos donde el esquema deja dos formas** (`role`, `visible`): antes de
   dárselo a nadie, una sola forma por campo.
2. **Reescribe el formato**: o aceptamos su formato (pasarlos todos una vez) o
   cada primer guardado es un diff enorme.
3. **Fotos**: siguen siendo imgToWeb + subir a mano a `img/`; el panel no pone
   los números ni enseña miniaturas en el formulario.
4. Login de verdad: el Worker de sveltia-cms-auth (0 €, ~30 min, uno para todos).

Para paral-lel62 (§6 de wordpress.md) lo que importa sí funciona: una carpeta
por evento, campos por idioma, relaciones. Las 1.425 entradas no las he probado.

Lo siguiente, si seguimos: decidir 1 y 2, probar a subir una foto en Chrome de
verdad, y generar el config desde `schema/`.
