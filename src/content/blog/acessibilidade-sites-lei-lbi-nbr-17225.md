Semana passada abrimos o site de dez empresas da região e fizemos um teste que leva trinta segundos: tiramos a mão do mouse e tentamos chegar até o botão de contato usando só a tecla TAB do teclado.

Em oito deles, nos perdemos antes de conseguir.

Nenhum desses sites é feio. Nenhum foi feito por gente incompetente. São sites bem construídos, com fotos boas e cores bem escolhidas. O que aconteceu foi mais simples e mais comum: acessibilidade nunca entrou na conversa — nem da empresa que contratou, nem de quem desenvolveu.

O resultado é que a empresa passou a excluir uma parte do seu público sem nunca ter decidido excluir ninguém. E, desde 2025, passou também a descumprir uma norma técnica brasileira que agora existe com nome e número.

## Quantas pessoas estamos deixando de fora

O Censo 2022 do IBGE, cujos dados sobre deficiência foram divulgados em 23 de maio de 2025, contou **14,4 milhões de brasileiros com alguma deficiência** — 7,3% da população de 2 anos ou mais.

Só que a média esconde o que mais importa para quem vende:

- Entre pessoas com **70 anos ou mais**, a proporção é de **27,5%** — mais de uma a cada quatro.
- **45,4%** de todas as pessoas com deficiência no Brasil têm 60 anos ou mais.
- A dificuldade mais frequente é a **visual**: 7,9 milhões de pessoas.

Ou seja: o público que a inacessibilidade digital mais exclui é justamente o público idoso — que é o que mais cresce, o que tem maior poder de compra acumulado e o que está migrando para o digital agora.

Quando você deixa um formulário sem rótulo, você não está apenas falhando com uma minoria abstrata. Você está dificultando a vida da pessoa de 72 anos que ia contratar o seu serviço.

## O que a lei diz — e não é novidade

O **artigo 63 da Lei 13.146/2015**, a Lei Brasileira de Inclusão, é curto e direto:

> "É obrigatória a acessibilidade nos sítios da internet mantidos por empresas com sede ou representação comercial no País ou por órgãos de governo, para uso da pessoa com deficiência, garantindo-lhe acesso às informações disponíveis, conforme as melhores práticas e diretrizes de acessibilidade adotadas internacionalmente."

Leia de novo a expressão "empresas com sede ou representação comercial no País". Não diz "empresas grandes". Não diz "órgãos públicos". Se a sua empresa está no Brasil e mantém um site, o artigo se aplica a ela.

O **parágrafo 1º** acrescenta uma exigência que quase ninguém cumpre e que leva dez minutos para resolver: os sites devem conter **símbolo de acessibilidade em destaque**.

## O que mudou em 2025

Durante dez anos, a brecha estava naquela última frase: "conforme as melhores práticas e diretrizes de acessibilidade adotadas internacionalmente". Era possível argumentar que a exigência era vaga.

Em **11 de março de 2025**, a ABNT publicou a **NBR 17225 — Acessibilidade digital**, a primeira norma técnica brasileira que traduz aquele artigo em requisitos verificáveis, seguindo os critérios do **WCAG 2.2** do W3C.

A norma trata, entre outras coisas, de:

- **Espaçamento de texto** — entrelinha de 1,5 vez o tamanho da fonte, espaçamento entre parágrafos de 2 vezes, entre letras de 0,12 e entre palavras de 0,16.
- **Contraste** — mínimo de 4,5:1 para texto, 7:1 no nível ampliado, 3:1 para componentes de interface.
- **Hierarquia semântica de títulos** — estrutura lógica, não decorativa.
- **Links com semântica programática** e texto descritivo.
- **Animações** — nada que inicie sozinho e dure mais de 5 segundos sem controle de pausa.
- **Janela de Libras** recomendada para conteúdo em áudio dentro de mídia sincronizada.

Repare que são números, não intenções. É essa a diferença. A conversa saiu do campo do "seria bom" e entrou no campo do "está especificado".

## E se não cumprir?

Essa é a pergunta que todo empresário faz, e a resposta honesta tem duas partes.

A parte jurídica: a LBI não fixa uma multa específica por site inacessível. O que existe é o restante do arcabouço — o artigo 88 da própria lei tipifica a discriminação em razão da deficiência com pena de 1 a 3 anos de reclusão e multa, aumentada de 2 a 5 anos quando praticada por meios de comunicação. Há ainda a atuação do Ministério Público e a possibilidade de ação civil pública. Instituições de ensino, empresas com contrato público e organizações que atendem público final são as mais expostas.

