import { signInWithPassword, signUp } from '../../services/auth.service'

export function renderLoginScreen(container: HTMLElement): void {
  container.innerHTML = `
    <div class="login-screen">

      <!-- Ambient background blobs -->
      <div class="login-bg-blob login-blob-1"></div>
      <div class="login-bg-blob login-blob-2"></div>

      <div class="login-card">

        <!-- Logo -->
        <div class="login-logo-row">
          <div class="login-logo-mark">S</div>
          <div>
            <div class="login-brand">Story OS</div>
            <div class="login-tagline">Para escritores que levam a sério</div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="login-tabs">
          <button class="login-tab active" id="tab-signin">Entrar</button>
          <button class="login-tab" id="tab-signup">Criar conta</button>
        </div>

        <!-- Error / Success banner -->
        <div id="login-banner" class="login-banner" style="display:none;"></div>

        <!-- Sign In -->
        <form id="signin-form" class="login-form">
          <div class="lf-group">
            <label class="lf-label">E-mail</label>
            <input class="lf-input" type="email" id="signin-email"
              placeholder="seu@email.com" required autocomplete="email"/>
          </div>
          <div class="lf-group">
            <label class="lf-label">Senha</label>
            <input class="lf-input" type="password" id="signin-password"
              placeholder="••••••••" required autocomplete="current-password"/>
          </div>
          <button type="submit" class="login-btn-primary">
            <span class="btn-text">Entrar</span>
            <span class="btn-spinner" style="display:none;">⏳</span>
          </button>
        </form>

        <!-- Sign Up -->
        <form id="signup-form" class="login-form" style="display:none;">
          <div class="lf-group">
            <label class="lf-label">Nome</label>
            <input class="lf-input" type="text" id="signup-name"
              placeholder="Seu nome completo" required autocomplete="name"/>
          </div>
          <div class="lf-group">
            <label class="lf-label">E-mail</label>
            <input class="lf-input" type="email" id="signup-email"
              placeholder="seu@email.com" required autocomplete="email"/>
          </div>
          <div class="lf-group">
            <label class="lf-label">Senha</label>
            <input class="lf-input" type="password" id="signup-password"
              placeholder="Mínimo 6 caracteres" required minlength="6"/>
          </div>
          <button type="submit" class="login-btn-primary">
            <span class="btn-text">Criar conta grátis</span>
            <span class="btn-spinner" style="display:none;">⏳</span>
          </button>
        </form>

        <p class="login-footer">
          Seus dados são protegidos com criptografia end-to-end.
        </p>
      </div>
    </div>
  `

  const tabSignin  = container.querySelector('#tab-signin')   as HTMLButtonElement
  const tabSignup  = container.querySelector('#tab-signup')   as HTMLButtonElement
  const formSignin = container.querySelector('#signin-form')  as HTMLFormElement
  const formSignup = container.querySelector('#signup-form')  as HTMLFormElement
  const banner     = container.querySelector('#login-banner') as HTMLDivElement

  function showBanner(msg: string, type: 'error' | 'success') {
    banner.textContent = msg
    banner.className = `login-banner login-banner-${type}`
    banner.style.display = 'block'
  }
  function hideBanner() { banner.style.display = 'none' }

  tabSignin.addEventListener('click', () => {
    tabSignin.classList.add('active'); tabSignup.classList.remove('active')
    formSignin.style.display = ''; formSignup.style.display = 'none'
    hideBanner()
  })
  tabSignup.addEventListener('click', () => {
    tabSignup.classList.add('active'); tabSignin.classList.remove('active')
    formSignup.style.display = ''; formSignin.style.display = 'none'
    hideBanner()
  })

  formSignin.addEventListener('submit', async (e) => {
    e.preventDefault()
    hideBanner()
    const btn  = formSignin.querySelector('.login-btn-primary') as HTMLButtonElement
    const text = btn.querySelector('.btn-text') as HTMLElement
    const spin = btn.querySelector('.btn-spinner') as HTMLElement
    btn.disabled = true; text.textContent = 'Entrando…'; spin.style.display = 'inline'

    const email    = (formSignin.querySelector('#signin-email')    as HTMLInputElement).value
    const password = (formSignin.querySelector('#signin-password') as HTMLInputElement).value

    const { error } = await signInWithPassword(email, password)
    if (error) {
      showBanner('E-mail ou senha inválidos.', 'error')
      btn.disabled = false; text.textContent = 'Entrar'; spin.style.display = 'none'
    }
  })

  formSignup.addEventListener('submit', async (e) => {
    e.preventDefault()
    hideBanner()
    const btn  = formSignup.querySelector('.login-btn-primary') as HTMLButtonElement
    const text = btn.querySelector('.btn-text') as HTMLElement
    const spin = btn.querySelector('.btn-spinner') as HTMLElement
    btn.disabled = true; text.textContent = 'Criando…'; spin.style.display = 'inline'

    const name     = (formSignup.querySelector('#signup-name')     as HTMLInputElement).value
    const email    = (formSignup.querySelector('#signup-email')    as HTMLInputElement).value
    const password = (formSignup.querySelector('#signup-password') as HTMLInputElement).value

    const { error } = await signUp(email, password, name)
    if (error) {
      const msg = (error.message && error.message !== '{}')
        ? error.message
        : 'Erro ao criar conta. Verifique sua conexão.'
      showBanner(msg, 'error')
      btn.disabled = false; text.textContent = 'Criar conta grátis'; spin.style.display = 'none'
    } else {
      showBanner('Conta criada! Verifique seu e-mail para confirmar.', 'success')
      btn.disabled = false; text.textContent = 'Criar conta grátis'; spin.style.display = 'none'
    }
  })
}
