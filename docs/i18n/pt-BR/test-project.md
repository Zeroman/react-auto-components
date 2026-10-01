# Projeto consumidor e de testes independente

[English](../../../test-project/README.md) | [简体中文](../zh-CN/test-project.md) | [繁體中文](../zh-TW/test-project.md) | [日本語](../ja/test-project.md) | [한국어](../ko/test-project.md) | [Español](../es/test-project.md) | [Français](../fr/test-project.md) | [Deutsch](../de/test-project.md) | **Português (Brasil)** | [Русский](../ru/test-project.md)

Este projeto instala a biblioteca de componentes a partir de um arquivo tarball local, com dependências e compilações independentes. Ele não usa aliases para o código-fonte.

A demonstração detecta automaticamente o idioma do navegador, com o inglês como fallback. Escolha um idioma no cabeçalho ou nas Configurações globais; a seleção é lembrada entre recarregamentos da página. Selecione Auto para seguir novamente o navegador. Dez idiomas são suportados. As páginas preenchem a viewport, com tabelas e painéis longos rolando dentro de suas próprias áreas.

Cada página de exemplo inclui um botão **Ver código** que abre seu arquivo-fonte real em um diálogo, com abas de arquivos, cópia em um clique e link para o GitHub.

Na raiz do repositório, execute `pnpm install --frozen-lockfile` e `pnpm prepare:test-project`, depois `pnpm --dir test-project dev`.

- `pnpm --dir test-project build`: verifica os tipos públicos e cria uma compilação de produção.
- `pnpm exec playwright install chromium`: instala o navegador no primeiro uso.
- `pnpm --dir test-project test`: executa os testes de interação do Chromium (inicia automaticamente um servidor separado na porta 4174).
- Após alterar a biblioteca, execute `pnpm prepare:test-project` novamente para atualizar a dependência do arquivo tarball com hash do conteúdo no nome.

Os testes de navegador em `tests/components.spec.ts` cobrem CRUD, validação de campos e novas tentativas de envios com falha, persistência de configurações, rascunhos e foco, popovers, abas aninhadas, rolagem de 10.000 linhas, paginação no servidor, medições de expansão, larguras de colunas, downloads e layouts para dispositivos móveis. As capturas de tela são salvas em `test-results/`.

A demonstração de altura restante fica na aba **AutoTable → Altura restante**. A URL legada `http://127.0.0.1:4173/?demo=auto-height` abre a mesma página e seleciona essa aba. O exemplo permite alternar entre Flex/Grid, adicionar/remover conteúdo acima da tabela, mostrar/ocultar a tabela e alterar a paginação e o número de linhas. `tests/auto-height.spec.ts` mede os limites no navegador e a altura da área de rolagem para verificar o layout do espaço restante, o redimensionamento dinâmico, a recuperação da virtualização e a compatibilidade com altura fixa.

Os testes de navegador iniciam um novo servidor Vite na porta 4174 em vez de reutilizar a demonstração de desenvolvimento na porta 4173. O script de reempacotamento notifica os servidores de demonstração existentes para que resolvam o pacote recém-instalado, evitando componentes desatualizados.

As configurações globais são separadas do conteúdo dos exemplos e implementadas em `src/GlobalSettings.tsx`. Abra o painel pela barra lateral ou pelo controle no canto superior direito. O exemplo atual permanece montado enquanto você altera layout, densidade, largura dos rótulos ou tema.
