# React Auto Components

[English](../../../README.md) | [简体中文](../zh-CN/README.md) | [繁體中文](../zh-TW/README.md) | [日本語](../ja/README.md) | [한국어](../ko/README.md) | **Español** | [Français](../fr/README.md) | [Deutsch](../de/README.md) | [Português (Brasil)](../pt-BR/README.md) | [Русский](../ru/README.md)

Una biblioteca de componentes independiente y basada en esquemas para React 19, con formularios, tablas y chat. Construida con TypeScript, TanStack Table 9 / Form / Virtual, Radix y Floating UI, sin Ant Design, Element Plus ni MUI. Las compilaciones de la biblioteca usan React Compiler.

[![Auto Studio Demo](../../assets/demo.png)](https://zeroman.github.io/react-auto-components/)

<p align="center">
  <a href="https://zeroman.github.io/react-auto-components/"><strong>🚀 Demo en vivo (GitHub Pages)</strong></a> · <a href="#ejecutar-el-proyecto-de-pruebas-independiente">Ejecución local</a> · <a href="#componentes">Componentes</a>
</p>

## Estado del proyecto

La versión actual es 0.4.1 y las API aún pueden cambiar. Se requiere React 19. El paquete proporciona declaraciones ESM y de TypeScript. El texto integrado de la interfaz tiene el inglés como idioma predeterminado y puede traducirse mediante AutoConfigProvider.config.t.

Instálalo con `pnpm add @zeroman.yang/react-auto-components` (npm y yarn funcionan igual). Las peer dependencies son React 19 y react-dom 19. Importa la hoja de estilos una vez: `import "@zeroman.yang/react-auto-components/style.css"`.

Importa una vez en la entrada de la aplicación `import "@zeroman.yang/react-auto-components/style.css"`. Si falta la hoja de estilos, el desarrollo avisa con `RAC-CSS-MISSING`.

En la exportación XLSX, `RAC-TABLE-XLSX` indica que falta el adaptador `exportXlsx`; `RAC-XLSX-DEP` indica que no se pudo cargar la dependencia opcional `exceljs`. Importa y pasa el adaptador desde `@zeroman.yang/react-auto-components/xlsx`; instala con `pnpm add exceljs` cuando sea necesario. CSV y JSON no lo necesitan.

- [Demo en vivo (GitHub Pages)](https://zeroman.github.io/react-auto-components/)
- [Contribuir](https://github.com/Zeroman/react-auto-components/blob/main/docs/i18n/es/CONTRIBUTING.md)
- [Registro de cambios](https://github.com/Zeroman/react-auto-components/blob/main/docs/i18n/es/CHANGELOG.md)
- [Configuración de la cuenta y publicación](https://github.com/Zeroman/react-auto-components/blob/main/docs/i18n/es/publishing.md)
- [Licencia MIT](../../../LICENSE)

## Ejecutar el proyecto de pruebas independiente

Requiere Node.js >= 22.12 y pnpm 12.5.

```sh
pnpm install --frozen-lockfile
pnpm prepare:test-project
pnpm --dir test-project dev
```

Abra http://127.0.0.1:4173. El proyecto de pruebas incluye páginas para los siete componentes, tablas locales/del lado del servidor/de 10 000 filas/en árbol, CRUD, reintentos de envíos fallidos, borradores, pestañas anidadas y alturas de fila dinámicas.

La demo detecta automáticamente el idioma del navegador, con el inglés como alternativa predeterminada. Elija un idioma desde el encabezado o en la configuración global; la selección se recuerda entre recargas. Seleccione Auto para volver a seguir el idioma del navegador. Se admiten diez idiomas. Las páginas llenan el viewport, con tablas y paneles largos que se desplazan dentro de sus propias áreas.

Cada página de ejemplo incluye un botón **Ver código** que abre su archivo fuente real en un diálogo, con pestañas de archivo, copia en un clic y un enlace a GitHub.

`test-project` tiene sus propios archivos package.json y de bloqueo. Instala el resultado real de `pnpm pack`, sin alias al código fuente. Ejecute de nuevo `pnpm prepare:test-project` después de modificar la biblioteca; el script utiliza nombres de archivo con un hash del contenido para evitar cachés de archivos tarball obsoletos.

## Uso

```tsx
import { useState } from 'react';
import {
  AutoConfigProvider, AutoDialogProvider, AutoTable,
  type AutoColumn, type Field,
} from '@zeroman.yang/react-auto-components';
import '@zeroman.yang/react-auto-components/style.css';

type Person = { id: number; name: string; enabled: boolean };
const columns: AutoColumn<Person>[] = [
  { key: 'name', label: 'Nombre', sortable: true },
  { key: 'enabled', label: 'Activado', options: [
    { label: 'Sí', value: true }, { label: 'No', value: false },
  ] },
];
const fields: Field<Person>[] = [
  { name: 'name', label: 'Nombre', required: true },
  { name: 'enabled', label: 'Activado', type: 'switch', defaultValue: true },
];
export function App() {
  const [rows, setRows] = useState<Person[]>([]);
  return <AutoConfigProvider config={{ namespace: 'my-app' }}>
    <AutoDialogProvider>
      <AutoTable<Person> id="people" rowKey="id" data={rows}
        columns={columns} formFields={fields} searchFields={fields}
        onAdd={value => setRows(old => [...old, { ...value, id: Date.now() }])}
        onEdit={(row, value) => setRows(old => old.map(item => item.id === row.id ? { ...row, ...value } : item))}
        onDelete={selected => setRows(old => old.filter(item => !selected.some(row => row.id === item.id)))}
      />
    </AutoDialogProvider>
  </AutoConfigProvider>;
}
```

Los campos, las columnas y las referencias utilizan genéricos: los nombres de campo o valores predeterminados no válidos producen errores en tiempo de compilación. El proveedor admite espacios de nombres, permisos, traducción de etiquetas de campos, campos personalizados, notificaciones y adaptadores de persistencia. Las etiquetas integradas, los mensajes de validación y el texto de accesibilidad usan AutoConfigProvider.config.t; las etiquetas explícitas de los componentes tienen prioridad.

La función de devolución de llamada t recibe una clave de mensaje y un texto alternativo. Conserve los marcadores de posición numerados como {0} y {1} en los mensajes integrados traducidos; los componentes sustituyen sus valores después de la traducción.

## Componentes

| Componente | Capacidades |
| --- | --- |
| AutoForm | Tipos de campo nativos, opciones virtualizadas, selección en cascada, adaptadores de carga, renderizado personalizado, campos dependientes, visibilidad condicional, validación asíncrona, estado controlado y conservación de los datos introducidos tras errores |
| AutoSearch | Condiciones básicas/avanzadas, búsqueda manual/instantánea, restablecimiento, etiquetas de ordenación, un AST de consulta compartido y serialización RSQL |
| AutoTable | Datos locales/remotos, ordenación por varias columnas, filtros de columna, paginación, selección estable, virtualización, expansión de árboles/detalles, resúmenes, celdas combinadas, CRUD, menús contextuales y copia |
| AutoDialog | API declarativas/imperativas, proveedores aislados, borradores, protección de cierre, gestión del foco, arrastre, pantalla completa y envío asíncrono |
| AutoTabs | Diseños horizontales/verticales, anidamiento, permisos, pestañas deshabilitadas, conservación del estado de los paneles y actualización |
| AutoMenu | Navegación lateral con iconos, descripciones, insignias, grupos anidados, permisos y una barra de iconos plegable |
| AutoChat | Renderizado de mensajes controlado por el llamador, virtualización opcional, seguimiento de streaming, carga de historial anclada, compositor con envío/detención y acciones personalizadas |

El diseño de la tabla, la ordenación, el filtrado y la exportación admiten cada uno ajustes preestablecidos con nombre y versiones independientes. La persistencia utiliza localStorage de forma predeterminada; se pueden inyectar adaptadores remotos. La exportación JSON/CSV está integrada. XLSX utiliza un adaptador opcional e independiente:

```tsx
import { exportXlsx } from '@zeroman.yang/react-auto-components/xlsx';
// <AutoTable ... exportXlsx={exportXlsx} />
```

ExcelJS se carga dinámicamente la primera vez que se utiliza el adaptador y queda excluido del punto de entrada principal de la biblioteca. Las aplicaciones que solo utilicen CSV/JSON pueden omitir las dependencias opcionales durante la instalación.

## Verificación

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm prepare:test-project
pnpm --dir test-project build
pnpm exec playwright install chromium  # Solo en la primera ejecución
pnpm test:e2e
```

Las pruebas unitarias cubren campos, validación asíncrona, consultas, diálogos, virtualización, tablas, migraciones de configuración y exportaciones. Las pruebas de Playwright comprueban las interacciones mediante los puntos de entrada públicos del paquete. Las capturas de pantalla de escritorio y móvil se guardan en `test-project/test-results`.

## Comportamiento y convenciones

- Esta es una API nativa de React, no una capa de compatibilidad con Vue propiedad por propiedad o método por método. Consulte la [guía de migración](migration.md).
- El código de la aplicación es responsable de los datos. Las funciones de retorno de CRUD guardan los cambios; lanzar una excepción ante un error conserva las ediciones. Tras una operación correcta, el componente actualiza los datos remotos. Quien lo invoca debe actualizar los datos locales.
- El `id` de una tabla debe ser único dentro de su espacio de nombres, y `rowKey` debe ser único en todas las páginas y nodos del árbol. En modo de servidor, proporcione `columns` explícitamente; la fuente de datos devuelve el recuento total.
- Cuando `query` / `value` están controlados, el componente padre debe gestionar las funciones de retorno y actualizar su valor. Estas propiedades se pueden omitir para un uso no controlado.
- Las celdas combinadas utilizan una tabla semántica no virtualizada, adecuada para datos paginados, para evitar desalineaciones de rowSpan entre ventanas virtuales.
- Los resúmenes del servidor para todas las filas filtradas se proporcionan mediante `summaryValues`. Los resúmenes ausentes muestran `—` en lugar de presentar el total de la página actual como un total general. Establezca `summaryScope="page"` para calcular explícitamente la página actual.
- El envío se pausa mientras hay cargas en curso. Restablecer o sustituir los valores de los campos, o desmontar el componente, cancela las cargas anteriores; los resultados tardíos no pueden sobrescribir valores más recientes.
- Las exportaciones remotas de todos los resultados filtrados solicitan los datos de página en página. Las aplicaciones grandes pueden implementar su propia exportación del lado del servidor.
- Importe explícitamente los estilos del navegador desde `style.css`. Los módulos JavaScript se pueden importar en Node sin `window`.

## Ocupar la altura restante con AutoTable

`height={440}` sigue estableciendo una altura fija para el área de desplazamiento de datos. Con `height="auto"`, la tabla completa ocupa la altura asignada por el diseño de su contenedor padre. La búsqueda, la barra de herramientas y la paginación mantienen sus alturas naturales; el área de datos utiliza el espacio restante y se desplaza de forma independiente:

```tsx
<div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', gap: 12 }}>
  <header>Título y descripción de la página</header>
  <AutoTable<Person> id="people" rowKey="id" data={rows}
    columns={columns} height="auto" />
  <footer>Pie de página</footer>
</div>
```

El contenedor padre debe tener una altura definida. Utilice `flex: 1; min-height: 0` en contenedores flex anidados para transmitir el espacio restante, o `grid-template-rows: auto minmax(0, 1fr) auto` en diseños de cuadrícula. No es necesario calcular en JavaScript la altura de la ventana menos la altura de la barra de herramientas: el diseño gestiona la adición y eliminación de campos de búsqueda, las barras de herramientas en varias líneas y los cambios de tamaño del contenedor padre; la lista virtual se adapta a las dimensiones reales del área de desplazamiento.

Esto no ajusta el tamaño de la tabla al número de filas. Los conjuntos de datos vacíos o pequeños siguen ocupando el espacio disponible. El contenedor padre debe poder alojar como mínimo el área de búsqueda, la barra de herramientas y la paginación.

El proyecto de pruebas lo muestra en la pestaña **AutoTable → Altura restante**, conservando la barra lateral y la cabecera de la página. La URL heredada `http://127.0.0.1:4173/?demo=auto-height` selecciona directamente esa pestaña. Pruebas del navegador: `test-project/tests/auto-height.spec.ts`.

## Diseño global de formularios

Utilice `AutoConfigProvider.config.form` para configurar de forma coherente los formularios normales, los paneles de búsqueda, las áreas de búsqueda de las tablas y los formularios de diálogo. Las etiquetas pueden aparecer encima o a la izquierda de los controles, con alineación de texto izquierda/derecha independiente. Los valores predeterminados son etiquetas superiores y espaciado cómodo.

```tsx
<AutoConfigProvider config={{
  form: {
    labelPosition: 'left', // 'top': arriba; 'left': a la izquierda del control
    labelAlign: 'right',   // Texto alineado a la derecha; la etiqueta queda a la izquierda del control
    labelWidth: 80,
    density: 'compact',   // 'comfortable': más espaciado
  },
}}>
  <App />
</AutoConfigProvider>
```

Los proveedores anidados combinan los ajustes de diseño propiedad por propiedad. Las propiedades explícitas de los componentes prevalecen sobre el proveedor que los engloba. Por ejemplo, mantenga las etiquetas superiores en un formulario mientras utiliza etiquetas en línea globalmente:

```tsx
<AutoForm fields={fields} labelPosition="top" density="comfortable" />
<AutoTable id="people" rowKey="id" data={rows} columns={columns}
  searchFields={searchFields}
  searchLayout={{ labelWidth: 100, columns: 3 }} />
```

`labelWidth` vale `"auto"` de forma predeterminada y también admite un número de píxeles o una anchura CSS como `"6em"`. En modo automático, cada etiqueta de búsqueda se adapta a su texto; los formularios normales y de diálogo comparten una anchura basada en las etiquetas visibles para alinear los controles. Las etiquetas largas ocupan como máximo el 45 % de la anchura del campo y pasan a varias líneas a partir de ahí, conservando espacio para los controles. Las anchuras fijas explícitas no están sujetas a este límite automático. Las áreas de búsqueda compactas colocan los botones de acción en la misma fila cuando hay espacio y los distribuyen en varias líneas en pantallas estrechas. Las asociaciones de etiquetas permanecen intactas, los errores y las descripciones se alinean con los controles, y las etiquetas largas pueden ocupar varias líneas.

En la demostración, abra **Configuración global** desde la barra lateral o el engranaje de la esquina superior derecha para cambiar el diseño, la densidad, la anchura de las etiquetas y el tema. Los cambios surten efecto de inmediato sin borrar los datos introducidos. La página de formularios admite **Seguir la configuración global** o ajustes locales. La demostración activa explícitamente el diseño compacto en línea mediante su proveedor.

## Tamaño y densidad globales

`AutoConfigProvider` admite `size: "small" | "medium" | "large"` y `density: "compact" | "comfortable"`. Las propiedades explícitas de los componentes tienen prioridad sobre los ajustes de la categoría del componente, que a su vez tienen prioridad sobre los valores globales:

```tsx
<AutoConfigProvider config={{
  size: "medium",
  density: "compact",
  form: { labelPosition: "left", labelAlign: "right" },
  table: { density: "compact" },
  tabs: { density: "compact" },
}}>
  <AutoForm fields={fields} size="small" />
</AutoConfigProvider>
```

La densidad de la tabla también admite `normal`. El panel de ajustes de la tabla sigue la configuración global de forma predeterminada. Seleccionar un espaciado compacto, normal o cómodo sustituye la densidad global y se guarda con el ajuste preestablecido de diseño; la propiedad `density` del componente tiene la máxima prioridad. Los tamaños locales de los componentes anidados se aplican de forma independiente.

Los formularios admiten `resetLabel`, `extraActions` y `onReset`; los paneles de búsqueda admiten `searchLabel`, `resetLabel` y `extraActions`; los diálogos admiten `cancelLabel` y `extraActions`. Los elementos de `AutoTabs` pueden definir un `badge`, y `AutoTable.empty` personaliza el contenido del estado vacío.

### AutoChat

AutoChat proporciona una disposición de conversación ligera con seguimiento automático del streaming, carga del historial y un área de redacción. Usa contenido de React o renderMessage para renderizar los mensajes; no se necesitan dependencias adicionales en tiempo de ejecución.

[AutoChat API](auto-chat.md)

Qué hace el componente si un callback lanza: [AutoForm](auto-form.md), [AutoSearch](auto-search.md), [AutoTable](auto-table.md), [AutoDialog](auto-dialog.md), [AutoTabs](auto-tabs.md), [AutoMenu](auto-menu.md). Códigos de error para desarrolladores: [errors.md](errors.md).
