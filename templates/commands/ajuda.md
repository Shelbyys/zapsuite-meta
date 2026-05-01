---
description: Mostra todos os comandos disponíveis e exemplos de uso em português.
---

# Ajuda — ZapSuite Meta

## Comandos disponíveis

- `/nova-campanha` — sobe campanha completa a partir de um playbook
- `/relatorio-hoje` — métricas do dia atual
- `/relatorio-7dias` — análise da semana
- `/top-criativos` — quais criativos estão vencendo
- `/otimizar` — sugere ajustes baseados em regras
- `/novo-criativo` — gera nova variação (imagem + copy)
- `/pausar` — pausa campanha, conjunto ou anúncio
- `/ajuda` — esta tela

## Como falar com a IA

Você pode usar slash command **OU** falar em português normal:

- "Cria uma campanha pra esse fim de semana, R$ 50/dia"
- "Como tá o resultado de hoje?"
- "Pausa a campanha que tá gastando muito sem retorno"
- "Faz uma imagem nova pro anúncio que tá com CTR baixo"

A IA escolhe o playbook, regra ou agente certo automaticamente.

## Mídias

Suas fotos e vídeos ficam em:
```
~/.zapsuite-meta/midias/
```

Pra adicionar mais: sai do Claude, roda `zapsuite-meta` no terminal,
escolhe **📁 Minhas mídias** → o Finder abre, você arrasta, pronto.

A IA **nunca gera imagem com IA** — sempre usa o que você forneceu.

## Limites de segurança

A IA **nunca** vai:
- Criar/pausar/alterar nada na Meta sem você aprovar.
- Ultrapassar o limite hard de gasto diário definido na instalação.
- Subir conteúdo sem te mostrar antes.
- Inventar arquivo que não existe na sua pasta de mídias.

Se algo parecer errado, abra novo chat e diga "para tudo".
