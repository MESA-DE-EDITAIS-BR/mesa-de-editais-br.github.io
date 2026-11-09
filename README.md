# Mesa de Editais

Página de apresentação da **Mesa de Editais**: radar de editais culturais abertos, critérios de avaliação, cadastro do participante e acesso por e-mail e senha.

- Site: https://mesa-de-editais-br.github.io/
- Autor: Anderson Alves · Sapucaia do Sul / RS

## Estrutura
- `index.html` — a página completa (um arquivo só).
- `servidor/planilha_apps_script.gs` — servidor de cadastro e login (Google Apps Script ligado à planilha). Não contém senhas nem segredos: eles ficam nas Propriedades do script.

## Cadastro, login e senha (desde 09/11/2026)
A Mesa usa o **servidor da Central Marca & Estratégia Tecnologia** (um servidor para todos os apps):
- inscrição gravada na planilha da Central (aba Contas + licença "mesa-de-editais");
- confirmação do e-mail por código de 6 dígitos;
- senha repetida na inscrição e na troca;
- "Esqueci a senha" com código enviado ao e-mail cadastrado;
- nada de inscrição pelo WhatsApp.

Para ativar: implante `servidor/central.gs` do repositório da Central e cole o endereço `/exec` em `CONFIG.CENTRAL_URL` no `index.html`.
O antigo `servidor/planilha_apps_script.gs` ficou obsoleto e não precisa ser implantado.

Ferramenta de apoio. A aprovação depende exclusivamente da comissão de cada edital.
