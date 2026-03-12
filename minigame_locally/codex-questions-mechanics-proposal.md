Feed the Bear — Mechanics & Difficulty Proposal
Codex Information Request
Protocolo de comunicación:
Este archivo es el canal de comunicación entre Claude y Codex.

Claude escribe las preguntas en las secciones marcadas [PREGUNTA CLAUDE]
Codex completa las respuestas en las secciones marcadas [RESPUESTA CODEX]
Cuando Codex haya completado todas las respuestas, Claude leerá este archivo y generará el documento final en Canva

Instrucciones para Codex:

Lee todas las preguntas antes de empezar
Responde con datos concretos del código — no supongas, cita la fuente exacta (archivo + función + línea si es posible)
Si una pregunta no tiene respuesta en el código, escribe NO_ENCONTRADO y una breve explicación
No borres las preguntas — deja el formato intacto para que Claude pueda leerlo


BLOQUE 1 — Estado actual del prototipo
1.1 Sistema de movimientos actual
[PREGUNTA CLAUDE]
¿Cómo está implementado el sistema de límite de movimientos en el código actual?

¿Dónde se define el límite de movimientos por nivel?
¿Qué función lo aplica y qué ocurre cuando se agota?
¿El límite es fijo por nivel o se calcula dinámicamente?
¿Existe algún indicador visual del contador de movimientos?

[RESPUESTA CODEX]
No hay un sistema runtime que aplique un límite de movimientos. En el código actual, `moves` es metadata editable/exportable, pero no se decrementa ni bloquea la partida. Evidencia: `level_toolkit_web/app.js -> recommendedMoves()` calcula una sugerencia como suma de distancias Manhattan de los pares activos + número de blockers; `level_toolkit_web/app.js -> levelFromEditor()` guarda `moves`; `level_toolkit_web/app.js -> validateLevel()` solo comprueba `moves >= 0`; `level_toolkit_web/app.js -> tryApplyPlayCell()` y `evaluatePlayWin()` no leen `level.moves`.

Dónde se define:
- En niveles importados/exportados, el valor vive en el JSON (`level_toolkit_web/app.js -> loadLevelToEditor()`, `levelFromEditor()`).
- En generación procedural web, `level_toolkit_web/app.js -> generateLevelRaw()` fija `moves` como suma de aristas de `goldenPath`.
- En el editor, el botón `Auto Moves` rellena el campo usando `recommendedMoves()` (`level_toolkit_web/app.js -> event listener de "ed-auto-moves"`; `level_toolkit_web/index.html -> #ed-moves`, `#ed-auto-moves`).

Qué función lo aplica cuando se agota:
- NO_ENCONTRADO. No existe una función que consuma movimientos ni una condición de derrota por agotarlos en `level_toolkit_web/app.js`.

Fijo o dinámico:
- No es fijo por nivel en runtime.
- En el editor puede ser manual o calculado dinámicamente con `recommendedMoves()` (`app.js -> recommendedMoves()`, `levelFromEditor()`).
- En procedural web se calcula a partir de `goldenPath` (`app.js -> generateLevelRaw()`).

Indicador visual:
- Solo existe el input `Moves` del editor (`level_toolkit_web/index.html -> #ed-moves`), no un contador de movimientos restante durante play mode.

1.2 Condición de victoria actual
[PREGUNTA CLAUDE]
¿Cuál es exactamente la condición de victoria implementada hoy?

¿El juego requiere conectar todos los pares o también que el tablero esté completamente cubierto?
¿Qué función evalúa si un nivel está resuelto?
¿Se valida cobertura total del tablero en algún punto del código?

[RESPUESTA CODEX]
La victoria normal requiere que todos los pares activos tengan un path cuyo primer nodo sea un endpoint y cuyo último nodo sea el endpoint opuesto. Evidencia: `level_toolkit_web/app.js -> evaluatePlayWin()`.

No se requiere cobertura total del tablero para ganar en play mode. `evaluatePlayWin()` solo comprueba pares conectados; no comprueba que todas las celdas libres estén ocupadas.

Sí existe una validación separada de cobertura total, pero solo para la opción `Decal`:
- `level_toolkit_web/app.js -> hasFullCoverSolution()` devuelve si existe al menos una solución que cubra todas las celdas libres.
- `level_toolkit_web/app.js -> validateLevel()` solo la ejecuta cuando `level.decal` es true.
- `level_toolkit_web/app.js -> levelFromEditor()` rellena `validation.decal_pass`.

1.3 Input del jugador — comportamiento actual
[PREGUNTA CLAUDE]
¿Cómo funciona el input del jugador en el prototipo actual?

¿Se puede dibujar un path parcial y luego cambiar a otro par sin perder el progreso?
¿Al cambiar de par, ¿se borra el path anterior o se conserva?
¿El jugador puede "deshacer" pasos? ¿Cómo?
¿Existe alguna restricción que impida explorar antes de comprometerse?

