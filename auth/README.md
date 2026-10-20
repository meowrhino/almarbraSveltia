# auth/: el login con GitHub del panel

El panel (`/admin/`, Sveltia CMS) guarda en el repo del cliente con su cuenta de
GitHub. Para el botón «Iniciar sesión con GitHub» hace falta este Worker: recibe
a GitHub de vuelta, cambia el código por un token y se lo pasa al panel. **No
guarda nada**: el token se queda en el navegador de quien entra.

Es [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth) (MIT) tal
cual, en el commit `95733a9811` (2/10/2026). **Uno para todas las webs del
estudio.** Si el panel entra en la receta, este directorio pasa a su propio repo
(`meowrhino/sveltia-cms-auth`); aquí está para la prueba.

Coste: 0 € (plan gratis de Workers: 100.000 peticiones al día; un login son 2–3).

## Montarlo (una vez, ~20 minutos)

Lo hace manu, con su cuenta. Necesitas una terminal en `auth/`, y entrar en
Cloudflare con `npx wrangler login`.

1. **El Worker, vacío**: `npx wrangler deploy`. Al acabar dice su dirección:
   `https://sveltia-cms-auth.<algo>.workers.dev`. Apúntala.
2. **La OAuth App**, en GitHub con la cuenta de meowrhino:
   <https://github.com/settings/applications/new>
   - Application name: `meowrhino · panel`
   - Homepage URL: `https://github.com/meowrhino`
   - Authorization callback URL: `https://sveltia-cms-auth.<algo>.workers.dev/callback`
   - «Register application». Copia el **Client ID**; luego «Generate a new client
     secret» y copia el **secret** (solo se ve una vez).
3. **El Client ID**, en `auth/wrangler.jsonc` → `GITHUB_CLIENT_ID` (no es secreto).
4. **El secret**: `npx wrangler secret put GITHUB_CLIENT_SECRET` y pégalo cuando lo
   pida. No va en ningún fichero.
5. **Otra vez** `npx wrangler deploy`.
6. **El panel**: en `build/panel.mjs`, `const AUTH = 'https://sveltia-cms-auth.<algo>.workers.dev';`.
   Commit + push: el build lo pone como `base_url` en el config del panel.

Para probar: https://meowrhino.github.io/almarbraSveltia/admin/ → «Iniciar sesión con
GitHub» → GitHub pide permiso («meowrhino · panel quiere acceder a tus
repositorios») → dentro.

## Cada web nueva con panel

Su dominio (sin `https://`) a `ALLOWED_DOMAINS` en `auth/wrangler.jsonc` y
`npx wrangler deploy`. El panel de un dominio que no está ahí no puede entrar
(es lo que impide que otra web use nuestro Worker y se lleve un token).

## Lo que pide a quien entra

GitHub enseña «acceso a repositorios públicos y privados» (`repo`): las OAuth
Apps de GitHub no pueden pedir un solo repo. El token es del cliente y se queda
en su navegador; el Worker no lo guarda. Si eso no convence a un cliente, le
queda el token (*fine-grained*, solo su repo): «Iniciar sesión con un token de
acceso» en el panel.
