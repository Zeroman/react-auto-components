# Publicar en GitHub y npm

[English](../../publishing.md) | [简体中文](../zh-CN/publishing.md) | [繁體中文](../zh-TW/publishing.md) | [日本語](../ja/publishing.md) | [한국어](../ko/publishing.md) | **Español** | [Français](../fr/publishing.md) | [Deutsch](../de/publishing.md) | [Português (Brasil)](../pt-BR/publishing.md) | [Русский](../ru/publishing.md)

## Cuentas y nombre del paquete

El repositorio de GitHub es `Zeroman/react-auto-components`. La cuenta de npm es `zeroman.yang`. El scope `@zeroman` pertenece a otro usuario de npm, así que el nombre del paquete es `@zeroman.yang/react-auto-components`.

1. Abra la [página de registro de npm](https://www.npmjs.com/signup), introduzca un nombre de usuario, un correo electrónico y una contraseña, y revise y acepte personalmente los términos.
2. Verifique el correo electrónico de registro. npm exige un correo verificado antes de publicar; las direcciones de correo de los publicadores aparecen en los metadatos del paquete, así que elija una dirección adecuada para el mantenimiento público.
3. Active la autenticación de dos factores en la configuración de la cuenta y guarde la información de recuperación. Nunca coloque contraseñas, códigos de verificación, códigos de recuperación ni tokens en el repositorio o en el chat.
4. Ejecute `npm login --registry=https://registry.npmjs.org/` y siga las indicaciones del navegador. Confirme la cuenta con `npm whoami --registry=https://registry.npmjs.org/`.
5. Se recomienda un ámbito personal como `@<npm-username>/react-auto-components`. Para un ámbito de organización, verifique primero la pertenencia y los permisos de publicación.

Cuando el nombre sea definitivo, actualice el nombre en el package.json raíz, las importaciones de todas las traducciones del README, las dependencias del proyecto consumidor y las importaciones del código fuente y las pruebas. Después ejecute `pnpm prepare:test-project` para actualizar el archivo de bloqueo del consumidor. El script de empaquetado obtiene los nombres de los archivos tarball del package.json raíz.

Documentación oficial: [registro de cuentas](https://docs.npmjs.com/creating-a-new-npm-user-account/), [paquetes públicos con ámbito](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/) y [autenticación de dos factores](https://docs.npmjs.com/about-two-factor-authentication/).

## Verificación previa a la publicación

Ejecute desde la raíz del repositorio:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm prepare:test-project
pnpm --dir test-project build
pnpm exec playwright install chromium
pnpm test:e2e
npm pack --dry-run
```

`prepack` compila automáticamente JavaScript, CSS y declaraciones; `prepublishOnly` ejecuta las comprobaciones de tipos y las pruebas unitarias. El paquete de npm contiene únicamente dist, las traducciones del README y de la guía de migración, LICENSE y package.json. Compruebe que se excluyan las credenciales, los registros locales y los resultados de las pruebas. El resto de la documentación del repositorio se enlaza en GitHub.

`test-project` valida los puntos de entrada públicos reales mediante un archivo tarball cuyo nombre incluye un hash del contenido. En una copia recién clonada, ejecute `pnpm prepare:test-project` desde la raíz antes de instalar en ese directorio. El comando de preparación actualiza la dependencia local y el archivo de bloqueo del consumidor.

## Primera publicación

Una vez completados la configuración de la cuenta, el nombre definitivo del paquete, la licencia y las comprobaciones anteriores:

```sh
npm whoami --registry=https://registry.npmjs.org/
npm publish --access public --registry=https://registry.npmjs.org/
```

Complete cualquier verificación solicitada por npm. Después de publicar, ejecute `npm view <package-name> version` con el nombre definitivo y, a continuación, instale y verifique el paquete en un proyecto consumidor nuevo. Elimine el aviso de preparación de la primera publicación de todas las traducciones del README y añada instrucciones de instalación una vez que la primera publicación se haya completado correctamente.

Actualice la versión y todas las traducciones del CHANGELOG antes de cada publicación. No intente sobrescribir una versión publicada. La integración continua actual del repositorio solo verifica los cambios; no publica automáticamente en npm.

## Futuras publicaciones automatizadas

Después de la primera publicación, configure [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) para vincular el paquete al repositorio de GitHub y a un archivo de flujo de trabajo específico. Utilice un ejecutor alojado en GitHub y OIDC `id-token: write`, sin un token de npm de larga duración. Los requisitos documentados son Node >=22.14.0 y npm CLI >=11.5.1. Antes de activarlo, implemente y verifique el flujo de publicación y asegúrese de que la etiqueta, la versión de package.json y el commit probado coincidan.

La integración continua de GitHub Actions instala desde el archivo de bloqueo, comprueba los tipos, ejecuta las pruebas unitarias, compila el consumidor del archivo tarball real y ejecuta las pruebas de Chromium. La protección de ramas puede exigir la integración continua antes de fusionar; configúrela a medida que evolucionen las necesidades de mantenimiento con las contribuciones externas.
