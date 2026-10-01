# Guía de integración de componentes

[English](../../migration.md) | [简体中文](../zh-CN/migration.md) | [繁體中文](../zh-TW/migration.md) | [日本語](../ja/migration.md) | [한국어](../ko/migration.md) | **Español** | [Français](../fr/migration.md) | [Deutsch](../de/migration.md) | [Português (Brasil)](../pt-BR/migration.md) | [Русский](../ru/migration.md)

Configura los componentes mediante generics, callbacks y providers de React. La siguiente tabla relaciona las necesidades comunes de las aplicaciones con las API públicas y los ejemplos ejecutables.

| Caso de uso original | API de React | Ejemplo ejecutable / prueba |
| --- | --- | --- |
| Campos de formulario y v-model | `fields: Field<T>[]`, `value/onChange` o `defaultValue` | Página de formularios en `test-project/src/examples/FormDemo.tsx`; `tests/form*.test.tsx` |
| Slots y contenido añadido | `render` del campo, `render/header` de la columna, ReactNode | Páginas de formularios/tablas |
| Operaciones de instancia del formulario | `ref.validate/reset/getValues/setValue/focus` | `tests/form.test.tsx` |
| Búsqueda, condiciones relacionadas, RSQL | `buildQuery`, `matchesQuery`, `serializeRsql` | Página de búsqueda; `tests/query.test.ts` |
| Datos de tabla locales/remotos | `data` o `dataSource(query,{signal})` | Página de tablas; `tests/table.test.tsx` |
| Ajustes preestablecidos de diseño/filtro/ordenación/exportación | Ajustes preestablecidos independientes en el diálogo de configuración, invalidados por separado mediante `versions` | Página de tablas; `tests/table-settings.test.ts` |
| Árboles, detalles, resúmenes, celdas combinadas | `getChildren/renderExpanded`, `summary/merge` de la columna | Ejemplos de árboles y expansión; `tests/table-advanced.test.tsx` |
| Añadir, editar, eliminar | `formFields` y `onAdd/onEdit/onDelete` | Pruebas de CRUD en el navegador |
| Diálogos imperativos | `AutoDialogProvider` + `useAutoDialog().open()` | Página de diálogos; `tests/dialog.test.tsx` |
| Pestañas y pestañas anidadas | Elementos de `AutoTabs`, value/onChange, keepMounted | Página de pestañas; `tests/tabs.test.tsx` |
| Listas de mensajes de chat y UI de conversación | `AutoChat`, `messages`, `onSend`, `renderMessage` | Páginas de chat en `test-project/src/examples/Chat*.tsx`; `tests/chat.test.tsx` |

## Tipos de campo

`input/email/textarea/integer/float/percentage/progress/switch/select/select-v2/radio/checkbox/cascader/autocomplete/date/datetime/daterange/datetimerange/upload/text/title/tip/button/append/custom`.

`select-v2` virtualiza las opciones. Los intervalos de fechas utilizan dos campos nativos con etiquetas separadas; `dateValue` elige entre cadenas y marcas de tiempo. Los campos numéricos permiten estados intermedios de edición; utilice reglas de campo para validar las restricciones de negocio al enviar. `rules` admite validación asíncrona, mientras que los campos ocultos omiten la validación. Las opciones conservan los valores numéricos y booleanos en lugar de convertirlos en cadenas.

```tsx
const fields: Field<User>[] = [
  { name: 'name', label: 'Nombre', required: true },
  { name: 'note', label: 'Nota', hidden: values => !values.enabled,
    render: ({ value, onChange, disabled }) =>
      <textarea disabled={disabled} value={String(value ?? '')}
        onChange={event => onChange(event.target.value)} /> },
];
```

Consulte los tipos de TypeScript exportados para ver la API completa. `Field<T>` se vincula a claves reales de T; los elementos estructurales, como títulos y consejos, no necesitan una propiedad de datos.

## Fuentes de datos del lado del servidor

```tsx
const dataSource: DataSource<User> = async (query, { signal }) => {
  const response = await fetch('/api/users/search', {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  });
  if (!response.ok) throw new Error('Error al cargar');
  return response.json(); // { rows: User[], total: number }
};
```

Los índices de página comienzan en 0. `sort` es un arreglo ordenado de campos; `filter` es un árbol de consulta estructurado. Los componentes cancelan las solicitudes antiguas e impiden que las respuestas tardías sobrescriban consultas más recientes. Llame a `ref.refresh()` de la tabla cuando cambien condiciones de negocio externas al cierre de la fuente de datos. Mantenga estable la función de la fuente de datos para evitar solicitudes innecesarias. La serialización RSQL es solo un adaptador para los servidores que la requieren; no ejecuta cadenas de consulta.

## Cargas y persistencia de la aplicación

El método `upload(files, signal)` de un campo devuelve el valor del campo después de que la aplicación guarde los archivos. El componente muestra los errores de carga; quien lo invoca proporciona las URL de carga, la autenticación y las políticas de almacenamiento de objetos.

```tsx
<AutoConfigProvider config={{
  namespace: 'tenant-admin',
  canAccess: access => !access.permissions?.length || access.permissions.every(p => myPermissions.includes(p)),
  settings: {
    load: key => api.loadTableSettings(key),
    save: (key, settings) => api.saveTableSettings(key, settings),
  },
  notify: (message, level) => showToast(message, level),
}}>{children}</AutoConfigProvider>
```

Los cambios locales se aplican de inmediato; los guardados remotos se ejecutan en serie, con una opción de reintento tras los fallos. Al cambiar los formatos de las configuraciones persistidas, usa un nuevo id de tabla o versión para evitar cargar configuraciones incompatibles.
