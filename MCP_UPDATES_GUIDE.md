# MCP Control Panel — Логика проверки и отображения обновлений

## Описание изменений

В **MCP Control Panel** обновлена система проверки актуальности пакетов и рендеринга интерфейса. Кнопка **«⚡ Обновить»** теперь отображается **исключительно при наличии реального обновления**.

---

## 1. Алгоритм проверки версий (SemVer)

1. **Определение типа пакета:**
   * **PyPI / Python:** `pip show <pkg>` или быстрый вызов `importlib.metadata.version('<pkg>')`.
   * **NPM / Node:** анализ аргументов сервера на наличие закрепленной версии (`@x.y.z`) или флага `@latest`.

2. **Запрос актуальной версии:**
   * **PyPI:** `https://pypi.org/pypi/<pkg>/json` $\rightarrow$ `info.version`
   * **NPM Registry:** `https://registry.npmjs.org/<pkg>/latest` $\rightarrow$ `version`

3. **Сравнение версий (`compareVersions`):**
   * Если локальная версия равна версии из реестра (`local == latest`) $\rightarrow$ `hasUpdate = false`.
   * Если в конфигурации прописан `@latest` (автообновление при старте) $\rightarrow$ `hasUpdate = false`.
   * Если реестр содержит строго более новую версию (`latest > local`) $\rightarrow$ `hasUpdate = true`.

---

## 2. Поведение пользовательского интерфейса (UI)

| Состояние | Кнопка «Обновить» | Бейдж версии |
| :--- | :--- | :--- |
| **Есть новая версия (`hasUpdate: true`)** | Показывается кнопка `⚡ Обновить` | Отображается переход: `v[local] ➔ v[latest]` |
| **Установлена последняя версия (`hasUpdate: false`)** | **Скрыта (кнопки нет)** | Ненавязчивая метка `v[local]` или чистое имя |
| **Используется `@latest`** | **Скрыта (кнопки нет)** | Без лишних предупреждений |

---

## 3. Задействованные файлы

* `C:/Users/may/.gemini/antigravity/scratch/mcp_gui_server.mjs` — бэкенд-сервер MCP панели (порт `7890`).
* `C:/Users/may/.gemini/antigravity/scratch/mcp_panel.html` — фронтенд интерфейс панели.
* `C:/Users/may/.gemini/antigravity/scratch/_PROJECTS/MCP_Manager/` — исходники проекта и резервная копия.

---

## 4. Пример статусов серверов

```text
omniroute         -> hasUpdate: False (latest)
mempalace         -> hasUpdate: False (v3.8.0 == v3.8.0)
playwright        -> hasUpdate: False (@latest)
context7          -> hasUpdate: False (@latest)
agentmemory       -> hasUpdate: False (@latest)
obsidian          -> hasUpdate: True  (v0.2.2 ➔ v0.2.3) -> [⚡ Обновить]
graphify          -> hasUpdate: True  (v0.9.45 ➔ v0.9.48) -> [⚡ Обновить]
```
