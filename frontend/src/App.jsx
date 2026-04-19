import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import FeeReminder from './components/FeeReminder'
import './App.css'

function App() {
  return (
    <div className="app-container" style={{ minHeight: '100vh', background: '#f5f7fa', padding: '40px 20px' }}>
      <Toaster position="top-right" />
      
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#111' }}>
          Hostilerz <span style={{ color: '#3B5BDB' }}>Admin</span>
        </h1>
        <p style={{ color: '#666', marginTop: '8px' }}>Manage fee reminders and student notifications efficiently.</p>
      </header>

      <main>
        <FeeReminder />
        {/* Future sections (Fee List, etc.) go here */}
      </main>

      <footer style={{ textAlign: 'center', marginTop: '60px', color: '#999', fontSize: '12px' }}>
        &copy; 2026 Hostilerz Management System · KRMU
      </footer>
    </div>
  )
}

export default App
