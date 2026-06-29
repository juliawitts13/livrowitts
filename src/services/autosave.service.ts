import { debounce } from '../utils/debounce'
import { upsertChapter } from './chapters.service'
import { editorStore } from '../store/editor.store'
import { AUTOSAVE_DEBOUNCE_MS } from '../lib/constants'

type SaveInfoUpdater = (text: string) => void

let updateSaveInfo: SaveInfoUpdater = () => {}

export function setSaveInfoUpdater(fn: SaveInfoUpdater) {
  updateSaveInfo = fn
}

export const scheduleAutosave = debounce(async (content: string) => {
  const { currentChapter } = editorStore.getState()
  if (!currentChapter) return

  editorStore.setSaveState('saving')
  updateSaveInfo('Salvando...')

  try {
    await upsertChapter({ id: currentChapter.id, content })
    editorStore.setSaveState('saved')
    updateSaveInfo('Salvo agora')
    // Reset to idle after 3s
    setTimeout(() => {
      if (editorStore.getState().saveState === 'saved') {
        editorStore.setSaveState('idle')
        updateSaveInfo('Salvo')
      }
    }, 3000)
  } catch {
    editorStore.setSaveState('error')
    updateSaveInfo('Erro ao salvar')
  }
}, AUTOSAVE_DEBOUNCE_MS)

export async function flushSave(content: string): Promise<void> {
  const { currentChapter } = editorStore.getState()
  if (!currentChapter) return

  editorStore.setSaveState('saving')
  updateSaveInfo('Salvando...')

  try {
    await upsertChapter({ id: currentChapter.id, content })
    editorStore.setSaveState('saved')
    updateSaveInfo('Salvo agora')
  } catch {
    editorStore.setSaveState('error')
    updateSaveInfo('Erro ao salvar')
  }
}
