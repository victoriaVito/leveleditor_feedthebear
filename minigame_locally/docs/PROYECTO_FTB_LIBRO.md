# Proyecto Feed the Bear: Documentación Unificada

## Índice

- [README](#readme)
- [Benchmarks](#benchmarks)

---

## README

# Documentation Index

Este archivo es el índice canónico del sistema de documentación del proyecto. Enumera los documentos activos, los changelogs de soporte, los prompts de coordinación y las referencias históricas relevantes.

Para contexto de proyecto resumible, comienza con `docs/PROJECT_MASTER_HANDOFF.md`.

(Contenido completo del README original incluido arriba)

---

## Benchmarks

### Flow Free Benchmark Analysis

(Contenido completo de FLOW_FREE_BENCHMARK_ANALYSIS.md incluido arriba)

### Benchmark + Compare Registry

(Contenido completo de BENCHMARK_COMPARE_REGISTRY.md incluido arriba)

---

## Agentes

### Agent Cheatsheet

Use this as the quick routing guide for helper agents in the Feed the Bear project.

(Tabla y reglas de enrutamiento incluidas del AGENT_CHEATSHEET.md)

### Procedural Design Critic

Prompt canónico para agentes de calidad procedural.

(Misión, alcance, reglas y checklist de PROCEDURAL_DESIGN_CRITIC.md)

### API Guardian

Prompt canónico para agentes de APIs, sincronización y preservación de contenido.

(Misión, alcance, reglas y checklist de API_GUARDIAN.md)

### Cross-Model Portable Core

Prompt canónico para instrucciones portables entre Codex, Copilot, Gemini, etc.

(Misión, reglas y checklist de CROSS_MODEL_PORTABLE_CORE.md)

---

## Workflows y Recuperación

### Workflows

Guía paso a paso para operaciones clave del toolkit, sincronización, generación procedural, publicación y renombrado de niveles. (Contenido de WORKFLOWS.md)

### Screenshot Pipeline

Cómo se generan, almacenan y reutilizan los screenshots en el proyecto. (Resumen de SCREENSHOT_PIPELINE.md)

### Level Recovery & Validation Guide

Guía para validar, recuperar y limpiar niveles corruptos, con scripts y buenas prácticas. (Resumen de LEVEL_RECOVERY_GUIDE.md)

### Communication Router

Diseño y reglas del sistema de coordinación y enrutamiento de tareas. (Resumen de COMMUNICATION_ROUTER.md)

---

## Diseño de Niveles y Bundles

### Level Design

Guía práctica de diseño de niveles: vocabulario, anatomía de un buen nivel, errores comunes, workflow y checklist antes de publicar. (Resumen de LEVEL_DESIGN.md)

### Level JSON Schema

Esquema canónico y reglas de validación para los archivos de nivel. (Resumen de LEVEL_JSON_SCHEMA.md)

### Procedural ML Design

**Fuente:** `docs/PROCEDURAL_ML_DESIGN.md`

Resumen del diseño canónico y pipeline de aprendizaje para la generación procedural en Feed the Bear:

- **Propósito:** Unifica reglas de generación procedural, flujo de aprendizaje/persistencia y preparación para ML en una sola fuente de verdad.
- **Resumen del sistema:** El generador usa un sistema de colores de peces, curva de dificultad, RNG con semilla, conteo de soluciones y scoring heurístico. Integra feedback humano y correcciones de diseñador.
- **Bloques clave:**
  - Paleta de colores (`config/fish_colors.json`)
  - Curva de dificultad por nivel (ver tabla en fuente)
  - Generación determinista y scoring
  - Señales de aprendizaje de aprobación/rechazo, fixes manuales y sesiones jugadas
  - Contador de soluciones (DFS con memoización)
  - Variantes por mutación dirigida
  - Ajustes de parámetros guiados por aprendizaje
  - Integración de benchmarks Flow Free (`docs/FLOW_FREE_BENCHMARK_ANALYSIS.md`)
- **Características de dificultad:** Tamaño de grid, número de pares, distancia inicio-fin, cantidad/agrupación de blockers, número de soluciones, score compuesto.
- **Pipeline de aprendizaje y persistencia:**
  - Captura de aprobaciones/rechazos/correcciones en generador, editor y sesiones
  - Estado canónico en `.local/toolkit_state/learning_state.json` y exportable vía `scripts/export_procedural_learning_snapshot.py`
  - Pipeline: `npm run pipeline:procedural` refresca pack procedural, exporta snapshot y valida catálogo
- **Estado actual:** Dataset mezcla datos de editor, sesión y referencia; replay del scorer resuelve ~44% de entradas; calidad y heterogeneidad de datos son caveats clave.
- **Insights clave:**
  - Los blockers deben interactuar con rutas de pares para ser significativos
  - La heterogeneidad de fuentes limita la calidad del aprendizaje
- **Preguntas abiertas:**
  - ¿Qué define un buen nivel? (dificultad, calidad, “aha”)
  - ¿Qué hace buena la colocación de blockers/pares?
  - ¿Qué estilos de rutas y curvas de episodio se desean?
- **Recomendaciones ML:**
  - Limpiar y canonizar dataset antes de tunear pesos o entrenar modelos
  - Persistir features más ricos (spread de blockers, coverage de rutas, etc.)
  - Usar ML primero como evaluador, no generador

**Referencias:**
- `docs/FLOW_FREE_BENCHMARK_ANALYSIS.md`
- `level_toolkit_web/app.js`
- `scripts/export_procedural_learning_snapshot.py`
- `config/fish_colors.json`
- `docs/agents/PROCEDURAL_DESIGN_CRITIC.md`

Esta sección reemplaza todas las notas previas de procedural/ML. Ver fuente para detalles y tablas completas.

### Bundles and Mixes

Estructura, ciclo de vida y flujos de bundles, progresiones originales y mixes de Live Ops. (Resumen de BUNDLES_AND_MIXES.md)

---

(El resto de categorías se irán fusionando en este archivo según avance el proceso)
