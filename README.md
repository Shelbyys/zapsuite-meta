# Easy4u Tráfego AI

Sistema turn-key de gestão de tráfego pago via Claude Code. Sobe campanha completa na Meta a partir de playbooks testados — você só aprova.

## Instalação (cliente final)

```bash
npx @easy4u/trafego-ai init
```

O instalador faz tudo:
1. Verifica/instala Claude Code
2. Pede licença Easy4u
3. Abre o navegador para OAuth da Meta
4. Faz briefing de 6 perguntas sobre o negócio
5. Cria atalho no Desktop

Depois é só clicar no atalho **Easy4u Tráfego** no Desktop ou rodar:

```bash
easy4u-trafego
```

## Comandos

| Comando | O que faz |
|---|---|
| `easy4u-trafego` | Abre o menu interativo (default) |
| `easy4u-trafego init` | Instalação inicial |
| `easy4u-trafego login` | Reconecta a conta Meta |
| `easy4u-trafego doctor` | Diagnóstico (MCP, OAuth, Claude Code) |
| `easy4u-trafego update` | Atualiza templates e playbooks |

## Dentro do Claude Code

Slash commands disponíveis após o `init`:

- `/nova-campanha` — sobe campanha completa
- `/relatorio-hoje` — métricas do dia
- `/relatorio-7dias` — análise da semana
- `/top-criativos` — quais criativos vencem
- `/otimizar` — sugestões baseadas em regras
- `/novo-criativo` — gera imagem nova com nano-banana
- `/pausar` — pausa campanha/conjunto/anúncio
- `/ajuda` — lista tudo

## Desenvolvimento

```bash
git clone https://github.com/easy4u/trafego-ai.git
cd trafego-ai
npm install
npm link
easy4u-trafego init    # testa local
```

## Licença

UNLICENSED — produto proprietário Easy Solutions LTDA.
