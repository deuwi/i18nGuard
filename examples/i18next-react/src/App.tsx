import * as React from 'react';
import { useTranslation } from 'react-i18next';

export function App() {
  const { t } = useTranslation();

  return (
    <div className="app">
      <header>
        <h1>{t('common:welcome')}</h1>
        {/* This should be flagged by i18nGuard */}
        <p>This is a hard-coded string that needs translation</p>
      </header>
      
      <main>
        <button onClick={() => alert('Hello!')}>
          {t('common:clickMe')}
        </button>
        
        {/* Another hard-coded string */}
        <input 
          type="text" 
          placeholder="Enter your name here"
          aria-label="User name input"
        />
        
        <p>{t('home:description')}</p>
      </main>
      
      <footer>
        {/* Hard-coded copyright notice */}
        <p>© 2024 My Company. All rights reserved.</p>
      </footer>
    </div>
  );
}