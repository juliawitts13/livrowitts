import type { Profile, Project } from '../types/database.types'

type Listener = () => void

interface AppState {
  currentUser: Profile | null
  currentProject: Project | null
  isLoading: boolean
}

const state: AppState = {
  currentUser: null,
  currentProject: null,
  isLoading: true,
}

const listeners = new Set<Listener>()

function notify() {
  listeners.forEach(fn => fn())
}

export const appStore = {
  getState(): Readonly<AppState> {
    return state
  },

  setCurrentUser(user: Profile | null) {
    state.currentUser = user
    notify()
  },

  setCurrentProject(project: Project | null) {
    state.currentProject = project
    notify()
  },

  setLoading(loading: boolean) {
    state.isLoading = loading
    notify()
  },

  subscribe(fn: Listener): () => void {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}
