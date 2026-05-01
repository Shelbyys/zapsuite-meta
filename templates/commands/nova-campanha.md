---
description: Cria uma campanha completa (Campanha + 2 conjuntos + 4 anúncios + copies A/B) a partir de um playbook. Sempre pede confirmação antes de subir na Meta.
argument-hint: "[playbook=...] [budget=...] [duracao=...] [oferta=\"...\"]"
---

# Nova Campanha

Você vai conduzir o usuário pela criação de uma campanha completa.

## Passos obrigatórios (nesta ordem)

1. **Identifique o playbook.** Se vier nos argumentos, use direto. Se não,
   pergunte ao usuário entre os disponíveis em `~/.easy4u-trafego/playbooks/`.

2. **Chame o agente `briefador`** para garantir que oferta, público e orçamento
   fazem sentido. Pule essa etapa só se TODOS os argumentos vieram preenchidos.

3. **Carregue o YAML do playbook** de `~/.easy4u-trafego/playbooks/{playbook}.yaml`
   e renderize as variáveis com os dados do `CLAUDE.md` + briefing.

4. **Chame o agente `criativo`** para gerar copy + briefing de imagem para
   cada anúncio do playbook (mínimo 2 variações A/B).

5. **Mostre a árvore completa em texto**, formato:

```
CAMPANHA: {nome} · objetivo {X} · CBO R$ {budget}/dia · {duracao} dias

  CONJUNTO 1: {nome}
    público: {...}
    posicionamentos: {...}
    ANÚNCIO 1.1 (imagem): {headline} · {cta}
    ANÚNCIO 1.2 (imagem A/B): {headline} · {cta}
    ANÚNCIO 1.3 (vídeo 15s): {headline} · {cta}

  CONJUNTO 2: {nome}
    ...
```

6. **Pergunte:** "Posso subir essa estrutura na Meta? (sim / só conjunto 1 / cancelar)"

7. **Só após "sim" explícito**, use as tools `mcp__meta__ads_create_campaign`,
   `mcp__meta__ads_create_ad_set`, `mcp__meta__ads_create_ad` na ordem correta.
   Para cada criativo de imagem, **gere com nano-banana** primeiro, salve, e
   referencie no anúncio.

8. **Devolva os IDs** criados na Meta + link direto pro Gerenciador.

## Regras

- **Nunca** suba na Meta sem confirmação explícita.
- **Nunca** ultrapasse o limite hard de gasto do `CLAUDE.md`.
- Se faltar página/Instagram conectados, **avise e pare** — não tente contornar.
