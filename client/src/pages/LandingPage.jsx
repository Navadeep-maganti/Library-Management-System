import { useNavigate } from "react-router-dom";

function LandingPage() {

  const navigate = useNavigate();

  return (
    <div className="landingpage">
      <h1>Welcome to the Library Management System</h1>
      <p>Manage your library efficiently and effectively.</p>
      <button className="get-started" onClick={() => navigate("/register")}>Get Started</button>
    </div>
  );
}

export default LandingPage;