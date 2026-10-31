# ScoreBoard Mobile

> **Social Live Scoring Platform — Mobile App (iOS / Android / Web)**  
> Built with [Expo SDK 58](https://expo.dev), [React Native 0.88](https://reactnative.dev), and [Supabase](https://supabase.com).

---

## 📱 Visão Geral

O **ScoreBoard Mobile** é a aplicação móvel multiplataforma do ecossistema ScoreBoard. Foi concebida tanto para adeptos e seguidores que acompanham jogos e torneios em tempo real, como para árbitros e organizadores que gerem a pontuação oficial através de consolas de arbitragem dedicadas.

---

## ✨ Funcionalidades Principais

### 1. Consola de Arbitragem em Modo Paisagem Forçado (*Landscape Lock*)
Todos os marcadores de pontuação oficial bloqueiam automaticamente o ecrã em **modo horizontal (*landscape*)** via `expo-screen-orientation` para permitir uma operação ergonómica com ambos os polegares enquanto se acompanha a partida:
- **Tipografia Digital (`fontFamily: "Digital7"`)**: Numeração de 7 segmentos para contadores de pontos, cronómetros e parciais.
- **Layout Unificado em 3 Colunas**:
  - **Coluna Esquerda (Casa)**: Indicador de serviço/posse, parciais/faltas/descontos, resultado digital gigante e ações rápidas com botão de correção (`-1`).
  - **Coluna Central (Painel & Relógio)**: Período/Quarto/Set, relógio digital com controlos de tempo, alertas técnicos (*Deuce*, *Bónus*, *Break Point*, *Troca de Campo*) e botão para terminar partida.
  - **Coluna Direita (Visitante)**: Controlos espelhados dedicados à equipa visitante.
- **Manutenção de Ecrã Ativo**: Integração com `expo-keep-awake` para impedir que o dispositivo bloqueie durante a partida.
- **Feedback Háptico**: Vibração tátil (`expo-haptics`) ao marcar pontos, faltas ou golos.

### 2. Ações de Pontuação Específicas por Desporto
- 🏀 **Basquetebol**: `+1` (Lance Livre), `+2` (Campo), `+3` (Triplo), `-1` (Corrigir), faltas com alerta automático de bónus à 5ª falta, descontos de tempo, posse de bola, relógio de quarto e shot clock (24s / 14s).
- ⚽ **Futebol**: `+1 Golo`, `-1 Corrigir`, cartões amarelos e vermelhos, cantos, faltas, tempo de compensação (`+1m`), fases de jogo (1ª/2ª Parte, Intervalo, Prolongamento, Penáltis) e cronómetro.
- 🏐 **Voleibol & Vólei de Praia**: Pontos de rally, sorteio inicial (*Toss*), rotação de serviço, descontos de tempo, regras de desempate (*Deuce* por 2 pontos), límite de set (25/21/15) e alerta de troca de campo (ao 8º ponto na negra ou múltiplos de 7 na praia).
- 🎾 **Ténis & Padel**: Pontuação tradicional (`0, 15, 30, 40, AD`), *Ponto de Ouro* em Padel, ações de *Ás (Ace)* e *Falta Dupla*, lado do campo (*Deuce Court / Ad Court*), modo *Tie-break* e alertas de *Break Point* e troca de campo.

### 3. Feeds & Navegação Inferior
- Barra de navegação inferior com abas nativas:
  - **Matches**: Jogos em tempo real com resultados alinhados verticalmente com cada equipa.
  - **Tournaments**: Lista de torneios organizados por modalidade.
  - **Following**: Jogos e torneios subscritos pelo utilizador.
  - **Alertas**: Notificações agregadas em tempo real com badge de contagem.
  - **Perfil**: Definições de conta, idioma e autenticação.
- **Pesquisa Sem Perda de Foco**: Barra de pesquisa estática com filtragem instantânea sem recriação de nós nativos.

### 4. Internacionalização (i18n)
- Suporte para Português (`pt`) e Inglês (`en`).
- Seletor de idioma integrado e testes de regressão de sincronização (*drift test*).

---

## 🛠️ Tecnologias Utilizadas

- **Framework**: [Expo SDK 58](https://expo.dev) com [React Native 0.88](https://reactnative.dev) e [React 19](https://react.dev)
- **Navegação**: [Expo Router v58](https://docs.expo.dev/router/introduction/) (File-based Routing & Tabs)
- **Base de Dados & Tempo Real**: [@supabase/supabase-js](https://supabase.com/docs/reference/javascript) (PostgreSQL, Realtime WebSockets, Auth)
- **Módulos Nativos**:
  - `expo-screen-orientation`: Bloqueio horizontal em marcadores
  - `expo-keep-awake`: Prevenção de suspensão de ecrã
  - `expo-haptics`: Feedback tátil para o árbitro
  - `expo-font`: Carregamento da fonte `Digital7`
- **Testes**: [Vitest](https://vitest.dev) (Testes unitários e de domínio de pontuação)
- **Tipagem**: TypeScript strict mode

---

## 📁 Estrutura de Pastas

```text
scoreboard-mobile/
├── assets/
│   ├── fonts/
│   │   └── digital-7.ttf          # Fonte digital de 7 segmentos
│   └── images/                    # Ícones e logótipo
├── src/
│   ├── app/                       # Rotas da aplicação (Expo Router)
│   │   ├── (tabs)/                # Abas principais (index, tournaments, following, notifications, profile)
│   │   │   └── _layout.tsx        # Configuração da barra de navegação inferior
│   │   ├── match/
│   │   │   ├── [id].tsx           # Detalhe do jogo & acompanhamento
│   │   │   └── [id]/scoreboard.tsx# Consola de arbitragem em modo paisagem
│   │   ├── tournament/            # Detalhes, brackets, inscrições e equipas de torneio
│   │   └── _layout.tsx            # Raiz com fontes, providers e temas
│   ├── components/                # Componentes reutilizáveis
│   │   ├── scoreboards/           # Marcadores dedicados (Basketball, Football, Volleyball, Tennis)
│   │   ├── TopBar.tsx             # Barra superior global
│   │   ├── FeedHeader.tsx         # Barra de pesquisa e filtros
│   │   └── MatchListItem.tsx      # Linha de jogo com resultado vertical
│   ├── constants/                 # Cores, espaçamentos e temas
│   └── lib/                       # Motores de regras, i18n, Supabase e utilitários
│       ├── scoring/               # Lógica de cálculo de sets, jogos e regras desportivas
│       ├── standings/             # Classificações de grupos e desempates
│       └── i18n/                  # Dicionários pt/en e context
└── tests/                         # Testes automatizados do motor de jogo
```

---

## 🚀 Como Executar

### Pré-requisitos
- [Node.js](https://nodejs.org) (v20 ou superior)
- `npm` ou `yarn`
- [Expo Go](https://expo.dev/go) instalado no smartphone físico ou um emulador (Android Studio / Xcode).

### 1. Clonar e Instalar Dependências
```bash
cd scoreboard-mobile
npm install
```

### 2. Configurar Variáveis de Ambiente
Cria um ficheiro `.env` na raiz do projeto com as credenciais do teu projeto Supabase:
```env
EXPO_PUBLIC_SUPABASE_URL=https://teu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tua-chave-anonima
```

### 3. Iniciar a Aplicação
```bash
# Iniciar o servidor de desenvolvimento do Expo
npm start

# Ou abrir diretamente na plataforma desejada:
npm run android   # Emulador Android
npm run ios       # Simulador iOS
npm run web       # Modo navegador web
```

---

## 🧪 Testes Automatizados

O projeto utiliza o **Vitest** para executar testes rápidos aos motores de regras, lógica de pontuação e sincronização de idiomas:

```bash
# Executar todos os testes
npm run test:run

# Executar testes em modo watch
npm test

# Verificar se existem chaves de tradução em falta entre PT e EN
npm run check:i18n
```

### Testes Incluídos:
- `tests/scoring/tennis.test.ts`: Simula sequências de pontos reais de ténis (holds, deuce, break points, tiebreak de 7 pontos por 2 de vantagem).
- `tests/scoring/volleyball.test.ts`: Validação de regras de rotação, parciais e limites de sets de voleibol e vólei de praia.
- `src/lib/scoring/sets.test.ts`: Extração e contagem de conjuntos e parciais.
- `src/lib/standings/groups.test.ts`: Cálculo de tabelas classificativas em fase de grupos e regras de desempate.
- `src/lib/i18n/__tests__/drift.test.ts`: Garante paridade total entre os ficheiros de tradução em Português e Inglês.

---

## 📄 Licença
Propriedade do projeto ScoreBoard. Todos os direitos reservados.
