import { signInWithPassword, signUp } from '../../services/auth.service'

export function renderLoginScreen(container: HTMLElement): void {
  container.innerHTML = `
    <div class="login-screen">
      <div class="login-card">
        <div class="login-logo">
          <div class="logo-mark" style="width:44px;height:44px;font-size:20px;border-radius:12px;">S</div>
          <div>
            <div style="font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.5px;">Story OS</div>
            <div style="font-size:12px;color:var(--text-3);letter-spacing:0.3px;">Sistema Operacional para Escritores</div>
          </div>
        </div>

        <div class="login-tabs">
          <button class="login-tab active" id="tab-signin">Entrar</button>
          <button class="login-tab" id="tab-signup">Criar conta</button>
        </div>

        <div id="login-error" class="login-error" style="display:none;"></div>

        <!-- Sign In Form -->
        <form id="signin-form" class="login-form">
          <div class="login-field">
            <label>E-mail</label>
            <input type="email" id="signin-email" placeholder="seu@email.com" required autocomplete="email"/>
          </div>
          <div class="login-field">
            <label>Senha</label>
            <input type="password" id="signin-password" placeholder="••••••••" required autocomplete="current-password"/>
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;padding:10px;">
            Entrar
          </button>
        </form>

        <!-- Sign Up Form -->
        <form id="signup-form" class="login-form" style="display:none;">
          <div class="login-field">
            <label>Nome</label>
            <input type="text" id="signup-name" placeholder="Seu nome" required/>
          </div>
          <div class="login-field">
            <label>E-mail</label>
            <input type="email" id="signup-email" placeholder="seu@email.com" required autocomplete="email"/>
          </div>
          <div class="login-field">
            <label>Senha</label>
            <input type="password" id="signup-password" placeholder="Mínimo 6 caracteres" required minlength="6"/>
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;padding:10px;">
            Criar conta grátis
          </button>
        </form>

        <div style="text-align:center;margin-top:16px;font-size:12px;color:var(--text-3);">
          Seus dados ficam seguros no Supabase com criptografia de ponta a ponta.
        </div>
      </div>
    </div>
  `

  const tabSignin  = container.querySelector('#tab-signin') as HTMLButtonElement
  const tabSignup  = container.querySelector('#tab-signup') as HTMLButtonElement
  const formSignin = container.querySelector('#signin-form') as HTMLFormElement
  const formSignup = container.querySelector('#signup-form') as HTMLFormElement
  const errorBox   = container.querySelector('#login-error') as HTMLDivElement

  function showError(msg: string) {
    errorBox.textContent = msg
    errorBox.style.display = 'block'
  }

  function hideError() {
    errorBox.style.display = 'none'
  }

  tabSignin.addEventListener('click', () => {
    tabSignin.classList.add('active')
    tabSignup.classList.remove('active')
    formSignin.style.display = 'block'
    formSignup.style.display = 'none'
    hideError()
  })

  tabSignup.addEventListener('click', () => {
    tabSignup.classList.add('active')
    tabSignin.classList.remove('active')
    formSignup.style.display = 'block'
    formSignin.style.display = 'none'
    hideError()
  })

  formSignin.addEventListener('submit', async (e) => {
    e.preventDefault()
    hideError()
    const btn = formSignin.querySelector('button[type="submit"]') as HTMLButtonElement
    btn.textContent = 'Entrando...'
    btn.disabled = true

    const email    = (container.querySelector('#signin-email') as HTMLInputElement).value
    const password = (container.querySelector('#signin-password') as HTMLInputElement).value

    const { error } = await signInWithPassword(email, password)
    if (error) {
      showError('E-mail ou senha inválidos.')
      btn.textContent = 'Entrar'
      btn.disabled = false
    }
  })

  formSignup.addEventListener('submit', async (e) => {
    e.preventDefault()
    hideError()
    const btn = formSignup.querySelector('button[type="submit"]') as HTMLButtonElement
    btn.textContent = 'Criando conta...'
    btn.disabled = true

    const name     = (container.querySelector('#signup-name') as HTMLInputElement).value
    const email    = (container.querySelector('#signup-email') as HTMLInputElement).value
    const password = (container.querySelector('#signup-password') as HTMLInputElement).value

    const { error } = await signUp(email, password, name)
    if (error) {
      const msg = (error.message && error.message !== '{}') ? error.message : 'Erro ao criar conta. Verifique sua conexão e tente novamente.'
      showError(msg)
      btn.textContent = 'Criar conta grátis'
      btn.disabled = false
    } else {
      showError('')
      errorBox.style.display = 'block'
      errorBox.style.background = '#EAF5E8'
      errorBox.style.color = '#2E7D32'
      errorBox.textContent = 'Conta criada! Verifique seu e-mail para confirmar.'
    }
  })
}
