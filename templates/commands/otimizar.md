---
description: Roda o agente otimizador sobre os últimos 7 dias e sugere ações (pausar / trocar / duplicar). Sempre pede confirmação antes de executar.
---

# Otimizar

Delegue para o agente `otimizador`.

Ele vai:
1. Ler insights dos últimos 7 dias via Meta MCP.
2. Aplicar as regras do `CLAUDE.md` (CPM, CTR, CPA, frequência).
3. Listar sugestões numeradas com justificativa.
4. **Pedir aprovação por item** antes de executar qualquer alteração na Meta.

Se o usuário aprovar, use as tools `mcp__meta__ads_update_entity` ou
`mcp__meta__ads_activate_entity` conforme a ação.
