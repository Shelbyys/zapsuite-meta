---
description: Sobe campanha completa na Meta seguindo a estrutura pré-programada do produto (1-X-1 em ABO, objetivo Engajamento). Sempre pede confirmação antes de subir.
argument-hint: "playbook=<id-do-produto>"
---

# Nova Campanha

Você vai conduzir o usuário pela criação de uma campanha completa para um
**produto pré-cadastrado**, usando **as fotos e vídeos do próprio cliente**
(nunca gere imagem com IA).

A estrutura **vem do YAML** do playbook — não invente nem altere parâmetros
sem que o cliente peça explicitamente.

## Passos obrigatórios (nesta ordem)

### 1. Carregue o playbook
Leia `~/.zapsuite-meta/playbooks/{playbook}.yaml`. Se o arg `playbook=` não
veio, liste os disponíveis e pergunte qual.

Os campos relevantes são:
- `nome`, `estrutura` (ex: "1-5-1"), `objetivo` (POST_ENGAGEMENT)
- `orcamento_tipo: ABO` (ad set budget optimization — orçamento por conjunto)
- `orcamento`: `diario_total_min/max`, `por_conjunto_min/max`, `num_conjuntos`, `num_anuncios_por_conjunto`
- `publico`: `generos`, `idade_min`, `idade_max`, `idade_max_aberta` (= 65+), `estilo: aberto`
- `posicionamentos`: `[story, feed]`
- `criativo.tipos_aceitos`: `[imagem, video_curto]`
- `observacoes`, `regras_otimizacao_especiais` (se houver)

### 2. Liste as mídias do cliente
```bash
ls -la ~/.zapsuite-meta/midias/upload/ ~/.zapsuite-meta/midias/produto/ ~/.zapsuite-meta/midias/ambiente/ ~/.zapsuite-meta/midias/equipe/
```

Você precisa de pelo menos **1 mídia** (1 anúncio é replicado nos N conjuntos
do ABO). Se vazia, **pare e oriente**:
> "Você ainda não colocou foto/vídeo. Sai do Claude, roda `zapsuite-meta`
> no terminal, escolhe '📁 Minhas mídias' e arrasta suas mídias."

### 3. Pergunte qual mídia usar
Mostre nome, tamanho e tipo (imagem/vídeo) de cada arquivo disponível.
Cliente escolhe **1** mídia que vai virar o anúncio do playbook.

Se o playbook indica preferência por vídeo (ex: Movi Mint), sugira priorizar
mídia de vídeo. Mas a decisão final é do cliente.

### 4. Pergunte a copy
A copy do anúncio (texto principal) **não vem do playbook** — pergunte ao
cliente:
> "Que texto/headline vai no anúncio? (1 frase curta, foco em benefício ou oferta)"

Se ele pedir sugestão, chame o agente `redator` passando: produto, mídia
escolhida, público.

### 5. Mostre a árvore COMPLETA em texto

```
CAMPANHA: {nome do produto} · {data}
   Objetivo: ENGAJAMENTO
   Tipo de orçamento: ABO (orçamento por conjunto)
   Posicionamentos: Story + Feed
   Total/dia estimado: R$ {num_conjuntos × por_conjunto_min} a R$ {num_conjuntos × por_conjunto_max}

   PÚBLICO (mesmo em todos os {num_conjuntos} conjuntos):
     Gêneros: {generos}
     Idade: {idade_min}–{idade_max}{+ se aberta}
     Estilo: aberto (sem interesses; só idade/gênero)

   CONJUNTO 1: "{produto} · Conjunto 1"
     Orçamento: R$ {por_conjunto}/dia
     ANÚNCIO 1.1: 📷/🎬 {arquivo} · "{copy do cliente}"

   CONJUNTO 2: "{produto} · Conjunto 2"
     ... idêntico, mesmo público, mesma mídia/copy
   ...
   CONJUNTO N: idem
```

A duplicação dos conjuntos é **proposital** — é o método 1-X-1: vários conjuntos
idênticos no ABO pra Meta achar quem entrega melhor pra mesma criativo.

### 6. Pergunte
> "Posso subir essa estrutura na Meta? (sim / cancelar / ajustar algo)"

### 7. Após "sim" explícito, suba na Meta nesta ordem

1. **Upload da mídia 1 vez** via tool da MCP Facebook (`mcp__claude_ai_META__ads_*`).
   Registre o `image_hash` ou `video_id`.
2. **Crie a campanha** (`ads_create_campaign`) com objetivo POST_ENGAGEMENT,
   sem CBO (`buying_type=AUCTION`, sem `budget_*` na campanha).
3. **Crie os N conjuntos** (`ads_create_ad_set`), cada um com:
   - `daily_budget` = `por_conjunto` (em centavos: ×100)
   - `optimization_goal=POST_ENGAGEMENT`
   - `targeting`: gênero/idade do playbook, sem `interests`
   - `placements`: Story + Feed (Facebook + Instagram)
4. **Crie 1 anúncio em cada conjunto** (`ads_create_ad`) referenciando o mesmo
   `image_hash`/`video_id` e o mesmo texto.

### 8. Salve manifest
Em `~/.zapsuite-meta/campanhas/{data}_{playbook}/manifest.json`:
```json
{
  "campaign_id": "120210...",
  "playbook": "hay-hair",
  "estrutura": "1-5-1",
  "ad_sets": [
    { "id": "...", "name": "Hay Hair · Conjunto 1", "daily_budget": 7.00 }
  ],
  "ads": [
    {
      "id": "...",
      "ad_set_id": "...",
      "image_hash": "abc123",
      "source_file": "midias/upload/IMG_2031.jpg",
      "copy": "..."
    }
  ],
  "created_at": "2026-05-01T..."
}
```

### 9. Devolva os IDs e o link do Gerenciador
```
✓ Campanha criada (ID 120210...)
✓ {N} conjuntos · R$ {total}/dia
✓ {N} anúncios (mesma mídia replicada)
→ https://business.facebook.com/adsmanager/manage/campaigns?act={account_id}
```

## Regras invioláveis

- **Nunca** suba na Meta sem confirmação explícita.
- **Nunca** ultrapasse o limite hard de gasto do `CLAUDE.md`.
- **Nunca** use mídia que não está na pasta do cliente.
- **Nunca** gere imagem com IA — sempre peça arquivo real.
- **Nunca** altere `num_conjuntos` ou `por_conjunto` sem pedido explícito do cliente.
- **Nunca** adicione interesses ao público — o playbook diz "aberto".
- Para a **Ton**: leia `regras_otimizacao_especiais` antes de qualquer pausa/ajuste.
- Se faltar página/Instagram conectados na conta Meta, **avise e pare**.
