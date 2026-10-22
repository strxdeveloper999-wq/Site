# Code Studio — projeto completo (MVP)

Aplicativo web responsivo de programação com editor, projetos, arquivos, tarefas, pré-visualização HTML, verificações estáticas e chat com um endpoint de IA compatível com a API da OpenAI. O projeto não copia a marca ou identidade oficial do Codex.

## O que funciona nesta versão

- Interface responsiva com navegação, tema claro/escuro e modo compacto.
- Criação de projetos e arquivos, edição de texto e exportação.
- Persistência de projetos/conversas no `localStorage` do navegador.
- Pré-visualização de HTML/CSS em `iframe sandbox` sem permissões de scripts.
- Lista de tarefas por projeto.
- Verificações estáticas simples para JSON, HTML e balanceamento de chaves JS/JSX.
- Chat real com modelos expostos por um endpoint compatível com OpenAI, quando configurado.
- Backend Express que guarda credenciais no servidor e limita tamanho/quantidade das mensagens.

## Limites importantes

Este é um MVP, não um clone integral de um agente de programação de produção:
- O terminal é simulado e **não executa comandos do sistema**.
- Os testes são verificações estáticas simples, não compilação ou testes unitários.
- A IA pode sugerir código, mas não pode aplicar mudanças aos arquivos por conta própria nesta versão.
- Projetos ficam no navegador e não sincronizam entre dispositivos.
- Não há autenticação multiusuário, banco remoto, GitHub OAuth, sandbox de execução de código nem sistema de cobrança.
- Antes de expor publicamente, adicione autenticação, rate limiting, logs adequados, limites de uso e políticas de privacidade.

## Requisitos

- Node.js 20 ou superior recomendado.
- npm.
- Um provedor compatível com API OpenAI: por exemplo Ollama local ou um provedor de inferência hospedado. Para acesso público, o servidor hospedado precisa conseguir alcançar o endpoint escolhido.

## Executar localmente

1. Extraia o ZIP e entre na pasta `code-studio-full`.
2. Instale as dependências:

   ```bash
   npm install
   ```

3. Copie `.env.example` para `.env`.
4. Configure o provedor (veja abaixo).
5. Em um terminal, rode o backend:

   ```bash
   npm start
   ```

6. Em outro terminal, rode o front-end:

   ```bash
   npm run dev
   ```

7. Abra o endereço mostrado pelo Vite, normalmente `http://localhost:5173`.

O backend usa a porta `8787`. Durante o desenvolvimento, o Vite encaminha `/api` para o backend.

## IA local com Ollama

1. Instale o Ollama no computador que executará o modelo.
2. Inicie o serviço e baixe um modelo de código que caiba na sua máquina, por exemplo:

   ```bash
   ollama pull qwen2.5-coder:7b
   ```

3. Em `.env`, use:

   ```dotenv
   PORT=8787
   CLIENT_ORIGIN=http://localhost:5173
   AI_BASE_URL=http://127.0.0.1:11434/v1
   AI_API_KEY=ollama
   AI_MODEL=qwen2.5-coder:7b
   ```

4. Reinicie `npm start`. Verifique `http://localhost:8787/api/health`.

O nome do modelo precisa corresponder a um modelo disponível no Ollama. Modelos maiores precisam de mais RAM/VRAM. Se a interface estiver hospedada na nuvem, `127.0.0.1` aponta para o servidor na nuvem, não para o seu computador; nesse caso, use um endpoint acessível pelo servidor ou execute o backend no computador local.

## Usar outro provedor compatível

Edite `.env` no servidor:

```dotenv
AI_BASE_URL=https://SEU-ENDPOINT-COMPATIVEL/v1
AI_API_KEY=sua_chave_no_servidor
AI_MODEL=nome-exato-do-modelo
```

Use a URL base e o modelo documentados pelo seu provedor. Não coloque segredos em variáveis `VITE_*`, no React ou em arquivos enviados ao navegador. Nunca compartilhe o `.env`.

## Build de produção

```bash
npm run build
NODE_ENV=production npm start
```

O servidor Express serve `dist` quando `NODE_ENV=production`. Configure `CLIENT_ORIGIN` para o domínio correto se separar front-end e backend; ajuste CORS conforme necessário. Use HTTPS.

## Hospedar online

Você precisa hospedar **o frontend e o backend** em um ambiente Node.js que possa executar `npm install`, `npm run build` e `npm start` e que permita configurar variáveis secretas de ambiente. O provedor de hospedagem deve manter o processo Node ativo.

Variáveis de ambiente de produção:
- `NODE_ENV=production`
- `PORT` (normalmente fornecida pela hospedagem)
- `CLIENT_ORIGIN` (origem do site, se necessário)
- `AI_BASE_URL`
- `AI_API_KEY`
- `AI_MODEL`

Para um endpoint de IA local, o backend na nuvem precisa ter conectividade de rede até esse endpoint. Não exponha Ollama diretamente à internet sem autenticação e controles de rede.

## Segurança antes de produção

- Adicionar autenticação e autorização antes de armazenar projetos privados.
- Implementar rate limiting e quotas no `/api/chat`.
- Usar HTTPS e secrets do provedor de hospedagem.
- Não executar código gerado pela IA no processo principal.
- Para execução real de testes/terminal, usar workers/containers isolados, rede desativada por padrão, limites de CPU/memória/tempo, diretórios temporários e permissões mínimas.
- Rever as regras de CORS e Helmet de acordo com o domínio real.
- Implementar banco de dados e backups caso os dados precisem persistir entre dispositivos.

## Estrutura

```text
code-studio-full/
├── index.html
├── package.json
├── vite.config.js
├── .env.example
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   └── styles.css
└── server/
    └── index.js
```


## Uso em celular (Android e iPhone)

A interface adapta o editor, a lista de arquivos, formulários e diálogos para telas pequenas, com áreas de toque maiores e suporte às áreas seguras do aparelho. O manifesto web permite abrir o site em modo de aplicativo quando instalado pelo navegador.

- **Teste local na mesma rede:** rode `npm run dev -- --host 0.0.0.0`, descubra o IP local do computador e abra `http://IP-DO-COMPUTADOR:5173` no celular conectado à mesma rede Wi-Fi.
- **Android:** publique o site em HTTPS, abra-o no Chrome e use o menu do navegador → *Instalar app* ou *Adicionar à tela inicial*.
- **iPhone:** publique o site em HTTPS, abra-o no Safari e toque em Compartilhar → *Adicionar à Tela de Início*.

Nota: o manifesto prepara a instalação em modo de aplicativo, mas ainda não há cache offline/service worker nem ícones próprios. Para distribuição pública, configure HTTPS e crie ícones nos tamanhos recomendados.