[RESPUESTA CODEX]
El input de juego es pointer/click-drag sobre canvas. Un path solo puede empezar en un endpoint; si la primera celda no es start/end del par, la jugada se rechaza. Evidencia: `level_toolkit_web/app.js -> bindPlayCanvas()`, `beginPlayDrag()`, `handlePlayClick()`, `tryApplyPlayCell()`.

Sí, se puede dejar un path parcial y empezar otro par sin perder el anterior. `state.play.paths` guarda un array independiente por `pairId`, y `handlePlayClick()`/`beginPlayDrag()` cambian el par activo al pulsar un endpoint, sin resetear otros paths (`app.js -> resetPlayState()`, `handlePlayClick()`, `syncPlayPairSelect()`).

Al cambiar de par, el path anterior se conserva. No hay limpieza automática de `state.play.paths[otroPar]`.

Sí hay deshacer parcial: si el jugador vuelve a la celda anterior inmediata, el último paso se hace `pop()` y se elimina de `occupied` si no era endpoint. Evidencia: `level_toolkit_web/app.js -> tryApplyPlayCell()` rama `previous`.

Restricciones de exploración:
- No se puede empezar desde una celda vacía (`tryApplyPlayCell()`).
- Cada nuevo paso debe ser adyacente Manhattan (`manhattan(last, cell) === 1`).
- No se puede entrar en blockers (`tryApplyPlayCell()` consulta `state.editor.blockers`).
- No se puede usar una celda ocupada por otro par (`state.play.occupied` en `tryApplyPlayCell()`).
- No hay una fase de “commit”; el sistema acepta paths parciales inmediatamente y los conserva por par.

1.4 Blockers — implementación actual
[PREGUNTA CLAUDE]
¿Cómo se usan los blockers actualmente?

¿Son parte del diseño inicial del nivel o se generan proceduralmente?
¿Hay alguna regla sobre cuántos blockers puede tener un nivel?
¿El generador procedural los usa como lever de dificultad?
¿Existe algún límite o porcentaje máximo de celdas bloqueadas por nivel?

[RESPUESTA CODEX]
Los blockers existen tanto en diseño manual como en generación procedural.

Diseño manual:
- El editor los añade/quita con modo `blocker` (`level_toolkit_web/app.js -> applyEditorCellAction()`; `level_toolkit_web/index.html -> #ed-mode`).

Generación procedural:
- `level_toolkit_web/app.js -> curve` define rangos de blockers por nivel.
- `level_toolkit_web/app.js -> generateLevelRaw()` elige `blockerTarget` y prueba blockers en celdas fuera de `goldenPath` y de nodos.
- Un blocker solo se acepta si mantiene el nivel resoluble y reduce `solution_count` (`generateLevelRaw()`).
- `PROCEDURAL_GENERATION_LOGIC.md` documenta explícitamente que blocker placement es el principal shaping lever del generador.

Regla sobre cuántos blockers puede tener un nivel:
- Sí, en procedural depende del `curve[level].blockers`, por ejemplo nivel 1 `[0,0]`, nivel 9 `[4,5]`, nivel 10 `[2,3]` (`app.js -> curve`).
- Para niveles editados/importados no hay una validación que imponga máximo de blockers en `validateLevel()`.

Límite o porcentaje máximo:
- No hay porcentaje máximo hardcodeado en validación.
- El único límite explícito encontrado está en los rangos del generador procedural (`app.js -> curve`).

1.5 Generación procedural actual
[PREGUNTA CLAUDE]
¿Cómo genera niveles el sistema procedural actual?

¿Cuál es el algoritmo principal de generación? (¿backtracking, random placement, otro?)
¿Qué parámetros controla el generador? (board_size, pair_count, blocker_count, density_target…)
¿El generador garantiza que un nivel sea resoluble antes de outputarlo?
¿Cuánto tiempo tarda en generar un nivel en promedio?
¿Genera candidatos y filtra, o genera directamente un nivel válido?

[RESPUESTA CODEX]
El generador web sigue este flujo:
- Lee una configuración por nivel desde `curve` (`level_toolkit_web/app.js -> curve`).
- Usa RNG determinista (`app.js -> rng()` y `generateLevelRaw(levelNumber, seedOffset)`).
- Elige board size, pair count y blocker target.
- Coloca endpoints con `chooseNodes()`.
- Construye un `goldenPath` simple con `simplePath()` (vertical-first, luego horizontal).
- Cuenta soluciones con `countSolutions()`.
- Prueba blockers uno a uno y solo conserva los que bajan `solution_count` sin volverlo 0.

Algoritmo principal:
- Placement aleatorio determinista + scaffold Manhattan greedy (`chooseNodes()`, `simplePath()`).
- Filtrado por recomputación del contador de soluciones (`countSolutions()`).
- El `countSolutions()` sí usa DFS/backtracking recursivo para enumerar soluciones (`app.js -> countSolutions()`).

