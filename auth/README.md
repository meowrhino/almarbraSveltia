# auth/: el login con GitHub del panel

El panel (`/admin/`, Sveltia CMS) guarda en el repo del cliente con su cuenta de
GitHub. Para el botón «Iniciar sesión con GitHub» hace falta este Worker: recibe
a GitHub de vuelta, cambia el código por un token y se lo pasa al panel. **No
guarda nada**: el token se queda en el navegador de quien entra. La contraseña
se escribe siempre en github.com.

Es [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth) (MIT) tal
cual, en el commit `95733a9811` (2/10/2026). **Uno para todas las webs del
estudio**, en el Cloudflare de meowrhino. Si el panel sale del laboratorio,
este directorio pasa a su propio repo.

Coste: 0 € (plan gratis de Workers: 100.000 peticiones al día; un login son 2,
una vez por navegador; guardar va directo a GitHub, sin pasar por aquí).

## Paso cero: verificación en dos pasos

Antes de nada, en las cuentas de **Cloudflare** y **GitHub** de meowrhino. Es lo
que protege de verdad: quien entrara en el Cloudflare podría cambiar el Worker
y quedarse con los tokens de los siguientes logins.

- GitHub: <https://github.com/settings/security> → *Two-factor authentication*.
- Cloudflare: *My Profile* → *Authentication* → *Two-Factor Authentication*.

## GitHub App (plan A) u OAuth App (plan B)

- **GitHub App**: el cliente la instala **solo en el repo de su web**, y el
  token solo abre ese repo. Es lo que decidió manu. Falta probar que Sveltia
  la acepta (con este mismo Worker debería: GitHub usa las mismas direcciones).
- **OAuth App**: lo que el Worker trae por defecto. GitHub pide «acceso a todos
  tus repositorios» (las OAuth Apps no pueden pedir uno). Si la GitHub App no
  va, esta.

## Montarlo (una vez, ~20 minutos)

Lo de GitHub y el secreto los hace manu con su cuenta; los `wrangler deploy`
los puede lanzar Claude con su sí, cuando `npx wrangler login` esté hecho.

1. **El Worker, vacío** (en `auth/`): `npx wrangler login` y `npx wrangler deploy`.
   Dice su dirección: `https://sveltia-cms-auth.<algo>.workers.dev`.
2. **La GitHub App**, en <https://github.com/settings/apps/new>:
   - GitHub App name: `meowrhino-panel`
   - Homepage URL: `https://github.com/meowrhino`
   - Callback URL: `https://sveltia-cms-auth.<algo>.workers.dev/callback`
   - **Expire user authorization tokens**: desmarcado (el panel no sabe renovarlos).
   - **Request user authorization (OAuth) during installation**: desmarcado.
   - Webhook → **Active**: desmarcado.
   - Permissions → Repository permissions → **Contents: Read and write**
     (Metadata: Read-only se pone sola). Nada más.
   - Where can this GitHub App be installed: **Any account**.
   - *Create GitHub App*. Copia el **Client ID** (empieza por `Iv`); luego
     *Generate a new client secret* y copia el **secret** (solo se ve una vez).
   - *Install App* (menú de la izquierda) → la cuenta meowrhino → **Only select
     repositories** → `almarbraSveltia`. Es para la prueba.
3. **El Client ID**, en `auth/wrangler.jsonc` → `GITHUB_CLIENT_ID` (no es secreto).
4. **El secret**: `npx wrangler secret put GITHUB_CLIENT_SECRET` y pégalo cuando
   lo pida. No va en ningún archivo.
5. **Otra vez** `npx wrangler deploy`.
6. **El panel**: en `build/panel.mjs`, `const AUTH = 'https://sveltia-cms-auth.<algo>.workers.dev';`.
   Commit + push: el build lo pone como `base_url` en el config del panel.

Para probar: https://meowrhino.github.io/almarbraSveltia/admin/ → «Iniciar sesión con
GitHub» → GitHub pide permiso → dentro → cambiar algo y guardar → tiene que
salir un commit en el repo.

Plan B (OAuth App): en el paso 2, <https://github.com/settings/applications/new>
con el mismo callback; el resto igual.

## Cada cliente nuevo con panel

1. Su dominio (sin `https://`) a `ALLOWED_DOMAINS` en `auth/wrangler.jsonc` y
   `npx wrangler deploy`. Un panel de un dominio que no está ahí no puede entrar
   (es lo que impide que otra web use nuestro Worker y se lleve un token).
2. El cliente instala la app en su repo: <https://github.com/apps/meowrhino-panel>
   → *Install* → **Only select repositories** → el de su web. Va en su GUIA.

El cliente puede quitar el acceso cuando quiera: GitHub → *Settings* →
*Applications*.
