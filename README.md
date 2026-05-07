# Pomodoro Timer

A beautiful Pomodoro timer desktop app built with Electron, React, and Vite.

## Features

- Pomodoro, short break, and long break timer modes
- Task list with active-task tracking
- Per-task Pomodoro progress counts
- Daily, seven-day, and all-time statistics
- Customizable durations, theme, opacity, sound, and notifications
- Mini pinned timer mode for keeping the timer on top
- Local persistence for settings, tasks, stats, and active task

## Tech Stack

- Electron
- React
- Vite
- electron-vite
- electron-builder

## Getting Started

Install dependencies:

```bash
npm install
```

Start the app in development mode:

```bash
npm run dev
```

Build the app:

```bash
npm run build
```

Package the desktop app:

```bash
npm run dist
```

## Project Structure

```text
src/main/        Electron main process
src/preload/     Preload bridge exposed to the renderer
src/renderer/    React renderer app
build/           App icons and packaging resources
```

## Notes

The app stores user data locally in browser storage keys such as `pt_settings`, `pt_tasks`, `pt_stats`, and `pt_active_task`.