Parámetros controlados:
- `board` / `board_size`
- `pairs`
- `blockers`
- `density`
Todo viene de `curve[level]` (`app.js -> curve`, `generateLevelRaw()`).

¿Garantiza resoluble?
- `generateLevelRaw()` intenta mantener `currentCount >= 1`, pero no ejecuta `validateLevel()` antes de devolver.
- `generateLearnedSessionBatch()` sí filtra candidatos con `validateLevel(candidate).valid` (`app.js -> generateLearnedSessionBatch()`).
- `generateLevel()` genera 12 candidatos y elige el de mejor score de aprendizaje, no el “primero válido” (`app.js -> generateLevel()`, `scoreCandidateWithLearning()`).

Tiempo promedio:
- NO_ENCONTRADO. No hay medición ni benchmark de tiempo en el repo inspeccionado.

¿Candidatos + filtro o directo?
- Genera candidatos y luego elige el mejor por score de aprendizaje (`generateLevel()`).
- Dentro de cada candidato, también filtra blockers recontando soluciones (`generateLevelRaw()`).

BLOQUE 2 — Métricas y datos del prototipo
2.1 Datos de playtesting
[PREGUNTA CLAUDE]
¿Existe algún sistema de tracking o logging de sesiones de juego en el código?

¿Se registra en algún lugar cuántos intentos hace un jugador por nivel?
¿Se loguea dónde falla el jugador dentro de un nivel?
¿Hay algún archivo de resultados de playtesting que Codex pueda leer?
¿Qué niveles han mostrado mayor tasa de abandono o reintentos?

[RESPUESTA CODEX]
Sí. Hay tracking de sesiones de juego:
- `level_toolkit_web/app.js -> serializePlaySession()` guarda `saved_at`, `solved`, `level`, `selected_pair`, `paths`, `history`.
- `level_toolkit_web/app.js -> appendPlaytestDatasetRecord()` añade un JSON line a `playtest/playtest_events.jsonl`.
- `level_toolkit_web/app.js -> saveSolvedSession()` guarda archivos `playtest/play_session_level_<n>_<reason>.json`.
- `README.md` y `LEVEL_TOOLKIT_LIVE_STATUS.md` documentan `playtest/` y `playtest/playtest_events.jsonl` como dataset.

Intentos por nivel:
- No hay un contador agregado “attempts per level” en una estructura central.
- Sí hay múltiples archivos por nivel dentro de `playtest/`, lo que permite inferir repeticiones. Por ejemplo, el nivel 1 tiene 11 archivos de sesión en `playtest/`, el 5 tiene 4, el 6 tiene 2; niveles 2, 3, 4, 7, 8 y 9 tienen 1 cada uno. Evidencia: archivos `playtest/play_001...` a `play_023...`.

Dónde falla el jugador:
- Sí se guarda historial paso a paso dentro de `history` (`serializePlaySession()`), con eventos como `start_path`, `step`, `backtrack`, `reach_end`, `reset`.
- No existe un agregador que resuma “fail hotspots” automáticamente.

Archivos legibles:
- Sí: `playtest/*.json` y `playtest/playtest_events.jsonl`.

Mayor abandono o reintentos:
- Reintentos: el nivel 1 es el que más sesiones tiene en `playtest/` (11 archivos), seguido del nivel 5 (4).
- Abandono: solo encontré una sesión explícitamente `solved: false`, `playtest/play_018_play_session_level_5.json`; eso apunta a nivel 5, pero no hay un cálculo de “abandon rate” en el código.

2.2 Niveles de referencia actuales
[PREGUNTA CLAUDE]
¿Cuántos niveles handcrafted existen actualmente en el proyecto?

¿Hay niveles de prueba guardados en el repositorio? ¿En qué directorio?
¿Cuál es el nivel con mayor solution_count actual?
¿Cuál es el nivel con menor solution_count actual (más difícil)?
¿Existe algún nivel que haya fallado validación repetidamente?

[RESPUESTA CODEX]
Handcrafted exactos:
- NO_ENCONTRADO. El repo no etiqueta cada nivel como “handcrafted” vs “procedural”. Lo que sí existe son 189 JSON canónicos en `levels/` (conteo de directorio), pero su origen no está normalizado en metadata.

Niveles de prueba guardados:
- Sí. Principalmente en `playtest/` (sesiones con niveles embebidos) y en `levels/` (catálogo canónico de niveles). `README.md` marca `levels/`, `progressions/` y `playtest/` como source of truth.

Mayor `solution_count` actual:
- En el catálogo `levels/`, el máximo observado es 20, que además es el cap del contador (`level_toolkit_web/app.js -> countSolutions(cap=20)`).
- Ejemplos con 20: `levels/image01_level_editor.json`, `levels/p_6_a.json`, `levels/p_9_a.json`.

