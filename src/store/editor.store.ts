import type { Chapter } from '../types/database.types'

type SaveState = 'idle' | 'editing' | 'saving' | 'saved' | 'error'
type Listener = () => void

interface EditorState {
  currentChapter: Chapter | null
  saveState: SaveState
  wordCountAtSessionStart: number
}

const state: EditorState = {
  currentChapter: null,
  saveState: 'idle',
  wordCountAtSessionStart: 0,
}

const listeners = new Set<Listener>()

function notify() {
  listeners.forEach(fn => fn())
}

export const editorStore = {
  getState(): Readonly<EditorState> {
    return state
  },

  setChapter(chapter: Chapter | null) {
    state.currentChapter = chapter
    state.saveState = 'idle'
    if (chapter) state.wordCountAtSessionStart = chapter.word_count
    notify()
  },

  setSaveState(s: SaveState) {
    state.saveState = s
    notify()
  },

  subscribe(fn: Listener): () => void {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}
