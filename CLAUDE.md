# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Electron app in development via `electron-vite dev`.
- `npm run build` — build main, preload, and renderer output into `out/`.
- `npm run preview` — preview the built Electron app with `electron-vite preview`.
- `npm run dist` — build the app and package it with `electron-builder` into `dist/`.
- `npx vite --config src/renderer/vite.config.js` — run the renderer-only Vite preview on port 5173; this is also configured as `renderer-preview` in `.claude/launch.json`.

There are no test or lint scripts currently defined in `package.json`.

## Architecture

This is an Electron + React Pomodoro desktop app. `electron-vite` builds three entry points: Electron main process (`src/main/index.js`), preload bridge (`src/preload/index.js`), and React renderer (`src/renderer/src`). Packaging metadata lives in `package.json` under the `build` key, with macOS DMG output configured for the product name `番茄钟`.

The Electron main process owns the native `BrowserWindow`, fixed full/mini window sizes, external-link handling, and IPC handlers for always-on-top mode, opacity, and window movement. The preload script exposes only `window.electronAPI` methods (`setAlwaysOnTop`, `moveWindow`, `setOpacity`) to the renderer through `contextBridge`.

The renderer is a single React app rooted at `src/renderer/src/App.jsx`. `App` owns the top-level tab state and persisted application state (`pt_settings`, `pt_tasks`, `pt_stats`, `pt_active_task`) via `useLocalStorage`, merges saved settings with defaults, applies theme attributes to `<html>`, and forwards opacity changes to Electron.

Major renderer views are component-scoped:

- `Timer.jsx` manages Pomodoro modes, countdown timing, notifications, sound playback, custom duration editing, mini pinned mode, and completion callbacks.
- `TaskList.jsx` manages task creation, completion, active-task selection, and per-task Pomodoro counts.
- `Statistics.jsx` derives today, seven-day, and all-time aggregates from persisted stats.
- `Settings.jsx` edits duration, theme, opacity, auto-start, sound, and notification settings.

Styling is mostly CSS custom properties in `src/renderer/src/index.css`, with view-specific styles embedded in component `<style>` tags. Theme selection works by setting `data-theme` on `<html>`; timer mode colors work by setting `data-mode` on the relevant view root. The default `midnight` theme is represented by no `data-theme` attribute.

The renderer-only preview can exercise most UI interactions, but Electron-specific APIs are optional-chained in renderer code and only take effect in the full Electron runtime.
