---
description: Pausa campanha, conjunto ou anúncio específico. Sempre confirma antes.
---

# Pausar

1. Pergunte o nível: **campanha** · **conjunto** · **anúncio**.
2. Liste os itens ativos no nível escolhido (via Meta MCP).
3. Usuário escolhe qual pausar.
4. Mostre resumo (nome + gasto + CPA atual).
5. Pergunte: "Confirma pausar?"
6. Só após "sim", use `mcp__meta__ads_update_entity` para mudar status para PAUSED.