A parte comercial, que na prática costuma pesar mais: **você está perdendo cliente hoje, silenciosamente**. Ninguém escreve para reclamar de um formulário que não funciona com leitor de tela. A pessoa simplesmente desiste e compra no concorrente. Esse número nunca aparece no seu relatório, porque ele é feito de gente que não chegou.

E há um efeito colateral que quase ninguém menciona: **quase tudo que torna um site acessível também melhora o SEO**. Hierarquia de títulos correta, texto alternativo em imagens, links descritivos, idioma declarado, estrutura semântica — é exatamente o que o robô do Google usa para entender a sua página. Acessibilidade e posicionamento orgânico são, em grande parte, o mesmo trabalho.

## Os 8 pontos que resolvem a maior parte

Se você fizer só isto, já sai da faixa crítica:

1. **Texto alternativo em toda imagem que carrega informação.** Ícone decorativo fica com alt vazio de propósito.
2. **Contraste de 4,5:1 no texto.** Verifique no WebAIM Contrast Checker antes de aprovar a paleta.
3. **Navegação completa por teclado**, com foco visível. Nunca remova o `outline` do CSS por estética — estilize-o.
4. **Rótulo associado a todo campo de formulário.** Placeholder cinza não é rótulo.
5. **Hierarquia de títulos coerente**: um H1 por página, H2 e H3 em ordem, sem pular níveis.
6. **Links descritivos.** "Ver os planos de manutenção" no lugar de "clique aqui".
7. **Idioma declarado** na tag `html` com `lang="pt-BR"`.
8. **Símbolo de acessibilidade em destaque** — exigência expressa do parágrafo 1º do artigo 63.

Some a isso o **VLibras**, a ferramenta gratuita do Governo Federal que traduz o conteúdo do site para Libras. É gratuita, a integração leva minutos e praticamente nenhum site de empresa brasileira a utiliza.

## O teste de trinta segundos

Antes de contratar qualquer auditoria, faça o que fizemos naqueles dez sites:

1. Abra o site da sua empresa.
2. Tire a mão do mouse.
3. Navegue usando só a tecla TAB, do topo até o botão de contato.

Você deveria conseguir enxergar, a cada passo, onde está — e acionar tudo. Se em algum momento você se perder, é exatamente isso que acontece com toda pessoa que usa leitor de tela e com toda pessoa com limitação motora.

Depois, se quiser ir um pouco além, instale o **NVDA** (gratuito, no Windows) ou ligue o **VoiceOver** (já vem no Mac e no iPhone) e passe vinte minutos tentando usar o próprio site de olhos fechados. Ferramentas automáticas detectam cerca de 30% dos problemas de acessibilidade. O resto só aparece quando alguém tenta usar de verdade.

## Adequar ou refazer?

Depende de onde está a falha.

Contraste, texto alternativo, rótulos de formulário, idioma e símbolo de acessibilidade são correções pontuais. Costumam caber em uma sprint curta e custam pouco.

Já quando a estrutura do site foi montada com `div` no lugar de elementos semânticos — botões que não são botões, listas que não são listas —, a correção item a item vira remendo caro. Nesse cenário, refazer a base costuma sair mais barato do que remendar, e a diferença aparece na manutenção dos anos seguintes.

A única forma de saber em qual dos dois casos você está é olhar. É rápido.

---

**Quer saber em que pé está o seu site?** Fazemos um diagnóstico gratuito em até 48 horas, cobrindo velocidade, SEO, acessibilidade e conversão, e devolvemos um relatório de duas páginas com as três prioridades. Sem custo e sem proposta comercial junto.

[Solicitar o diagnóstico gratuito →](/diagnostico)

---

### Fontes

- BRASIL. **Lei nº 13.146, de 6 de julho de 2015** (Lei Brasileira de Inclusão da Pessoa com Deficiência), art. 63 e art. 88. Disponível em: planalto.gov.br
- ABNT. **NBR 17225 — Acessibilidade digital**, 1ª edição, publicada em 11 de março de 2025.
- IBGE. **Censo Demográfico 2022 — Pessoas com deficiência**, divulgado em 23 de maio de 2025.
- W3C. **Web Content Accessibility Guidelines (WCAG) 2.2**.
