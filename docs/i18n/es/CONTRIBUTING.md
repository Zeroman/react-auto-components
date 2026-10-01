# Contribuir

[English](../../../.github/CONTRIBUTING.md) | [简体中文](../zh-CN/CONTRIBUTING.md) | [繁體中文](../zh-TW/CONTRIBUTING.md) | [日本語](../ja/CONTRIBUTING.md) | [한국어](../ko/CONTRIBUTING.md) | **Español** | [Français](../fr/CONTRIBUTING.md) | [Deutsch](../de/CONTRIBUTING.md) | [Português (Brasil)](../pt-BR/CONTRIBUTING.md) | [Русский](../ru/CONTRIBUTING.md)

Utilice Issues para informar de problemas reproducibles o proponer funcionalidades, y Pull Requests para aportar mejoras.

## Desarrollo local

Requiere Node.js >=22.12.0 y pnpm 12.5.1. La versión del gestor de paquetes está fijada en el campo packageManager de package.json.

```sh
pnpm install --frozen-lockfile
pnpm prepare:test-project
pnpm --dir test-project dev
```

El proyecto consumidor instala la biblioteca desde un archivo tarball real. Después de modificar la biblioteca, ejecute de nuevo `pnpm prepare:test-project`. Mantenga este flujo basado en paquetes en lugar de introducir alias al código fuente. No incluya en los commits artefactos, node_modules ni registros de ejecución.

## Verificación

```sh
pnpm typecheck
pnpm test
pnpm prepare:test-project
pnpm --dir test-project build
pnpm exec playwright install chromium
pnpm test:e2e
```

La integración continua ejecuta estas comprobaciones en Linux. Las pruebas del navegador utilizan automáticamente el puerto 4174; la demostración de desarrollo utiliza el puerto 4173.

## Directorios

- `src/components`: los siete componentes y sus tipos públicos.
- `src/core`: configuración, proveedores, consultas y tipos compartidos.
- `src/adapters`: el adaptador XLSX opcional.
- `src/styles`: estilos de componentes importados explícitamente.
- `tests`: pruebas unitarias y pruebas negativas de tipos.
- `test-project`: el proyecto consumidor independiente y las pruebas de interacción de Chromium.
- `scripts`: scripts de empaquetado y preparación del proyecto consumidor.

## Pull Requests

Describa el problema, el comportamiento resultante y las comprobaciones que realmente haya ejecutado. Al corregir un error de un componente, añada una prueba de regresión que reproduzca el problema. Actualice la documentación cuando cambien las API públicas o su uso. Mantenga los cambios centrados y evite modificaciones de formato no relacionadas en todo el repositorio.

Siga la configuración estricta de TypeScript y el estilo de código existentes. React 19 sigue siendo una dependencia par, los estilos utilizan un punto de entrada separado y XLSX permanece fuera del punto de entrada principal. Las contribuciones se proporcionan bajo la licencia MIT de este repositorio.

## Traducciones de la documentación

Los documentos en inglés usan sus nombres de archivo predeterminados. Las traducciones se agrupan por configuración regional bajo `docs/i18n/<locale>/`, por ejemplo `docs/i18n/ja/README.md` y `docs/i18n/zh-CN/migration.md`. Mantén las mismas secciones, ejemplos, significado técnico y estado de lanzamiento en todos los idiomas. Conserva los identificadores públicos y los argumentos de los comandos. Al actualizar un documento, actualiza sus traducciones y mantén consistentes los enlaces de cambio de idioma y los enlaces a los documentos relacionados.
