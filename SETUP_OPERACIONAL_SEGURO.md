# Configuração do CRM operacional seguro

O código do aplicativo pode continuar público. Os dados reais só são liberados quando o backend valida uma conta Google que esteja na lista de usuários autorizados.

## 1. Preparar o Google Apps Script

1. Abra a planilha `CRM Letramento IA — Pipeline (ATUAL)`.
2. Acesse **Extensões → Apps Script**.
3. Substitua o conteúdo pelo arquivo `apps-script/Code.gs` deste repositório.
4. Nas propriedades do script, configure:

| Propriedade | Valor |
|---|---|
| `SPREADSHEET_ID` | `1TPOwkH_5gMDsk7mZdGKEXoOdOf8B00KssAbXLYxDEJk` |
| `AUTH_MODE` | `google` |
| `GOOGLE_CLIENT_ID` | Client ID OAuth criado para o CRM |
| `CRM_ALLOWED_EMAILS` | E-mails autorizados separados por vírgula |

5. Execute `setupCrm` uma vez.
6. Implante como **Aplicativo da Web**, executando como o proprietário.
7. Para permitir que o frontend envie o token, selecione o público tecnicamente necessário do Web App. O acesso aos dados continuará bloqueado pela validação do token e da lista de e-mails.

## 2. Criar o OAuth Client ID

No Google Cloud Console:

1. Crie ou selecione um projeto da iProcesso.
2. Configure a tela de consentimento OAuth.
3. Crie uma credencial **OAuth Client ID → Web application**.
4. Adicione como origem JavaScript autorizada:
   - `https://iprocesso.github.io`
5. Copie o Client ID. Ele é público e pode ser informado na configuração do CRM.

Nunca coloque Client Secret, senha ou chave privada no GitHub.

## 3. Configurar cada navegador

1. Abra o CRM publicado.
2. Clique em **Configurar**.
3. Selecione `Google — operacional seguro`.
4. Informe a URL do Web App e o Google OAuth Client ID.
5. Salve e use o botão **Entrar com Google**.

## Usuários iniciais sugeridos

- `kleber.zumiotti@iprocesso.com`
- `samanta.fumagalli@iprocesso.com`
- `advocacia@danielferreirasia.adv.br`

Cada usuário precisa ter uma Conta Google associada ao e-mail autorizado. Para adicionar outra pessoa, inclua seu e-mail em `CRM_ALLOWED_EMAILS`.