Menor `solution_count` actual:
- En el catálogo `levels/`, el mínimo observado es 0.
- Ejemplos: `levels/image13_level_editor.json`, `levels/image21_level_editor.json`, `levels/image33_level_editor.json`.
- Si se entiende “más difícil pero resoluble”, el mínimo resoluble observado es 1, por ejemplo `levels/image09_level_editor.json` y `levels/p_2_2.json`.

Fallos de validación repetidos:
- Sí hay repetición en playtest del nivel 1 con snapshots no resolubles: `playtest/play_002_play_session_level_1_manual.json`, `playtest/play_004_play_session_level_1_validate_3.json`, `playtest/play_010_play_session_level_1_validate_9.json`, `playtest/play_011_play_session_level_1_validate.json` tienen `level.validation.solvable: false`.
- Esto demuestra repetición en archivos guardados; no existe un reporte automático de “failed repeatedly”.

2.3 Performance del solution counter
[PREGUNTA CLAUDE]
¿Cómo se comporta el solution counter en la práctica?

¿Con qué frecuencia alcanza el cap de 20?
¿Hay niveles donde el conteo tarda notablemente más que otros?
¿El Zobrist hashing está reduciendo el search space de forma medible?
¿El MRV pruning está activo en todos los casos o solo en algunos?

[RESPUESTA CODEX]
Frecuencia del cap:
- En `levels/` observé 79 archivos con `solution_count: 20`.
- El cap está hardcodeado en `level_toolkit_web/app.js -> countSolutions(boardWidth, boardHeight, pairs, blockers, cap = 20)`.

Niveles más lentos:
- NO_ENCONTRADO. No hay métricas de tiempo por nivel ni profiling en el runtime web inspeccionado.

Zobrist hashing:
- No está implementado en `level_toolkit_web/app.js -> countSolutions()`.
- La memoización actual usa una string key `${idx}|${Array.from(occ).sort().join(";")}`.
- El documento `LEVEL_GENERATOR_SPEC.md` recomienda Zobrist hashing, pero esa recomendación no coincide con la implementación web actual.

MRV pruning:
- No está implementado en el runtime web actual. `countSolutions()` recorre los pares en su orden de array (`pairs[idx]`), no selecciona el par con menor branching.
- `LEVEL_GENERATOR_SPEC.md` contiene MRV en pseudocódigo, pero no está activo en `level_toolkit_web/app.js`.

BLOQUE 3 — Propuesta de nuevas mecánicas
3.1 Cobertura total del tablero — viabilidad técnica
[PREGUNTA CLAUDE]
¿Es técnicamente viable añadir cobertura total del tablero como condición de victoria?

¿El grid ya rastrea qué celdas están OCCUPIED vs EMPTY?
¿Qué función habría que modificar para añadir esta condición?
¿El solution counter actual puede validar cobertura total, o requeriría modificación?
¿Añadir esta condición cambiaría la distribución de solution_count de los niveles existentes?
¿Hay niveles actuales que ya cumplan cobertura total como efecto secundario?

[RESPUESTA CODEX]
Sí, es técnicamente viable.

Rastreo de ocupación:
- En juego, `state.play.occupied` ya rastrea celdas ocupadas por paths y endpoints (`level_toolkit_web/app.js -> resetPlayState()`, `tryApplyPlayCell()`).
- En validación/solver, `countSolutions()` y `hasFullCoverSolution()` trabajan con conjuntos `occ`/`blockedSet`.
- El schema también contempla `EMPTY`, `BLOCKED`, `OCCUPIED` (`schemas/level-output.schema.json -> properties.grid.items.pattern`), aunque el grid exportado del editor solo contiene `EMPTY`, `BLOCKED` y `NODE_*` (`app.js -> makeGrid()`).

Qué función modificar:
- La condición de victoria runtime está en `level_toolkit_web/app.js -> evaluatePlayWin()`.
- Ahí habría que añadir una comprobación de cobertura total de celdas libres además de “todos los pares conectados”.

¿El solution counter actual sirve?
- Para contar soluciones “normales”, sí.
- Para validar existencia de al menos una solución full-cover ya existe `level_toolkit_web/app.js -> hasFullCoverSolution()`.
- Si quieres que `solution_count` cuente solo soluciones full-cover, entonces `countSolutions()` sí requeriría modificación porque hoy cuenta cualquier solución con todos los pares conectados.

¿Cambiaría la distribución de `solution_count`?
- Sí, casi seguro. `countSolutions()` hoy cuenta soluciones sin exigir full-cover, así que al imponer cobertura total el conteo solo podría mantenerse o bajar. Esto se deduce comparando `countSolutions()` con `hasFullCoverSolution()`.

