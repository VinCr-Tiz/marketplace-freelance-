
function Home({onLogin,onSignUp}){
    let styles={
        "align-items":"middle"
    }
    let styleButton={
        width:"200px",
        "font-size":"20px"
    }
    return(
        <div style={styles}>
            <h1>MarketPlace Prototype</h1>
            <br/>
            <button style={styleButton} onClick={onLogin}>Login page</button>
            <br/>
            <br/>
            <button style={styleButton} onClick={onSignUp}>Sign-up page</button>

        </div>
    )
}
export default Home;