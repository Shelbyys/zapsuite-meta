---
description: Métricas do dia atual em português simples, com os 3 insights principais.
---

# Relatório de Hoje

Use o agente `analista` para:

1. Buscar via `mcp__meta__ads_insights_*` os dados da conta `{{meta.adAccountId}}`
   no recorte **today** (timezone do usuário).
2. Trazer: gasto total, conversas/leads/vendas, CPM, CTR, CPA, top criativo do dia.
3. Devolver no formato definido no agente Analista.
4. **Não invente número.** Se a Meta não retornou, diga claramente.
