# mvp-frontend

Frontend Vue 3 + Vite + TS + Pinia + vue-i18n for the Exam Generator.

> **Status:** complete — UI in English by default with EN/ES language switcher
> (persisted in `localStorage`), all texts via `t()` from `src/i18n/`.

## Structure

- `src/i18n/` — vue-i18n setup + `en.ts` / `es.ts` catalogs
- `src/views/` — Subjects, Bank, Exams, Material, Chat
- `src/components/chat/` — ChatPanel, MessageList, ToolActivity, ThreadSidebar, FileDrop
- `src/components/widgets/` — QuestionCard, QuestionsTable, ArtifactCard, MaterialToast
- `src/stores/` — Pinia stores (chat, subjects, bank, exams, material)
- `src/api/` — REST client, SSE stream, WS client, runtime URL resolution

