import { useState } from "react";
import { useEffect } from "react";

 function Profile({onBack}){
    const [user,changeUser]= useState("");
    useEffect(() => {
        fetch("http://localhost:8080/profile",
        {
        method:"GET",
        credentials:"include",
        }
    )
    .then(res=>{
        if(res.status==200)
        {
            res.json().then(
                data=>{
                    changeUser(data.user)
                    console.log(data);
            });
            
        }

    })
    }, []);
    
   
    if(!user)
        return (
                <>
                    <h1>You must log in first</h1>
                    <button onClick={onBack}>Go to HomePage</button>
                </>
    )
    else
        return (
        <>
            <h1>Welcome to your personal page :{user.firstName} {user.lastName}</h1>
            <button onClick={onBack}>Go to HomePage</button>
        </>
    )
}
export default Profile;