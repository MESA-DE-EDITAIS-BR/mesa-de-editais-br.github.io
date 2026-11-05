# Mesa de Editais

Página de apresentação da **Mesa de Editais**: radar de editais culturais abertos, critérios de avaliação, cadastro do participante e acesso por e-mail e senha.

- Site: https://mesa-de-editais-br.github.io/
- Autor: Anderson Alves · Sapucaia do Sul / RS

## Estrutura
- `index.html` — a página completa (um arquivo só).
- `servidor/planilha_apps_script.gs` — servidor de cadastro e login (Google Apps Script ligado à planilha). Não contém senhas nem segredos: eles ficam nas Propriedades do script.

## Ativar o cadastro e o login
1. Criar a planilha "Mesa de Editais • Participantes" e colar o `.gs` em Extensões → Apps Script.
2. Em Propriedades do script: `CRIADOR_EMAILS` e `PIMENTA`.
3. Implantar como App da Web (Executar como: Eu · Acesso: Qualquer pessoa).
4. Colocar o endereço `/exec` em `CONFIG.CADASTRO_URL` no `index.html`.

Ferramenta de apoio. A aprovação depende exclusivamente da comissão de cada edital.
