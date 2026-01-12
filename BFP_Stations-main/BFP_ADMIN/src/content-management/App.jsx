import { Routes, Route } from 'react-router-dom'
import LogIn from './pages/log_in.jsx'
import SignUp from './pages/sign_up.jsx'
import ContentManagement from './pages/content_management.jsx'
import NewsRoom from './pages/news_room.jsx'
import EmergencyContact from './pages/emergency_contact.jsx'


function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LogIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/content" element={<ContentManagement />} />
        <Route path="/news" element={<NewsRoom />} />
        <Route path="/contacts" element={<EmergencyContact />} />
      </Routes>
    </>
  )
}

export default App
