import { Routes, Route } from 'react-router-dom'
import LogIn from './pages/login.jsx'
import SignUp from './pages/signup.jsx'
import ContentManagement from '../pages/content_management.jsx'
import NewsRoomm from '../pages/news_room.jsx'
import EmergencyContact from '../pages/emergency_contact.jsx'
import { AuthProvider } from '../context/AuthContext'

function AppRoutes() {
  // Now this is inside AuthProvider, so context will work!
  const { user } = useContext(AuthContext);
  console.log('[DEBUG] Logged-in user from AppRoutes:', user);

  return (
    <Routes>
      <Route path="/" element={<LogIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/content" element={<ContentManagement />} />
      <Route path="/news" element={<NewsRoomm />} />
      <Route path="/contacts" element={<EmergencyContact />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;