¿Hay niveles actuales que ya cumplan cobertura total?
- NO_ENCONTRADO de forma catalogada. El repo no incluye un listado de niveles que pasen `hasFullCoverSolution()` salvo cuando `decal` se valida manualmente. Sí existe soporte técnico para comprobarlo (`validateLevel()` + `hasFullCoverSolution()`), pero no encontré un inventario ejecutado sobre todo el catálogo.

3.2 Input no destructivo — viabilidad técnica
[PREGUNTA CLAUDE]
¿Qué requeriría implementar input no destructivo (dibujar paths parciales y cambiar de par sin perder el progreso)?

¿El estado actual del path de cada par se guarda por separado o en una estructura compartida?
¿Habría conflictos de ocupación entre paths parciales de pares distintos?
¿Requeriría cambios en el modelo de datos o solo en la lógica de UI?
¿El play mode del editor (handlePlayClick, resetPlayState) soportaría esto con modificaciones menores?

[RESPUESTA CODEX]
El runtime actual ya conserva paths parciales por par, así que la base técnica existe.

Estado por separado o compartido:
- `state.play.paths` es un objeto por `pairId`.
- `state.play.occupied` es la estructura compartida de ocupación global.
- Evidencia: `level_toolkit_web/app.js -> resetPlayState()`, `tryApplyPlayCell()`.

Conflictos de ocupación:
- Sí, y ya están controlados.
- `tryApplyPlayCell()` rechaza una celda si `state.play.occupied.get(k)` pertenece a otro par.

¿Cambios de modelo de datos o solo UI?
- Para “dejar parcial y volver luego”, no hacen falta cambios de esquema: ya está soportado por `state.play.paths`.
- Para hacerlo más usable, harían falta cambios de UI/control, porque no hay selector visible de par en `level_toolkit_web/index.html`; el cambio de par hoy sucede al tocar un endpoint (`app.js -> handlePlayClick()`, `beginPlayDrag()`, `syncPlayPairSelect()`).

¿Modificaciones menores?
- Sí, para el editor play mode serían relativamente menores porque `resetPlayState()`, `handlePlayClick()` y `tryApplyPlayCell()` ya trabajan con estado multi-par.
- La mayor carencia actual es UX, no estructura de datos.

3.3 Sistema de hints — estructura técnica
[PREGUNTA CLAUDE]
¿Existe alguna base técnica para un sistema de hints?

¿El solution counter puede devolver un path válido, o solo cuenta?
¿El golden_path podría usarse como base para un hint?
¿Existe alguna función que compute el "siguiente mejor movimiento"?
¿Qué información mínima necesitaría un sistema de hints para funcionar?

[RESPUESTA CODEX]
Sí hay base parcial, pero no un sistema de hints implementado.

`solution counter`:
- `level_toolkit_web/app.js -> countSolutions()` solo cuenta; devuelve un número.
- No devuelve la solución elegida ni el siguiente paso óptimo.

`golden_path`:
- Sí puede servir como base.
- En procedural, `generateLevelRaw()` construye `goldenPath` completo por par.
- En editor/manual, `levelFromEditor()` guarda `golden_path` solo como `{ pairId: [start, end] }`, o sea no una ruta completa.

“Siguiente mejor movimiento”:
- NO_ENCONTRADO. No existe una función que compute un next-best move.

Información mínima necesaria:
- O bien una solución completa por par (por ejemplo un `golden_path` real), o bien un solver que además de contar devuelva una ruta válida.
- Estado actual del tablero/jugador (`state.play.paths`, `state.play.occupied`) para comparar progreso actual vs solución objetivo.

BLOQUE 4 — Curva de dificultad — datos concretos
4.1 Rangos de solution_count por densidad
[PREGUNTA CLAUDE]
¿Cuáles son los rangos exactos de solution_count para cada label de densidad?

¿Qué rango numérico corresponde a HIGH, MED-HIGH, MEDIUM, MED-LOW, LOW, VERY-LOW, SINGLE?
¿Estos rangos están hardcoded en el código? ¿Dónde exactamente?
¿Los rangos cambian según board_size (4×4 vs 5×5 vs 6×6)?
¿Existe algún caso donde un nivel 4×4 con densidad MEDIUM tenga más soluciones que un 5×5 con la misma densidad?

[RESPUESTA CODEX]
Sí, los rangos están hardcoded en `level_toolkit_web/app.js -> densityRanges`:
- `HIGH`: `[6, 20]`
- `MEDIUM-HIGH`: `[3, 5]`
- `MEDIUM`: `[2, 4]`
- `MEDIUM-LOW`: `[2, 3]`
- `LOW`: `[2, 2]`
- `VERY-LOW`: `[2, 2]`
- `SINGLE`: `[1, 1]`
- `LOW-MEDIUM`: `[2, 4]`

Los mismos valores aparecen en `LEVEL_GENERATOR_SPEC.md -> Density Categories`.

