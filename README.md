# 🧠 MindRevol - Enterprise AI Language & Memory Platform

![NodeJS](https://img.shields.io/badge/Node.js-18.x-green)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript\&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs\&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?logo=postgresql\&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?logo=langchain\&logoColor=white)

![React](https://img.shields.io/badge/React-20232A?logo=react\&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite\&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css\&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-Bear-orange)

![OpenAI](https://img.shields.io/badge/OpenAI-412991?logo=openai\&logoColor=white)
![LlamaParse](https://img.shields.io/badge/LlamaParse-Vision_RAG-blueviolet)
![Docker](https://img.shields.io/badge/Docker-Supported-2496ED?logo=docker\&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow)

![Demo](./assets/hero.png)

---

## Table of Contents

* [Overview](#overview)
* [Architecture](#architecture)
* [Features](#features)
* [Getting Started](#getting-started)

  * [Standard Setup](#standard-setup)
  * [Docker Setup](#docker-setup)
* [Tech Stack](#tech-stack)
* [Contributing](#contributing)
* [Future Improvements](#future-improvements)
* [License](#license)

---

## Overview

MindRevol is an enterprise-grade AI platform for language learning, memory sharing, and intelligent document processing.

The platform combines a modern React frontend with a scalable NestJS backend, providing:

* Infinite-context conversations
* Autonomous AI tool calling
* Enterprise-grade RAG pipeline
* Vision-based document understanding
* Real-time streaming responses
* Voice interaction support

---

## Architecture

```text
.
├── backend/
│   ├── src/
│   └── ...
│
├── frontend/
│   ├── src/
│   └── ...
│
├── .github/
│   ├── workflows/
│   └── ISSUE_TEMPLATE/
│
└── docker-compose.yml
```

### Backend

* NestJS
* LangChain / LangGraph
* PostgreSQL + pgvector
* OpenAI Integration
* LlamaParse Integration
* WebSocket / SSE Streaming

### Frontend

* React + Vite
* TypeScript
* Tailwind CSS
* Zustand
* Shiki
* KaTeX

---

## Features

### 🚀 Real-Time AI Streaming

* WebSocket / SSE response streaming
* Typing effect generation
* Optimized rendering with throttling
* Smooth user experience during long responses

### 🧠 Infinite Context Management

* Token counting using tiktoken
* Automatic conversation summarization
* Long-term context preservation
* Reduced API token usage

### 📚 Enterprise RAG Pipeline

* LlamaParse document parsing
* Table-aware extraction
* Formula-aware extraction
* Semantic markdown chunking
* Vector search with pgvector

### 🛠️ Autonomous AI Agents

Powered by LangChain and LangGraph.

Available tools:

* Web Search
* Calculator
* Memory Search
* Custom Tool Extensions

The AI automatically selects the appropriate tools based on user intent.

### 🎙️ Voice Interaction

* Speech-to-Text
* Text-to-Speech
* Browser-native Web Speech API support

---

## Getting Started

### Prerequisites

* Node.js 18+ (recommended)
* PostgreSQL
* pgvector extension
* Git
* Docker (optional)

---

### Standard Setup

#### Backend

```bash
cd backend
npm install
```

Create `.env`

```env
DATABASE_URL=postgresql://user:password@localhost:5432/mindrevol

OPENAI_API_KEY=your_openai_key_here
LLAMAPARSE_API_KEY=your_llamaparse_key_here
TAVILY_API_KEY=your_tavily_key_here
```

Run backend:

```bash
npm run start:dev
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

### Docker Setup

Run PostgreSQL + pgvector:

```bash
docker-compose up -d
```

---

## Tech Stack

### Frontend

* React
* Vite
* TypeScript
* Tailwind CSS
* Zustand
* Shiki
* KaTeX

### Backend

* NestJS
* TypeORM
* Socket.IO
* LangChain
* LangGraph

### AI

* OpenAI
* LlamaParse
* Tavily
* tiktoken

### Database

* PostgreSQL
* pgvector

### DevOps

* Docker
* GitHub Actions

---

## Contributing

Contributions, issues, and feature requests are welcome.

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to your branch
5. Open a Pull Request

See `CONTRIBUTING.md` for more details.

---

## Future Improvements

* [ ] Graph RAG with Neo4j
* [ ] Dynamic MCP Tool System
* [ ] Multi-language Support (i18n)
* [ ] React Native Application
* [ ] Multi-Agent Collaboration
* [ ] Knowledge Graph Memory

---

## License

Distributed under the MIT License.

See the `LICENSE` file for more information.
