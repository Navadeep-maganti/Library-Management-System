import react from "react";
import '../styles/RegistrationPage.css'

function RegistrationPage() {
    return (
        <>
            <h1>Registration Page</h1>
            <div className="regis-form">
                <div className="regis-buttons">
                    <button>Register</button>
                </div>
                <textarea placeholder="enter your email" className="email"></textarea>
                <textarea placeholder="enter your password" className="password"></textarea>
                <button className="submit" type="submit">Submit</button>
            </div>
        </>
    )
}

export default regisPage;