/* El panel (Sveltia CMS, /admin/): sale de schema/, para que lo que se
   puede editar esté dicho en un solo sitio.

     config(...)     el config.yml del panel (el build lo escribe en
                     dist/admin/): un campo por cada uno del esquema, con su
                     «title» de etiqueta y su «description» de ayuda
     canonico(...)   un JSON tal como lo escribe el panel: los campos en el
                     orden del esquema, las notas «_…» al final, sin los
                     opcionales vacíos y con los sí/no siempre escritos

     node build/panel.mjs    (npm run formato) pasa data/ y projects/ a
                             ese formato, para que guardar desde el panel no
                             cambie nada más que lo que se ha tocado

   Lo que el esquema no sabe va aquí: dónde vive cada JSON y que los
   proyectos de una lista son carpetas de projects/ (RELACIONES). El
   panel no sabe pintar un campo con dos formas («anyOf»): si sale uno,
   config() lo dice y el build publica sin panel. */

/* El Worker del login con GitHub (auth/, uno para todas las webs; con null,
   se entra con un token o con la carpeta local). */
const AUTH = 'https://sveltia-cms-auth.manuellatourf.workers.dev';

const RELACIONES = {
  'lists.*.projects': {
    widget: 'relation', collection: 'projects', value_field: '{{slug}}', multiple: true,
    display_fields: ['{{title.es}}'], search_fields: ['title.es'],
  },
};

/** Un $ref, con lo de al lado (title, description) mandando; _def es el nombre de su $defs. */
const resolver = (esquema) => (s) => {
  if (!s.$ref) return s;
  const name = s.$ref.split('/').pop();
  const { $ref, ...rest } = s;
  return { ...esquema.$defs[name], ...rest, _def: name };
};

const vacio = (v) => v == null || v === '' || (Array.isArray(v) ? !v.length : typeof v === 'object' && !Object.keys(v).length);

/** Un campo del esquema como campo del panel. `dato`, lo que hay (para los mapas, como lists). */
function campo(name, s, required, dato, def, path) {
  s = def(s);
  if (s.anyOf) throw new Error(`«${path}» tiene dos formas (anyOf) y el panel solo sabe una`);
  const f = { name, label: s.title || name, ...(required ? {} : { required: false }), ...(s.description && { hint: s.description }) };
  const tipos = [].concat(s.type || []);
  if (RELACIONES[path]) return { ...f, ...RELACIONES[path] };
  if (s.enum) return { ...f, widget: 'select', options: s.enum };
  if (s.format === 'date') return { ...f, widget: 'datetime', type: 'date', format: 'YYYY-MM-DD' };
  if (tipos.includes('string')) {
    return { ...f, widget: s._def === 'parrafo' ? 'text' : 'string', ...(s.pattern && { pattern: [s.pattern, s.description || 'no tiene la forma que toca'] }) };
  }
  if (tipos.includes('number')) return { ...f, widget: 'number', value_type: 'float', min: s.minimum, max: s.maximum };
  if (tipos.includes('boolean')) return { ...f, widget: 'boolean', default: s.default ?? false };
  if (tipos.includes('array')) {
    const items = def(s.items || {});
    const list = { ...f, widget: 'list', ...(s.maxItems != null && { max: s.maxItems }) };
    if (items.enum) return { ...f, widget: 'select', multiple: true, options: items.enum };
    // fotos ($defs/foto): miniaturas, subir y ordenar arrastrando; guarda el nombre del archivo
    if (items._def === 'foto') return { ...f, widget: 'image', multiple: true, ...(s.maxItems != null && { max: s.maxItems }) };
    if (items.properties) {
      return { ...list, ...(items.properties.name && { summary: '{{fields.name}}' }), fields: campos(items, def, `${path}.*`) };
    }
    const { required: _, hint, ...uno } = campo(name, items, true, undefined, def, `${path}.*`);
    return { ...list, field: { ...uno, label: items.title || f.label } };
  }
  if (s.properties) return { ...f, widget: 'object', fields: campos(s, def, path, dato) };
  if (s.additionalProperties) {
    // un mapa (lists): un campo por cada clave que hay ahora
    return { ...f, widget: 'object', fields: Object.keys(dato || {}).map((k) => campo(k, s.additionalProperties, true, dato[k], def, `${path}.*`)) };
  }
  throw new Error(`«${path}»: no sé qué campo del panel le toca`);
}

function campos(s, def, path = '', dato = undefined, schemaPath = undefined) {
  return Object.entries(s.properties).map(([k, sub]) => (k === '$schema'
    ? { name: k, widget: 'hidden', default: schemaPath }
    : campo(k, sub, (s.required || []).includes(k), dato?.[k], def, path ? `${path}.${k}` : k)));
}

