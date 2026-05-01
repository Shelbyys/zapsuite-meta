---
description: Diagnóstico da conta Meta do operador. Detecta o que falta (Business Manager, conta de anúncios, página, Instagram, pixel) e guia passo a passo pra resolver. Roda na primeira vez ou quando algo não tá funcionando.
---

# Configurar Conta Meta

Você vai diagnosticar a conta Meta do operador e mostrar **o que falta**
pra ele conseguir subir campanhas no ZapSuite Meta.

## Passos obrigatórios

### 1. Listar contas de anúncios
Use `mcp__meta__ads_get_ad_accounts`.

- **Sem nenhuma conta?** Pare e oriente:
  > "Você ainda não tem conta de anúncios na Meta. Faça assim:
  > 1. Entre em https://business.facebook.com
  > 2. Crie uma Business Manager (se não tiver)
  > 3. Em 'Configurações do Negócio' → 'Contas' → 'Contas de Anúncios' → 'Adicionar' → 'Criar nova conta de anúncios'
  > 4. Defina BRL como moeda
  > 5. Volte aqui e roda /configurar-conta de novo"
  >
  > **Pare aqui.** Sem conta, não dá pra continuar.

- **1 conta:** confirma com o operador "vou usar essa conta: <nome>?".
- **2+ contas:** mostra todas e pede pra escolher a default. Salva no manifest local.

### 2. Listar páginas conectadas
Use `mcp__meta__ads_get_pages_for_business`.

- **Sem página?** Oriente:
  > "Toda campanha precisa estar amarrada a uma Página do Facebook.
  > Crie uma em https://www.facebook.com/pages/create — leva 2 minutos.
  > Depois conecte ela à Business Manager em Configurações → Contas → Páginas."

- **Múltiplas páginas:** pergunte qual usar como default.

### 3. Verificar Instagram (opcional mas recomendado)
Use `mcp__meta__ads_get_ad_entities` filtrando por instagram_id no nível account.

- Se a conta não tem perfil Instagram conectado, oriente a conectar pra
  poder rodar Stories/Reels Instagram (a estrutura padrão usa esses
  posicionamentos).

### 4. Verificar saldo / forma de pagamento
Use `mcp__meta__ads_get_dataset_details` ou query equivalente. Se não
houver método de pagamento configurado, oriente:
> "Antes de subir campanha, configure forma de pagamento:
> business.facebook.com → Configurações → Pagamentos → Adicionar."

### 5. Salvar configuração no arquivo local
Atualize `~/.zapsuite-meta/config.json` com:
```json
{
  "meta": {
    "activeAdAccountId": "act_1234567890",
    "activeAdAccountName": "Minha Conta",
    "activePageId": "1234567890",
    "activePageName": "Minha Página",
    "activeInstagramId": "1234567890",
    "currency": "BRL"
  }
}
```

(Use Bash + jq pra fazer o merge sem perder o resto do config.)

### 6. Resumo final
Mostre uma tabelinha:
```
✓ Business Manager:  Easy Solutions (1234567890)
✓ Conta de Anúncios: Minha Conta (act_1234567890) · BRL · saldo R$ X
✓ Página:            Minha Página (1234567890)
✓ Instagram:         @minhaconta (conectado)
✓ Pagamento:         Cartão final 4242

Tudo pronto. Pode subir campanha agora.
```

Se faltar algum item, marque com ✗ e mostre o que fazer.

## Regras

- **Nunca** crie Business Manager, Página ou Conta de Anúncios automaticamente
  pelo cliente — orienta a fazer manual no painel Meta.
- **Nunca** pule o operador se faltar página — a campanha vai falhar.
- Se a Meta MCP retornar 401/permissão negada, oriente:
  > "Sua autorização do Facebook expirou. Sai do Claude Code, roda
  > `zsm login` no terminal e autoriza de novo no navegador."
