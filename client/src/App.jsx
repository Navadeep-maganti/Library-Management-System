import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import LoginPageV1 from "./pages/LoginPage";
import './App.css'

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />}
         />
         <Route path="/login1" element={<LoginPageV1 />}
         />
      </Routes>
    </BrowserRouter>
  )
}

export default App