¿Cambian según board_size?
- No. `densityMatch(label, count)` solo consulta `densityRanges[label]`; no usa board size (`app.js -> densityMatch()`).

¿Caso 4x4 MEDIUM > 5x5 MEDIUM?
- Sí, en el catálogo actual hay ejemplos.
- `levels/lvl_067_p_2_b.json` es `4x4`, `target_density: MEDIUM`, `solution_count: 20`.
- `levels/lvl_048_level_05.json` es `5x5`, `target_density: MEDIUM`, `solution_count: 2`.
- Esto refleja que el catálogo contiene niveles fuera de su banda objetivo; `validateLevel()` no invalida por `density_match`.

4.2 Recommended moves por nivel
[PREGUNTA CLAUDE]
¿Cómo calcula recommendedMoves() el número de movimientos sugerido?

¿Cuál es la fórmula o lógica exacta?
¿Está basado en board_size, pair_count, o solution_count?
¿Los valores recomendados han sido validados con playtesting?
¿Cuáles son los valores recomendados para cada nivel del 1 al 10?

[RESPUESTA CODEX]
`recommendedMoves()` suma la distancia Manhattan entre start y end de cada par activo y luego añade el número de blockers del editor. Evidencia: `level_toolkit_web/app.js -> recommendedMoves()`.

Fórmula exacta:
- `sum(manhattan(pair.start, pair.end)) + state.editor.blockers.size`

Está basado en:
- endpoints actuales del editor
- número de blockers
No usa `board_size` directamente ni `solution_count`.

Playtesting:
- NO_ENCONTRADO. No hay evidencia en el código de que esos valores se hayan validado con playtesting.

Valores por nivel 1..10:
- NO_ENCONTRADO como tabla fija. `recommendedMoves()` no depende del número de nivel sino del layout actual cargado en el editor.

4.3 Distribución real de dificultad
[PREGUNTA CLAUDE]
¿Cómo se distribuye la dificultad en los niveles existentes?

Para cada nivel del 1 al 10: ¿cuál es el solution_count real de los niveles diseñados hasta ahora?
¿Hay saltos bruscos de dificultad entre niveles adyacentes?
¿El salto de 4×4 (nivel 4) a 5×5 (nivel 5) genera un reset perceptible de dificultad?
¿El nivel 10 es subjetivamente más fácil que el 9 en los tests actuales?

[RESPUESTA CODEX]
No hay una única curva diseñada canónica en el repo; hay al menos tres progressions activas (`progressions/progressionA_after_feedback.json`, `progressionB_after_feedback.json`, `progressionC_after_feedback.json`) y difieren mucho en `solution_count`.

Ejemplos actuales por progression:
- Progression A: L2=20, L3=2, L4=6, L5=14, L6=20, L7=0, L8=2, L9=20, L10=6.
- Progression B: L2=20, L3=1, L4=0, L5=0, L6=20, L7=1, L8=0, L9=0, L10=20.
- Progression C: L2=20, L3=2, L4=20, L5=19, L6=0, L7=0, L8=8, L9=8, L10=20.
Cada valor sale del archivo de progression correspondiente + el `levels/*.json` referenciado.

Saltos bruscos:
- Sí, claramente. Hay saltos como 2 -> 20 o 20 -> 0 entre niveles adyacentes en las progressions activas.

Salto 4x4 a 5x5 entre L4 y L5:
- No hay un patrón único verificable. En las progressions activas, a veces L4 y L5 ni siquiera mantienen la misma familia de board sizes; por ejemplo Progression A pasa de `4x4` con 6 soluciones a `6x6` con 14 soluciones.

¿Nivel 10 subjetivamente más fácil que 9?
- NO_ENCONTRADO. El repo no contiene evaluación subjetiva consolidada de tests que permita afirmarlo.

BLOQUE 5 — Juegos de referencia
5.1 Análisis de referencia
[PREGUNTA CLAUDE]
¿Hay documentación en el repo sobre los juegos de referencia analizados para Feed the Bear?

¿Qué juegos se usaron como referencia? (nombres exactos)
¿Hay notas de análisis, capturas o documentos en el repositorio?
¿Qué mecánicas específicas de esos juegos se decidió adoptar?
¿Qué mecánicas se descartaron explícitamente y por qué?

[RESPUESTA CODEX]
Sí, encontré documentación en el repo, pero no en el código runtime principal.

Juegos de referencia identificados:
- `Flow Free+`
- `Flow Free`
Evidencia: `codex-audit-output.md -> "PRODUCT IMPROVEMENT NOTES — REFERENCE: FLOW FREE+ (APPLE ARCADE)"`.

Notas/documentos:
- `codex-audit-output.md` contiene comparación explícita con `Flow Free+` / `Flow Free`.
- `artifacts/` contiene screenshots del toolkit y capturas relacionadas, pero no encontré un dossier separado exclusivamente de reference games en los archivos inspeccionados.

