---
description: Métricas do dia atual em português simples, com os 3 insights principais.
---

# Relatório de Hoje

Use o agente `analista` para:

1. Descobrir a **conta de anúncios ativa** via `mcp__meta__ads_get_ad_accounts`
   (se houver mais de uma, perguntar ao cliente).
2. Buscar via `mcp__meta__ads_get_ad_entities` (level=`account`) com
   `date_preset=today` os dados do dia.
3. Trazer: gasto total, post engagements, CPM, CTR, CPE, top criativo do dia.
4. Devolver no formato definido no agente Analista.
5. **Não invente número.** Se a Meta não retornou, diga claramente.