/** El config del panel. `schemas`: { site, about, project }; `site`: data/site.json; `repo`: "dueño/repo". */
export function config({ schemas, site, repo }) {
  const de = (tipo, schemaPath, dato) => campos(schemas[tipo], resolver(schemas[tipo]), '', dato, schemaPath);
  return {
    backend: { name: 'github', repo, ...(AUTH && { base_url: AUTH }) },
    media_folder: 'projects',   // obligatorio; cada proyecto usa su img/
    output: { omit_empty_optional_fields: true, json: { indent_size: 2 } },
    /* Una foto subida desde el panel sale como de imgToWeb: WebP, q85, ≤ 2000 px. */
    media_libraries: { default: { config: { transformations: { raster_image: { format: 'webp', quality: 85, width: 2000, height: 2000 } } } } },
    collections: [
      {
        name: 'projects', label: 'proyectos', label_singular: 'proyecto',
        description: 'Cada proyecto es una carpeta de projects/. Para que salga en la web, añádelo también a una lista en «la web».',
        folder: 'projects', path: '{{slug}}/project', format: 'json', extension: 'json',
        media_folder: 'img', public_folder: '',   // la foto se guarda como "3.webp", sin carpeta
        identifier_field: 'title.es', summary: '{{title.es}}',
        slug: { template: '{{fields.title.es}}', editable: ['create'] },
        fields: de('project', '../../schema/project.json'),
      },
      {
        name: 'data', label: 'la web',
        files: [
          { name: 'site', label: 'general y listas', file: 'data/site.json', fields: de('site', '../schema/site.json', site) },
          { name: 'about', label: 'about', file: 'data/about.json', fields: de('about', '../schema/about.json') },
        ],
      },
    ],
  };
}

/** `dato` como lo escribe el panel: campos en el orden del esquema, notas «_…» al final (por orden), sin opcionales vacíos. */
export function canonico(dato, esquema, def = resolver(esquema)) {
  const s = def(esquema);
  if (Array.isArray(dato)) return s.items ? dato.map((x) => canonico(x, s.items, def)) : dato;
  if (!dato || typeof dato !== 'object') return dato;
  const props = s.properties || {};
  /* Un sí/no que no está, el panel lo escribe al guardar (con su
     «default»): se escribe ya, para que guardar no cambie nada. */
  if (s.properties) {
    dato = { ...dato };
    for (const [k, p] of Object.entries(props)) if (def(p).type === 'boolean' && !(k in dato)) dato[k] = def(p).default ?? false;
  }
  const notas = Object.keys(dato).filter((k) => k.startsWith('_')).sort();
  const claves = s.properties
    ? [...Object.keys(props).filter((k) => k in dato), ...Object.keys(dato).filter((k) => !(k in props) && !k.startsWith('_'))]
    : Object.keys(dato).filter((k) => !k.startsWith('_'));
  const out = {};
  for (const k of claves) {
    const sub = props[k] || (typeof s.additionalProperties === 'object' ? s.additionalProperties : {});
    const v = canonico(dato[k], sub, def);
    const required = (s.required || []).includes(k) || !props[k];
    if (required || !vacio(v)) out[k] = v;
  }
  for (const k of notas) out[k] = dato[k];
  return out;
}

export const texto = (dato) => `${JSON.stringify(dato, null, 2)}\n`;

/* node build/panel.mjs: todos los JSON al formato del panel. (Este fichero
   lo carga también admin/index.html en el navegador: lo de Node, aquí dentro.) */
if (globalThis.process?.argv?.[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) {
  const { readdirSync, readFileSync, writeFileSync } = await import('node:fs');
  const { join, resolve } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
  const schema = (tipo) => JSON.parse(readFileSync(join(ROOT, 'schema', `${tipo}.json`), 'utf8'));
  const files = [['data/site.json', 'site'], ['data/about.json', 'about'],
    ...readdirSync(join(ROOT, 'projects'), { withFileTypes: true }).filter((e) => e.isDirectory())
      .map((e) => [`projects/${e.name}/project.json`, 'project'])];
  let changed = 0;
  for (const [file, tipo] of files) {
    const before = readFileSync(join(ROOT, file), 'utf8');
    const after = texto(canonico(JSON.parse(before), schema(tipo)));
    if (after !== before) { writeFileSync(join(ROOT, file), after); changed++; console.log(`  ${file}`); }
  }
  console.log(`✓ ${changed} de ${files.length} JSON pasados al formato del panel`);
}
