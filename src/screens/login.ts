import { api } from '../api'
import { $, onAct, showError } from '../ui/dom'
import { start } from '../main'

export async function loginScreen(body: HTMLElement): Promise<void> {
  let mode: 'login' | 'register' = 'login'
  const draw = () => {
    body.innerHTML = `<div class="title-screen">
      <div class="left"><div>
        <div class="logo-big">코덱스의 시험<small>CODEX'S TRIAL · DOROLAND</small></div>
        <div class="title-pets">
          <div><img class="pet" src="/art/px/pet_cat_baby.png" alt=""></div>
          <div><img class="pet" src="/art/px/pet_dog_baby.png" alt=""></div>
          <div><img class="pet" src="/art/px/pet_rabbit_baby.png" alt=""></div>
        </div>
      </div></div>
      <div class="right"><form class="box login" id="f">
        <h3>${mode === 'login' ? '🔑 로그인' : '✨ 새 대원 등록'}</h3>
        <label class="lb" for="u">아이디</label><input class="inp" id="u" autocomplete="username" required>
        ${mode === 'register' ? '<label class="lb" for="n">닉네임</label><input class="inp" id="n" maxlength="12" required>' : ''}
        <label class="lb" for="p">비밀번호</label><input class="inp" id="p" type="password" autocomplete="current-password" required>
        <p class="err" id="err"></p>
        <button class="btn big" style="width:100%">${mode === 'login' ? '입장하기 ▶' : '등록하고 시작 ▶'}</button>
        <p class="center small" style="margin:10px 0 0"><a href="#" data-act="swap">${mode === 'login' ? '처음이에요 → 새 대원 등록' : '← 로그인으로'}</a></p>
        ${mode === 'login' ? `<div class="demo-acc"><span class="small mute">데모 계정 (눌러서 바로 입장)</span>
          <button type="button" class="btn out sm" data-act="demo" data-u="student1" data-p="doro1234">🧒 학생 student1 / doro1234</button>
          <button type="button" class="btn out sm" data-act="demo" data-u="student2" data-p="doro1234">🧒 학생 student2 / doro1234</button>
          <button type="button" class="btn out sm" data-act="demo" data-u="admin" data-p="admin1234">🛠 관리자 admin / admin1234</button></div>` : ''}
      </form></div></div>`
    $<HTMLFormElement>('#f', body).onsubmit = async (e) => {
      e.preventDefault()
      const u = $<HTMLInputElement>('#u', body).value, p = $<HTMLInputElement>('#p', body).value
      try {
        if (mode === 'login') await api.login(u, p)
        else await api.register(u, p, $<HTMLInputElement>('#n', body).value)
        await start()
      } catch (err) { $('#err', body).textContent = (err as Error).message }
    }
  }
  onAct(body, {
    swap: (_el, ev) => { ev.preventDefault(); mode = mode === 'login' ? 'register' : 'login'; draw() },
    demo: async (el) => { try { await api.login(el.dataset.u!, el.dataset.p!); await start() } catch (e) { showError(e) } },
  })
  draw()
}
