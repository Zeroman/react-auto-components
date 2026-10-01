# Proyecto consumidor y de pruebas independiente

[English](../../../test-project/README.md) | [简体中文](../zh-CN/test-project.md) | [繁體中文](../zh-TW/test-project.md) | [日本語](../ja/test-project.md) | [한국어](../ko/test-project.md) | **Español** | [Français](../fr/test-project.md) | [Deutsch](../de/test-project.md) | [Português (Brasil)](../pt-BR/test-project.md) | [Русский](../ru/test-project.md)

Este proyecto instala la biblioteca de componentes desde un archivo tarball local, con dependencias y compilaciones independientes. No utiliza alias al código fuente.

La demo detecta automáticamente el idioma del navegador, con el inglés como alternativa predeterminada. Elija un idioma desde el encabezado o en la configuración global; la selección se recuerda entre recargas. Seleccione Auto para volver a seguir el idioma del navegador. Se admiten diez idiomas. Las páginas llenan el viewport, con tablas y paneles largos que se desplazan dentro de sus propias áreas.

Desde la raíz del repositorio, ejecute `pnpm install --frozen-lockfile` y `pnpm prepare:test-project`, y después `pnpm --dir test-project dev`.

- `pnpm --dir test-project build`: comprueba los tipos públicos y crea una compilación de producción.
- `pnpm exec playwright install chromium`: instala el navegador en el primer uso.
- `pnpm --dir test-project test`: ejecuta las pruebas de interacción de Chromium (inicia automáticamente un servidor independiente en el puerto 4174).
- Después de modificar la biblioteca, ejecute de nuevo `pnpm prepare:test-project` para actualizar la dependencia del archivo tarball cuyo nombre incluye un hash del contenido.

Las pruebas del navegador en `tests/components.spec.ts` cubren CRUD, validación de campos y reintentos de envíos fallidos, persistencia de ajustes, borradores y foco, ventanas emergentes, pestañas anidadas, desplazamiento por 10 000 filas, paginación del lado del servidor, mediciones de expansión, anchuras de columnas, descargas y diseños móviles. Las capturas de pantalla se guardan en `test-results/`.

La demostración de altura restante se encuentra en la pestaña **AutoTable → Altura restante**. La URL heredada `http://127.0.0.1:4173/?demo=auto-height` abre la misma página y selecciona esa pestaña. El ejemplo permite alternar entre Flex/Grid, añadir o eliminar contenido encima de la tabla, mostrar u ocultar la tabla y cambiar la paginación y el número de filas. `tests/auto-height.spec.ts` mide los límites en el navegador y la altura del área de desplazamiento para verificar el diseño del espacio restante, los cambios dinámicos de tamaño, la recuperación de la virtualización y la compatibilidad con alturas fijas.

Las pruebas del navegador inician un servidor Vite nuevo en el puerto 4174 en lugar de reutilizar la demostración de desarrollo del puerto 4173. El script de reempaquetado notifica a los servidores de demostración existentes para que resuelvan el paquete recién instalado y evitar así componentes obsoletos.

La configuración global está separada del contenido de los ejemplos y se implementa en `src/GlobalSettings.tsx`. Abra el panel desde la barra lateral o el control de la esquina superior derecha. El ejemplo actual permanece montado mientras cambia el diseño, la densidad, la anchura de las etiquetas o el tema.
