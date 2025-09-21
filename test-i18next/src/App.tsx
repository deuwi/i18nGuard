import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import './App.css'

function App() {
  const { t, i18n } = useTranslation('common')
  const [count, setCount] = useState(0)
  const [name, setName] = useState('')

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
  }

  return (
    <div className="app">
      <header>
        {/* Test 1: Correct translation - should work */}
        <h1>{t('welcome')}</h1>
        
        {/* Test 2: Hard-coded string - should be detected */}
        <p>This is still hard-coded text</p>
        
        {/* Test 3: Missing translation key - should be detected */}
        <p>{t('common:missing.key')}</p>
        
        {/* Test 4: Another hard-coded string - should be detected */}
        <p>New hard-coded text for testing</p>
      </header>

      <main>
        {/* Language switcher */}
        <div className="language-switcher">
          <button onClick={() => changeLanguage('en')}>English</button>
          <button onClick={() => changeLanguage('fr')}>Français</button>
        </div>

        {/* Test 5: Correct nested translation */}
        <p>{t('description')}</p>

        {/* Test 6: Counter with hard-coded text - should be detected */}
        <div className="counter">
          <button onClick={() => setCount(count + 1)}>
            Count is {count}
          </button>
        </div>

        {/* Test 7: Form with mixed translations and hard-coded text */}
        <form>
          <div>
            <label>{t('form.name')}</label>
            <input 
              type="text" 
              placeholder={t('form.placeholder.name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div>
            <label>{t('form.email')}</label>
            {/* Test 8: Hard-coded placeholder - should be detected */}
            <input 
              type="email" 
              placeholder="Enter your email here"
              aria-label="Email input field"
            />
          </div>

          {/* Test 9: Buttons with correct translations */}
          <div>
            <button type="submit">{t('buttons.submit')}</button>
            <button type="button">{t('buttons.cancel')}</button>
          </div>
        </form>

        {/* Test 10: Navigation with hard-coded text - should be detected */}
        <nav>
          <a href="#home">Home</a>
          <a href="#about">About</a>
        </nav>
      </main>

      <footer>
        {/* Test 11: Hard-coded copyright - should be detected */}
        <p>© 2024 My Company. All rights reserved.</p>
        
        {/* Test 12: Conditional message */}
        {count > 5 && <p>{t('messages.success')}</p>}
      </footer>
    </div>
  )
}

export default App
