import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/base.css'
import './index.css'
import App from './App.tsx'
import { initAuthExpiryWatcher } from './Services/apiClient'

initAuthExpiryWatcher();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

