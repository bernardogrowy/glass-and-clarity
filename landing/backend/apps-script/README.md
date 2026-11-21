# Backend do MVP: lista de espera + aviso de 3 indicações

Google Apps Script ligado a uma planilha. Custo zero, sem cartão. Cada inscrição vira uma
linha na planilha e, quando alguém chega a **3 indicados**, você recebe **um e-mail** no
Gmail da conta que publicar o script.

## Publicar (cerca de 10 minutos)

1. Crie uma planilha em <https://sheets.google.com> (nome livre, ex.: "Hi · Lista de espera").
2. Na planilha: **Extensões → Apps Script**. Apague o conteúdo do editor e cole todo o `Code.gs`.
3. Selecione a função **`setup`** no topo e clique em **Executar**. Aceite as permissões
   (planilha e envio de e-mail). Isso cria a aba `Leads`.
4. Rode também **`sendTestEmail`**. Um e-mail de teste deve chegar na sua caixa. Se não chegar,
   o aviso real também não chegaria; veja a pasta de spam.
5. **Implantar → Nova implantação → Tipo: App da Web**
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
   - Copie a URL que termina em `/exec`.
6. Abra `landing/config.js` e cole a URL em `endpoint`.

## Conferir que funciona

```bash
curl -L -X POST "COLE_A_URL_/exec_AQUI" -H "Content-Type: text/plain" \
  -d '{"email":"teste1@exemplo.com","name":"Teste","source":"landing-promocao"}'
```

Deve responder `{"ok":true,"referralCode":"TESTE-XXXX"}` e aparecer uma linha na planilha.
Para ver o aviso, repita 3 vezes com e-mails diferentes e `"ref":"TESTE-XXXX"` (o código
devolvido). No terceiro, chega o e-mail. Depois apague essas linhas de teste da planilha.

## Como funciona

| Regra | Comportamento |
|---|---|
| E-mail repetido | Devolve o mesmo código e não conta de novo |
| `a.na+x@gmail.com` e `ana@gmail.com` | Tratados como a mesma pessoa |
| Auto-indicação | Ignorada |
| Código de indicação inexistente | Cadastra normalmente, sem contar para ninguém |
| 3º indicado | Um único e-mail de aviso; do 4º em diante só conta |
| Falha no envio do e-mail | A inscrição funciona mesmo assim; rode `retryPendingNotifications` |

Colunas da aba `Leads`: `createdAt, email, emailKey, name, level, source, referralCode,
referredBy, referralCount, notifiedAt`. Não renomeie nem reordene as colunas.

## Pontos de atenção

- **Contagem é por cadastro, não por ativação.** A landing promete "3 amigos ativam a conta",
  mas a ativação acontece dentro do app, que este script não enxerga. O e-mail de aviso lista os
  3 indicados para você conferir (se são pessoas reais, se ativaram) antes de liberar o semestre.
- **Mudou o código? Faça uma nova versão.** O endereço `/exec` só passa a usar o código novo em
  **Implantar → Gerenciar implantações → Editar → Nova versão**.
- **E-mail de aviso:** vai para a conta que publicou. Para outro endereço, em
  **Configurações do projeto → Propriedades do script**, crie `NOTIFY_EMAIL`.
- **Limites do Google:** contas pessoais enviam até ~100 e-mails/dia por script. Para o MVP
  sobra: o script só envia 1 e-mail por pessoa que chegar a 3.
- **Sem limite de taxa.** Qualquer um pode chamar a URL. Para o MVP é aceitável; se virar alvo
  de abuso, a conferência manual do e-mail de aviso é a barreira.
- **Privacidade:** a planilha guarda e-mails. Não compartilhe a planilha com ninguém além de
  quem precisa e não publique a URL do editor.

## Testar a lógica sem o Google

```bash
node landing/backend/apps-script/test.mjs
```

Roda 28 verificações da lógica (indicações, duplicatas, aviso único, falha de e-mail, fórmulas
maliciosas) com uma planilha e um e-mail de mentira.

## Migrar depois

O contrato com a landing está documentado em `landing/config.js`. Trocar por Firebase Functions
ou outro servidor é só implementar o mesmo contrato e trocar o `endpoint`.
