import { useEffect } from "react";
import "./Login.css";
function Login({onBack,onSuccess}){

     useEffect(() => {
        fetch("http://localhost:8080/profile",
        {
        method:"GET",
        credentials:"include",
        }
    )
    .then(res=>{
        if(res.status==200)
            onSuccess();
    })
    }, []);
    
    
    function sendForm(event){
        event.preventDefault();
        console.log(document.getElementById("name").value);
        console.log(document.getElementById("password").value);

        //submitting user credentials
        fetch("http://localhost:8080/login" ,{
            method:"POST",
            credentials:"include",
            body:JSON.stringify({
                email:document.getElementById("name").value,
                password:document.getElementById("password").value
            }),
            headers:{"Content-Type":"application/json"}
        })
        .then(res=>{
            //successfull log in
            if (res.status==200)
                onSuccess();
            //already logged in
            else if(res.status==202)
                onSuccess();
            //errors or any form of invalid input
            else if(res.status==404){
                res.json()
                .then((data)=>
                    document.getElementById("inform").innerText=data.message)
            }
                 });
    }
    return(
        <>
            <h1>MarketPlace Project Prototype</h1>
            <form onSubmit={sendForm}>
                <label htmlFor="">Enter Your Email</label>
                <input id="name" type="text" placeholder="Arvin Mohammadi" required/>
                <br/>
                <br />
                <label htmlFor="">Enter your password</label>
                <input id="password" type="password" required />
                <br />
                <button type="submit" >Enter</button>
            </form>
            <br/>
            <button>Forgot email/password?</button>
            <button onClick={onBack}>Go to HomePage</button>
            <p id="inform"></p>
        </>
    )
}
export default Login;