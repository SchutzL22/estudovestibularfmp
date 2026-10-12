# 🎓 FMP Vestibular – Plataforma Completa de Estudos

<div align="center">

![FMP Logo](data/imagens/fmplogo.png)

### Plataforma Web Interativa (SPA) para o Vestibular da Faculdade Municipal de Palhoça (FMP)
**100% Vanilla Web • Zero Dependências • Mobile-First • Modo Escuro & Claro**

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/pt-BR/docs/Web/HTML)
[![CSS3 Puro](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/pt-BR/docs/Web/CSS)
[![JavaScript ES6+](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript)
[![Single Page Application](https://img.shields.io/badge/SPA-Vanilla_JS-6C9BFF?style=for-the-badge)](#)
[![Status](https://img.shields.io/badge/Status-Concluído_&_Pronto_para_Uso-22C55E?style=for-the-badge)](#)

</div>

---

## 📌 Sobre o Projeto

A **Plataforma de Estudos FMP Vestibular** é uma Single Page Application (SPA) ultrarrápida e moderna, desenvolvida para fornecer aos candidatos uma preparação de alto nível para o processo seletivo da **Faculdade Municipal de Palhoça (FMP/SC)**.

A aplicação reúne teoria direcionada, simulados com questões reais e inéditas, propostas oficiais de redação com área de rascunho em tempo real, dados históricos de notas de corte e uma central completa de materiais e provas anteriores em PDF.

---

## 🌟 Principais Funcionalidades

A plataforma é estruturada em **5 módulos (abas)** integrados e de carregamento instantâneo:

### 1. 📖 Guia de Estudos (Teoria & Cartografia)
* **Conteúdo Teórico Focado**: Aulas organizadas em acordeões interativos com macetes de memorização e destaques dos tópicos mais recorrentes da banca:
  * *História e Geografia de Palhoça* (Origem de 1793, emancipação de 1894, maricultura, limites, símbolos municipais).
  * *Informática e Tecnologias Digitais* (Hardware, memórias, segurança digital, atalhos, fórmulas de planilhas).
  * *FMP e Atualidades* (Cursos oferecidos, regras da prova, temas contemporâneos).
* **Mapas Oficiais das Praias**: Seção cartográfica dedicada com visualização do mapa oficial e visão satélite da orla de Palhoça (Pinheira, Guarda do Embaú, Enseada de Brito, Ponta do Papagaio, Praia do Sonho).
* **Barra de Progresso Interativa**: Cada lição possui uma caixa de seleção *"Revisado"*. O progresso percentual é recalculado e salvo automaticamente via `localStorage`.
* **Busca em Tempo Real**: Campo de pesquisa com filtro instantâneo e marcação visual (`<mark>`) dos termos pesquisados no texto.

### 2. 🎯 Simulado Objetivo (467 Questões)
* **Banco Extenso e Real**: 467 questões categorizadas nas 5 matérias do vestibular oficial:
  * 📝 **Língua Portuguesa** (64 questões)
  * ➕ **Matemática** (86 questões)
  * 💻 **Informática** (76 questões)
  * 🌊 **História e Geografia de Palhoça** (144 questões)
  * 🌍 **Atualidades** (97 questões)
* **Textos de Apoio Integrados**: Questões de interpretação contam com botão de leitura acoplado (`📖 Ler Texto de Apoio: "[Título]"`), permitindo expandir e recolher o texto original de apoio sem mudar de tela.
* **Filtros e Paginação**:
  * Filtragem por Matéria, por Edição/Origem (Vestibulares 2026, 2025, 2024 ou Inéditas IA) e por Status (Não respondidas / Só erros).
  * Paginação fluida em lotes de 25 questões por página.
  * Opção de embaralhar as alternativas A–E a cada tentativa.
* **⚡ Simulado Oficial 40Q**: Gera instantaneamente uma prova balanceada com a distribuição idêntica à do edital (10 Português + 10 Matemática + 5 Informática + 10 Palhoça + 5 Atualidades).
* **📊 Comparativo com Notas de Corte Históricas**:
  * Ao clicar em *"Ver Resultado"*, o modal avalia seu total de acertos objetivos (0 a 40) contra o ponto de corte de todas as edições anteriores para qualquer um dos cursos da FMP (**ADS**, **TPG**, **ADM** ou **Pedagogia**).
  * *Atenção:* O comparativo avalia estritamente os acertos objetivos (0 a 40) e exibe as notas de redação históricas apenas como referência informativa.

### 3. ✍️ Temas de Redação (Com Simulador de Rascunho)
* **8 Propostas Completas**: Propostas de vestibulares anteriores (2024/2, 2025/1, 2025/2) e temas inéditos modelados para os eixos temáticos da FMP.
* **Textos Motivadores e Instruções Oficiais**: Cada proposta traz seus textos de apoio com fonte e autor, além do regulamento oficial (gênero dissertativo-argumentativo, 10 a 30 linhas).
* **Área de Rascunho Interativa**:
  * Caixa de digitação integrada com salvamento automático local.
  * Contador de linhas em tempo real com validação visual (verde ao atingir a faixa exigida de 10 a 30 linhas).
  * Contador de palavras.
  * Botão de cópia rápida para a área de transferência (`📋 Copiar Redação`).

### 4. 📊 Notas de Corte Históricas
* Histórico detalhado das últimas 5 edições do vestibular (**2024/2**, **2025/1**, **2025/2**, **2026/1** e **2026/2**).
* Cobre todos os cursos da faculdade:
  * 💻 **ADS** (Análise e Desenvolvimento de Sistemas)
  * 📋 **TPG** (Tecnologia em Processos Gerenciais)
  * 📈 **ADM** (Bacharelado em Administração)
  * 📚 **Pedagogia** (Licenciatura em Pedagogia)
* Exibe número de vagas, pontuação do 1º colocado (acertos, nota final e redação) e a pontuação do último convocado na 1ª chamada e na chamada final.

### 5. ⚡ Cola Rápida, Macetes & Provas em PDF
* **Cards de Revisão Expressa**: Datas críticas (1793 vs 1894), limites geográficos (Rosa dos Ventos), símbolos oficiais (Palmeira Juçara, Tainha, Bromélia) e conceitos que mais confundem na prova.
* **Central de Downloads Oficiais**:
  * 📜 **Edital Oficial FMP 2027/1**
  * 📝 **Cadernos de Provas e Gabaritos Oficiais** das edições 2024/2, 2025/1, 2025/2, 2026/1 e 2026/2.
  * 📚 Apostilas de apoio: *História de Palhoça*, *Informações Institucionais FMP* e simulados complementares em PDF.

---

## 🗂️ Estrutura do Repositório

```text
estudovestibularfmp/
├── index.html                   # Estrutura HTML5 semântica e acessível
├── README.md                    # Documentação do projeto
├── assets/
│   ├── css/
│   │   └── style.css            # Folha de estilos completa (Design System, animações, temas)
│   └── js/
│       └── app.js               # Lógica da aplicação, SPA, gerenciamento de estado e filtros
└── data/
    ├── banco_questoes/          # Bancos JSON com 467 questões e propostas
    │   ├── banco_atualidades_fmp_atualizado.json
    │   ├── banco_questoes_fmp_atualidades_historia_geografia_palhoca_informatica.json
    │   ├── banco_questoes_fmp_portugues.json
    │   ├── banco_questoes_informatica_fmp.json
    │   ├── banco_questoes_matematica_fmp.json
    │   ├── banco_questoes_palhoca_fmp.json
    │   └── propostas_redacao_fmp.json
    ├── notas/
    │   └── notas_vestibulares.json # Dados históricos de notas de corte por curso e chamada
    ├── edital/
    │   └── Edital fmp 2027-1.pdf
    ├── imagens/
    │   ├── fmplogo.png          # Logomarca oficial da FMP
    │   ├── Mapa das praias de Palhoça.jpg
    │   └── Maps - praias de Palhoça.png
    ├── outros/                  # Apostilas complementares em PDF
    │   ├── História de Palhoça.pdf
    │   ├── Informações fmp.pdf
    │   ├── Questões sobre informática e tecnologias digitais.pdf
    │   └── Questões sobre Palhoça Fmp.pdf
    └── vestibulares_antigos/    # Provas e gabaritos oficiais em PDF (2024 a 2026)
        ├── 2024-2 _ vestibular.pdf
        ├── 2024-2 _ gabarito.pdf
        ├── 2025-1 _ vestibular.pdf
        ├── 2025-1 _ gabarito.pdf
        ├── 2025-2 _ vestibular.pdf
        ├── 2025-2 _ gabarito.pdf
        ├── 2026-1 _ vestibular e gabarito.pdf
        ├── 2026-2 _ vestibular.pdf
        └── 2026-2 _ gabarito.pdf
```

---

## 💻 Tecnologias Empregadas

* **HTML5**: Semântico, estruturado com foco em acessibilidade (WAI-ARIA nos modais, tabs e acordeões).
* **CSS3 Vanilla**:
  * Design tokens centralizados via CSS Custom Properties (variáveis).
  * Suporte nativo a Dark Mode e Light Mode.
  * Grid e Flexbox modernos para layout responsivo Mobile-First.
  * Microanimações suaves e transições elegantes.
* **JavaScript ES6+ Vanilla**:
  * Arquitetura SPA orientada a estado reativo leve (`State`).
  * Consumo assíncrono via `fetch()` com processamento em paralelo (`Promise.all`).
  * Persistência de dados com `localStorage` (progresso de estudo, respostas de simulados, rascunhos de redação, preferências de tema e tamanho de fonte).
  * Zero bibliotecas ou frameworks pesados (não requer npm, build ou bundlers).

---

## 🚀 Como Executar o Projeto

Como a aplicação faz requisições `fetch()` para carregar os arquivos JSON locais da pasta `data/`, é recomendável executá-la através de um servidor HTTP local:

### Opção 1: Via Python (Recomendado)
Se você possui o Python instalado, execute no terminal dentro da pasta do projeto:
```bash
python -m http.server 8080
```
Em seguida, acesse no navegador: **`http://localhost:8080`**

### Opção 2: Via VS Code (Live Server)
1. Instale a extensão **Live Server** no VS Code.
2. Abra a pasta do projeto no VS Code.
3. Clique com o botão direito sobre o arquivo `index.html` e selecione **"Open with Live Server"**.

### Opção 3: Via Node.js
Se preferir usar o Node.js:
```bash
npx serve .
```

---

## ⌨️ Atalhos de Teclado e Recursos de Acessibilidade

* <kbd>Ctrl</kbd> + <kbd>T</kbd> ou <kbd>Cmd</kbd> + <kbd>T</kbd>: Alternar instantaneamente entre **Tema Escuro** e **Tema Claro**.
* <kbd>Esc</kbd>: Fechar o modal de resultado de simulado.
* **Controles de Fonte**: Botões `A-` e `A+` no topo ajustam o tamanho da fonte entre 12px e 22px de forma proporcional.
* **Leitores de Tela**: Suporte completo a tags `aria-selected`, `aria-controls`, `aria-expanded` e `role="progressbar"`.

---

## 📄 Licença e Uso

Este projeto foi construído para fins educacionais e de apoio aos estudantes que se preparam para o vestibular da **Faculdade Municipal de Palhoça (FMP)**. Todos os dados de vestibulares, propostas de redação, editais e logos pertencem aos seus respectivos órgãos institucionais.
