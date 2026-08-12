# GA4: Criar 4 Goals de Conversão — Guia Prático

**Status:** Ready to implement | **Tempo:** 5-10 minutos | **Prerequisito:** GA4 property `G-EJ9N0GX6X1` já recebendo eventos

---

## 📋 Os 4 Goals a Criar

| # | Nome do Goal | Tipo | Evento Base | Condição |
|---|---|---|---|---|
| 1 | **Lead Capturado** | Event | `form_submit` | (nenhuma) |
| 2 | **Simulador Aberto** | Event | `open_simulator` | (nenhuma) |
| 3 | **Engajamento Alto (80%)** | Event | `scroll_depth` | `depth_percent >= 80` |
| 4 | **Sessão Longa (3+ min)** | Event | `time_on_page` | `seconds >= 180` |

---

## 🚀 Passo-a-Passo

### Acesso ao GA4

1. Acesse **Google Analytics** → https://analytics.google.com
2. Faça login com a conta que tem acesso à propriedade Aruanã Digital
3. Selecione a propriedade **Aruanã Digital** (Property ID: `G-EJ9N0GX6X1`)

### Navegar até Goals

4. Clique no ícone **⚙️ Admin** (rodinha engrenagem) no canto inferior esquerdo
5. No menu **Admin**, coluna esquerda → clique em **Conversions**
6. Clique na aba **Goals** (ou **Eventos-chave** dependendo da interface)
7. Clique no botão **+ Create Goal** (ou **+ Novo goal**)

---

## 📝 Goal 1: Lead Capturado

### Configurar

| Campo | Valor |
|-------|-------|
| **Goal name** | `Lead Capturado` |
| **Goal type** | Event |
| **Event name** | `form_submit` |
| **Conditions** | (deixar vazio — sem condição) |

### Passo-a-passo

1. Em **Goal name**, escreva: `Lead Capturado`
2. Em **Goal type**, selecione: **Event** (se não aparecer automaticamente)
3. Em **Event name**, escreva: `form_submit`
4. Deixe **Conditions** vazio (nenhuma condição necessária)
5. Clique **Create** ou **Salvar**
6. ✅ Goal criado

---

## 📝 Goal 2: Simulador Aberto

### Configurar

| Campo | Valor |
|-------|-------|
| **Goal name** | `Simulador Aberto` |
| **Goal type** | Event |
| **Event name** | `open_simulator` |
| **Conditions** | (deixar vazio) |

### Passo-a-passo

1. Clique **+ Create Goal** novamente
2. Em **Goal name**, escreva: `Simulador Aberto`
3. Em **Goal type**, selecione: **Event**
4. Em **Event name**, escreva: `open_simulator`
5. Deixe **Conditions** vazio
6. Clique **Create** ou **Salvar**
7. ✅ Goal criado

---

## 📝 Goal 3: Engajamento Alto (80%)

### Configurar

| Campo | Valor |
|-------|-------|
| **Goal name** | `Engajamento Alto (80%)` |
| **Goal type** | Event |
| **Event name** | `scroll_depth` |
| **Conditions** | `depth_percent >= 80` |

### Passo-a-passo

1. Clique **+ Create Goal** novamente
2. Em **Goal name**, escreva: `Engajamento Alto (80%)`
3. Em **Goal type**, selecione: **Event**
4. Em **Event name**, escreva: `scroll_depth`
5. **Agora adicione a condição:**
   - Clique em **+ Add condition**
   - Em **Parameter name**, escreva: `depth_percent`
   - Em **Condition type**, selecione: **Greater than or equal to** (≥)
   - Em **Value**, escreva: `80`
6. Clique **Create** ou **Salvar**
7. ✅ Goal criado

---

## 📝 Goal 4: Sessão Longa (3+ min)

### Configurar

| Campo | Valor |
|-------|-------|
| **Goal name** | `Sessão Longa (3+ min)` |
| **Goal type** | Event |
| **Event name** | `time_on_page` |
| **Conditions** | `seconds >= 180` |

### Passo-a-passo

1. Clique **+ Create Goal** novamente
2. Em **Goal name**, escreva: `Sessão Longa (3+ min)`
3. Em **Goal type**, selecione: **Event**
4. Em **Event name**, escreva: `time_on_page`
5. **Adicione a condição:**
   - Clique em **+ Add condition**
   - Em **Parameter name**, escreva: `seconds`
   - Em **Condition type**, selecione: **Greater than or equal to** (≥)
   - Em **Value**, escreva: `180`
6. Clique **Create** ou **Salvar**
7. ✅ Goal criado

---

## ✅ Validação

Após criar todos os 4 goals:

1. Vá a **Reports** → **Conversions** (ou **Goals**)
2. Verifique se os 4 goals aparecem na lista
3. **Se eventos já chegaram ao GA4**, você deve ver conversões dentro de alguns minutos

---

## 🆘 Troubleshooting

### "Não consigo encontrar o evento `form_submit`"
- Confirme que eventos estão chegando ao GA4 (vá a **Events** admin panel)
- Se nenhum evento aparecer, o problema é de tracking (não é do goal)

### "Não aparece campo de 'Event name'"
- Certifique-se de que **Goal type** está como **Event** (não Custom)
- Alguns tipos de goal têm campos diferentes

### "Goal criado mas não vejo conversões"
- Aguarde 24h para GA4 processar dados históricos
- Verifique se o evento realmente está disparando em `/diagnostico` ou nas páginas relevantes

---

## 📞 Próximo Passo

Após os goals estarem criados e validados:

1. Vá a **Google Ads** (se usar Ads)
2. Em **Conversions**, importe os goals do GA4
3. Use-os como target para otimizar campanhas

---

**Criado em:** 2026-08-12  
**Versão:** 1.0  
**Status:** Ready for implementation
