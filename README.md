# ZapSuite Meta

Sistema turn-key de gestão de tráfego pago no Facebook/Instagram Ads via Claude Code. Sobe campanha completa a partir de playbooks validados, usando suas próprias fotos e vídeos — você só aprova.

## Pré-requisitos (faz 1 vez)

1. **Node.js 20+** — https://nodejs.org
2. **Claude Code instalado e logado** — `npm i -g @anthropic-ai/claude-code` + `claude` (uma vez pra autenticar)
3. **Assinatura Anthropic Pro/Team/Max** — `claude.ai`
4. **Conector Meta ativo** em [claude.ai/settings/connectors](https://claude.ai/settings/connectors) — clica em "Connect" no Meta, faz OAuth no Facebook
5. **Email cadastrado na Easy4u** com licença ativa pro ZapSuite Meta

## Instalação (cliente final)

```bash
npm i -g github:Shelbyys/zapsuite-meta && zsm init
```

O wizard pergunta:
1. Seu email Easy4u
2. Como quer ser chamado
3. Quais produtos você promove (multi-select dos 16)
4. Limite máximo de gasto diário (R$)
5. Telemetria opt-in

Depois é só clicar no atalho **ZapSuite Meta** no Desktop ou rodar `zsm`.

## Comandos

| Comando | O que faz |
|---|---|
| `zsm` | Menu interativo (default) |
| `zsm init` | Instalação inicial |
| `zsm login` | Reconecta a conta Meta |
| `zsm switch` | Trocar de conta de anúncios ativa |
| `zsm doctor` | Diagnóstico do sistema |
| `zsm update` | Atualiza CLI + templates |

`zsm` é alias de `zapsuite-meta` — os dois funcionam igual.

## Dentro do Claude Code

Slash commands disponíveis após o `init`:

- `/configurar-conta` — diagnóstico passo-a-passo da conta Meta (1ª vez)
- `/nova-campanha` — sobe campanha completa (1-X-1 ABO)
- `/relatorio-hoje` — métricas do dia em português simples
- `/relatorio-7dias` — análise da semana
- `/top-criativos` — quais criativos vencem
- `/otimizar` — sugestões baseadas em regras (CPM, CTR, frequência)
- `/novo-criativo` — variante A/B de um anúncio existente
- `/pausar` — pausa campanha, conjunto ou anúncio
- `/ajuda` — lista tudo

## Como funciona

Wrapper em volta do Claude Code:

```
[zsm CLI]  →  abre menu, pergunta o que fazer
              │
              ▼
[Claude Code]  →  conversa com você + executa tools
              │
              ▼
[MCP Facebook]  →  cria campanha/conjunto/ad na Meta
```

Easy4u valida sua licença (Supabase) e fornece os playbooks. Anthropic faz a IA.
Você paga sua assinatura Anthropic + o gasto que escolher na Meta.

## 16 produtos pré-programados

Hay Hair · Movi Mint · Velmo Black Drink · Velmo Black · Ton (regras especiais) ·
Creatina Gummy · Creagym · Celuglow · Calminol · Fiber Slim · Clarize ·
Termo Drink · Skin Fit · Inti Feme · Inti Masc · Quero +.

Cada um com estrutura `1-X-1` em ABO, objetivo Engajamento, Story+Feed.
Mesmo método validado pelo time Easy4u.

## Atualização

Auto-detecta versão nova no GitHub Releases. Aviso aparece no topo do menu.
Pra atualizar:

```bash
zsm update
```

Roda `npm i -g github:Shelbyys/zapsuite-meta` e re-renderiza templates locais. Sua config e mídias são preservadas.

## Desenvolvimento

```bash
git clone https://github.com/Shelbyys/zapsuite-meta.git
cd zapsuite-meta
npm install
npm link
zsm init    # testa local (use email começando com 'dev+' pra modo dev)
```

## Licença

UNLICENSED — produto proprietário Easy Solutions LTDA. Pra usar, precisa de licença ativa via email cadastrado.
