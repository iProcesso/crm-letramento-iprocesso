# CRM Letramento iProcesso

CRM comercial leve e responsivo para acompanhar oportunidades, eventos, participantes e receita dos programas de Letramento em IA da iProcesso.

## O que o MVP entrega

- visão do mês por responsável, oferta/evento e etapa;
- pipeline total e ponderado;
- pessoas previstas e confirmadas;
- receita confirmada e taxa de confirmação;
- alertas de próximas ações vencidas;
- cadastro, edição e exclusão de oportunidades;
- visual otimizado para notebook e celular;
- funcionamento local/offline como PWA;
- exportação CSV;
- integração CRUD com Google Sheets por Google Apps Script;
- prompt pronto para um Projeto GPT atuar como diretor comercial.

## Modelo de dados

A planilha usa a aba `Oportunidades`, com uma linha por oportunidade. Os cabeçalhos estão definidos em `apps-script/Code.gs` e documentados no prompt do projeto.

## Execução local

Use qualquer servidor estático. Exemplo:

```bash
python3 -m http.server 8080
```

Abra `http://localhost:8080`.

## Integração com Google Sheets

1. Abra a planilha oficial no Google Sheets.
2. Acesse Extensões → Apps Script.
3. Cole o conteúdo de `apps-script/Code.gs`.
4. Em Configurações do projeto → Propriedades do script, crie:
   - `SPREADSHEET_ID`: ID da planilha.
   - `CRM_API_KEY`: uma chave longa e exclusiva.
5. Execute `setupCrm` uma vez e autorize o script.
6. Implante como Aplicativo da Web, executando como o proprietário.
7. Restrinja o acesso conforme a política da iProcesso. Não publique uma planilha com dados comerciais sem controle de acesso.
8. No CRM, abra **Configurar**, informe a URL do Web App e a chave.

A chave é mantida somente em `sessionStorage` e precisa ser informada novamente em uma nova sessão. Para uma operação maior, substitua a chave compartilhada por autenticação individual e trilha de auditoria.

## Projeto GPT

Use o conteúdo de `PROMPT_PROJETO_GPT.md` nas instruções do Projeto GPT. Conecte o Google Drive/Sheets ao projeto e disponibilize apenas a planilha do CRM.

## Próxima evolução recomendada

- autenticação individual e papéis administrador/vendedor/leitura;
- histórico imutável de mudanças;
- metas por responsável e por oferta;
- capacidade máxima por evento/turma;
- anexos e links de proposta;
- notificações de follow-up;
- integração autorizada com e-mail e WhatsApp;
- relatório de motivos de perda e tempo médio por etapa.