Mecánicas que el análisis propone adoptar:
- full-board coverage como regla central
- mejor legibilidad de dificultad
- planning más flexible con paths parciales
- challenge modes más explícitos
Esto está en `codex-audit-output.md`, pero aparece como recomendación/auditoría, no como decisión ya implementada en `app.js`.

Mecánicas descartadas explícitamente:
- NO_ENCONTRADO. No vi un documento que diga “esta mecánica se descartó” con una razón formal.

5.2 Diferencias clave identificadas
[PREGUNTA CLAUDE]
¿Hay algún documento o comentario en el código que identifique las diferencias clave entre Feed the Bear y los juegos de referencia?

¿Dónde están documentadas estas decisiones de diseño?
¿Se ha discutido el tema de cobertura total en algún issue, PR o comentario del repo?

[RESPUESTA CODEX]
Sí, la comparación más explícita que encontré está en `codex-audit-output.md`.

Diferencias clave documentadas ahí:
- Feed the Bear gana conectando pares; `Flow Free+` usa full-board coverage como regla central.
- Feed the Bear conserva `moves` como metadata no aplicada.
- Feed the Bear tiene tooling editorial fuerte, pero el player loop está menos productizado.

Dónde están documentadas:
- `codex-audit-output.md`
- `LEVEL_TOOLKIT_LIVE_STATUS.md` documenta `Decal` como validación opcional de full-board coverage.
- `TOOLKIT_DESIGNER_VIBE_CODING_NOTES.md` menciona `Decal` para full free-cell coverage.

Issues/PRs:
- NO_ENCONTRADO. No hay tracker de issues/PRs dentro del repo local inspeccionado.

BLOQUE 6 — Accessibility y design system
6.1 Identificación de pares — implementación actual
[PREGUNTA CLAUDE]
¿Cómo se identifican visualmente los pares en el prototipo actual?

¿Solo por color, o también por forma/símbolo?
¿Hay algún asset o CSS que defina los colores de los pares A, B, C, D?
¿Existe algún modo de accesibilidad implementado o planificado?
¿Los colores actuales pasan algún test de contraste para daltonismo?

[RESPUESTA CODEX]
Los pares no se identifican solo por color.

Implementación visual actual:
- Start endpoint: rectángulo relleno con texto `A1`, `B1`, etc.
- End endpoint: círculo relleno con texto `A2`, `B2`, etc.
- Paths: líneas coloreadas.
Evidencia: `level_toolkit_web/app.js -> drawBoardOn()`.

Colores:
- Están definidos en JS, no en CSS, en `level_toolkit_web/app.js -> pairColors`.
- Valores actuales: `A #0EA5E9`, `B #10B981`, `C #F59E0B`, `D #EC4899`, `E #8B5CF6`.

Accesibilidad implementada o planificada:
- Implementada: tooltips/ayuda textual para el canvas y algunos controles (`level_toolkit_web/app.js -> uiTooltips`, incluye `board-canvas` y `session-board-canvas`).
- No encontré un modo específico de accesibilidad para color blindness, high-contrast o teclado en el runtime.

Test de contraste/daltonismo:
- NO_ENCONTRADO. No hay tests ni validaciones automáticas de contraste/daltonismo en los archivos inspeccionados.

6.2 Deep Ocean Light en el juego
[PREGUNTA CLAUDE]
¿El design system Deep Ocean Light está aplicado al juego en sí, o solo a las herramientas de diseño?

