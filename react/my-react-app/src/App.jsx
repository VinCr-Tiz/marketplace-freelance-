import { useState } from "react";
import Home from "./Home";
import Login from "./Login";
import Profile from "./Profile";
import  SignUp  from "./SignUp.jsx";
function App() {
    
    const [page, setPage] = useState(localStorage.getItem("page")||"home");

    function navigate(page){
        localStorage.setItem("page",page);
        setPage(page);
    }

    if (page === "home") {
        return <Home onLogin={()=>navigate("login")} onSignUp={()=>navigate("signup")} />;
    }

    if (page==="signup")
    {
        return <SignUp onBack={()=>navigate("home")} onSuccess={()=>navigate("profile")}/>
    }

    if (page === "login") {
        return <Login onSuccess={() => navigate("profile")} onBack={()=>navigate("home")} />;
    }
    if (page === "profile") {
        return <Profile onBack={() => navigate("home")} />;
    }

    
}

export default App;