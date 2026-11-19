import './styles/base.css'
import { initRouter, go } from './router'
import { usingMock } from './api/client'
import { homeScreen } from './screens/home'
import { mapScreen } from './screens/map'
import { devBattleScreen } from './screens/devBattle'

/**
 * Entry point DORO can call from DOROBUS: mountCodexTrial(document.getElementById('...')!)
 * It only needs an empty element; the game draws everything inside it.
 */
export function mountCodexTrial(el: HTMLElement): void {
  el.classList.add('codex-trial')
  initRouter(el, {
    home: homeScreen,
    map: mapScreen,
    battle: devBattleScreen, // TODO(Wafi): replace with the real battle screen
  })
  void go('home')
  if (usingMock) console.info('[codex-trial] using MOCK api (VITE_USE_MOCK=true). resetMock() in the console wipes it.')
}

mountCodexTrial(document.getElementById('codex-trial')!)
