import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <header className="App-header">
        <h1>FormatJS Test Application</h1>
        
        <p>This is a hardcoded string that should be translated</p>
        
        <p>Hello, Jean Dupont!</p>
        
        <p>You have 5 items</p>
        
        <p>Another untranslated text here</p>
        
        <div>
          <label>Full Name</label>
          <input type="text" placeholder="Enter your full name" />
        </div>
        
        <div>
          <label>Email Address</label>
          <input type="email" placeholder="Enter email here" />
        </div>
        
        <div>
          <button type="submit">Submit</button>
          <button type="button">Cancel</button>
        </div>
        
        <nav>
          <span>Home</span>
          <span> | </span>
          <span>About</span>
          <span> | </span>
          <span>Contact</span>
        </nav>
      </header>
    </div>
  )
}

export default App