¿El canvas del juego usa los colores de Deep Ocean Light?
¿El fondo (#EFF6FF) aparece en algún archivo del juego?
¿Los tokens de color están definidos en un archivo CSS o JS centralizado?

[RESPUESTA CODEX]
Deep Ocean Light aparece documentado en `DESIGN_SYSTEM_CODEX.md`, pero no está aplicado literalmente como sistema de tokens en el runtime del juego.

Canvas/juego:
- `level_toolkit_web/app.js -> drawBoardOn()` usa colores hardcodeados como `#f7fbff`, `#cbd5e1`, `#334155`, además de `pairColors`.
- `level_toolkit_web/app.js -> DEFAULT_UI_THEME` define otro set (`bg: "#f3f7fb"`, etc.), distinto del token exacto `#EFF6FF`.

¿Aparece `#EFF6FF`?
- Sí en `DESIGN_SYSTEM_CODEX.md`.
- NO lo encontré en `level_toolkit_web/app.js`, `level_toolkit_web/styles.css` ni `level_toolkit_web/index.html`.

Tokens centralizados:
- En el runtime hay una centralización parcial en JS mediante `DEFAULT_UI_THEME` y `pairColors` dentro de `level_toolkit_web/app.js`.
- No encontré un sistema unificado de design tokens compartido entre CSS y JS para el juego.

BLOQUE 7 — Roadmap y pendientes técnicos
7.1 Issues o TODOs conocidos
[PREGUNTA CLAUDE]
¿Hay issues, TODOs o FIXMEs en el código relacionados con las mecánicas de dificultad?

¿Qué features están marcadas como pendientes o incompletas?
¿Hay algún comentario en el código que señale limitaciones conocidas del sistema actual?
¿El validation.density_match hardcodeado a true está marcado como deuda técnica en algún lugar?

[RESPUESTA CODEX]
TODO/FIXME en el código fuente inspeccionado:
- NO_ENCONTRADO para TODO/FIXME explícitos sobre mecánicas de dificultad en `level_toolkit_web/app.js`.

Pendientes/incompletas documentadas:
- `PROCEDURAL_GENERATION_LOGIC.md` dice que el generador actual es un “candidate shaper”, no un diseñador completo.
- `LEVEL_TOOLKIT_LIVE_STATUS.md` documenta que `Decal` es opcional y que la validación prioriza playability.
- `codex-audit-output.md` lista carencias como: `moves` no aplicados en runtime, full-board coverage opcional, falta de accesibilidad canvas-first, divergencia entre `src/` y `level_toolkit_web/app.js`.

Limitaciones conocidas en código/documentación:
- `level_toolkit_web/app.js -> generateLevelRaw()` sigue siendo square-only aunque el editor soporta rectangular boards; esto también está señalado en `PROCEDURAL_GENERATION_LOGIC.md`.
- `level_toolkit_web/app.js -> countSolutions()` no implementa MRV ni Zobrist aunque el spec sí los recomienda.

Sobre `validation.density_match hardcodeado a true`:
- No es cierto en la versión actual del runtime web.
- `level_toolkit_web/app.js -> levelFromEditor()` calcula `density_match` con `densityMatch(targetDensity, solutionCount)`.
- `level_toolkit_web/app.js -> generateLevelRaw()` también lo calcula con `densityMatch(cfg.density, solutionCount)`.
- No encontré deuda técnica sobre un `true` hardcodeado porque en el código actual no está hardcodeado.

7.2 Dependencias y riesgos
[PREGUNTA CLAUDE]
¿Qué cambios en las mecánicas tendrían mayor impacto en el código existente?

¿Añadir cobertura total como condición de victoria requeriría reescribir el solution counter?
¿El modelo de datos actual (grid, pairs, blockers) soporta las mecánicas propuestas sin cambios de esquema?
¿Hay alguna dependencia externa (librerías, APIs) que limite las opciones de implementación?

[RESPUESTA CODEX]
Cambios de mayor impacto:
- Hacer full-board coverage obligatoria tocaría runtime (`evaluatePlayWin()`), validación (`validateLevel()`), dificultad (`solution_count` y `density_match`) y posiblemente el catálogo ya guardado.
- Hacer `moves` una regla real tocaría `tryApplyPlayCell()`, UI de play mode, estado de sesión y condiciones de derrota.
- Unificar `src/` con `level_toolkit_web/app.js` también sería de alto impacto porque hoy divergen en generación y conteo.

¿Cobertura total requiere reescribir `solution counter`?
- No para la victoria runtime básica: se puede extender `evaluatePlayWin()` usando la ocupación ya existente.
- No para validación booleana: ya existe `hasFullCoverSolution()`.
- Sí si se quiere que `solution_count` enumere solo soluciones full-cover, porque `countSolutions()` hoy no hace esa distinción.

¿El modelo de datos actual soporta las mecánicas propuestas?
- Sí, para full-cover e input no destructivo: `pairs`, `blockers`, `grid` y `state.play.paths/occupied` ya alcanzan.
- Para hints, también alcanza como base si se añade una solución completa por par o un solver que la devuelva.
- No haría falta cambio de schema inmediato para esas tres mecánicas.

Dependencias externas:
- El runtime principal es vanilla JS/HTML/CSS; no depende de una librería de game engine.
- Hay dependencias de tooling (`typescript`, `vitest`, `playwright`) y un servidor local Node para guardar archivos, pero no veo una dependencia externa que bloquee estas mecánicas.

Estado del documento
CampoValorCreado porClaude (Sonnet 4.6)Fecha2026-03-12Dirigido aCodexPropósitoRecopilar información para el documento "Propuesta de Nuevas Mecánicas y Dificultad"Siguiente pasoCodex completa respuestas → Claude lee el archivo → Claude genera el Canva docArchivo de salida esperadofeed-the-bear-mechanics-proposal-canva.md

Nota para Codex: Cuando hayas completado todas las respuestas, deja una línea al final del archivo con el texto:
CODEX_COMPLETE: [fecha y hora]
Esto indicará a Claude que el archivo está listo para ser procesado.

CODEX_COMPLETE: 2026-03-12 19:13:18 CET
