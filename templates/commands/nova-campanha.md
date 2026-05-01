---
description: Cria uma campanha completa (Campanha + 2 conjuntos + 4 anúncios + copies A/B) usando as MÍDIAS DO CLIENTE. Sempre pede confirmação antes de subir na Meta.
argument-hint: "[playbook=...] [budget=...] [duracao=...] [oferta=\"...\"]"
---

# Nova Campanha

Você vai conduzir o usuário pela criação de uma campanha completa usando
**as fotos e vídeos do próprio cliente** (nunca gere imagem com IA).

## Passos obrigatórios (nesta ordem)

### 1. Identifique o playbook
Se vier nos argumentos, use direto. Se não, pergunte ao usuário entre os
playbooks disponíveis em `~/.easy4u-trafego/playbooks/`.

### 2. Liste as mídias disponíveis
```bash
ls -la ~/.easy4u-trafego/midias/upload/
ls -la ~/.easy4u-trafego/midias/produto/
ls -la ~/.easy4u-trafego/midias/ambiente/
ls -la ~/.easy4u-trafego/midias/equipe/
```

Se **vazia**, pare e diga ao usuário:
> "Você ainda não colocou nenhuma foto/vídeo. Sai do Claude, roda
> `easy4u-trafego` no terminal, escolhe '📁 Minhas mídias' e arrasta
> suas fotos. Depois volta aqui."

### 3. Briefing
Chame o agente `briefador` para garantir que oferta, público e orçamento
fazem sentido. Pule se TODOS os argumentos vieram preenchidos.

### 4. Carregue o YAML do playbook
De `~/.easy4u-trafego/playbooks/{playbook}.yaml` e renderize as variáveis
com os dados do `CLAUDE.md` + briefing.

### 5. Gere copy + escolha mídia
Chame o agente `redator`. Ele devolve, pra cada anúncio do playbook:
- **Mídia sugerida** (caminho real de um arquivo da pasta)
- Headline + corpo + CTA

Se o redator disser que falta mídia, **pare e peça** ao cliente:
> "Pra esse playbook precisamos de pelo menos N fotos. Você tem M.
> Quer adicionar mais agora ou seguir com menos anúncios?"

### 6. Mostre a árvore completa em texto

```
CAMPANHA: {nome} · objetivo {X} · CBO R$ {budget}/dia · {duracao} dias

  CONJUNTO 1: {nome}
    público: {...}
    posicionamentos: {...}

    ANÚNCIO 1.1
      📷 midias/upload/IMG_2031.jpg  (1.2 MB · 1080x1080)
      "Pizza grande + refri R$ 49,90"
      "Aquela vontade de pizza no domingo? A gente entrega."
      "Pede pelo zap até 23h. Frete grátis acima de 70."
      CTA: chama no zap

    ANÚNCIO 1.2 (A/B)
      📷 midias/upload/IMG_2032.jpg
      ...
```

### 7. Pergunte
> "Posso subir essa estrutura na Meta? (sim / só conjunto 1 / cancelar)"

### 8. Após "sim" explícito, suba na Meta nesta ordem

1. **Upload de cada mídia** via tool da MCP Facebook (ex: `mcp__claude_ai_META__ads_upload_*`).
   Para cada upload, **registre o `image_hash` ou `video_id` retornado**.
2. **Crie a campanha** (`ads_create_campaign`).
3. **Crie cada conjunto** (`ads_create_ad_set`).
4. **Crie cada anúncio** (`ads_create_ad`) referenciando os hashes/IDs.

### 9. Salve manifest
Em `~/.easy4u-trafego/campanhas/{data}_{nicho}_{playbook}/manifest.json`:
```json
{
  "campaign_id": "120210...",
  "ad_sets": [...],
  "ads": [
    {
      "name": "...",
      "image_hash": "abc123",
      "source_file": "midias/upload/IMG_2031.jpg",
      "copy": {...}
    }
  ],
  "created_at": "2026-05-01T..."
}
```

### 10. Devolva os IDs e o link do Gerenciador
```
✓ Campanha criada (ID 120210...)
✓ 2 conjuntos
✓ 4 anúncios
→ https://business.facebook.com/adsmanager/manage/campaigns?act={account_id}
```

## Regras invioláveis

- **Nunca** suba na Meta sem confirmação explícita.
- **Nunca** ultrapasse o limite hard de gasto do `CLAUDE.md`.
- **Nunca** use mídia que não está na pasta do cliente.
- **Nunca** gere imagem com IA — sempre peça arquivo real.
- Se faltar página/Instagram conectados na conta Meta, **avise e pare** — não tente contornar.
