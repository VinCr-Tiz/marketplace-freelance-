import Login from "./Login";
function SignUp({onBack,onSuccess}){
    function sendForm(event){
        event.preventDefault();
        fetch("http://localhost:8080/signup",{
            method: "POST",
            credentials:"include",
            body:JSON.stringify({
                firstName:document.getElementById("firstName").value,
                lastName:document.getElementById("lastName").value,
                password:document.getElementById("password").value,
                email:document.getElementById("email").value,
                phoneNumber:document.getElementById("phoneNumber").value
            }),
            headers:{"Content-Type":"application/json"},
        })
        .then(res=>{
            if(res.status==200)
                onBack();
            else if(res.status==404){
                res.json()
                .then(data=>
                    document.getElementById("inform").innerText=data.message);
            }
        })
    }

    return (
        <>
        <form onSubmit={sendForm}>
            <h1>Sing Up Page</h1>
            <label >Enter your first name</label>
            <input id="firstName" type="text" placeholder="Amjad" required/>
            <br />
            <label >Enter your last name</label>
            <input id="lastName" type="text" placeholder="Shahriari"/>
            <br />
            <label>Enter your password</label>
            <input id="password" type="password" required placeholder="12345" pattern=".{8,}"/>
            <br />
            <label>Enter your email</label>
            <input id="email" type="email" placeholder="armanShaini@gmailc.com" required/>
            <br />
            <label>Enter your phone number</label>
            <input id="phoneNumber" type="phoneNumber" placeholder="0919444444" required/>
            <br />
            <button type="submit">Submit</button>
        </form>
        <button onClick={onBack}>Go to HomePage</button>
        <div id="inform"></div>
        </>
    )
}
export default SignUp;