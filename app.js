const express = require('express');
//library for session management
const session = require('express-session');
//importing and configuring postgreSQL session management library 
const pgSession = require('connect-pg-simple')(session);
//creating connection pool
const Pool = require('pg').Pool;
//argon2 library for password hashing
const argon2 = require("argon2");

const bodyParser = require('body-parser');
const cors = require('cors');

//DB pool for session CRUD operation
const sessionDBaccess = new Pool({
user: "postgres",
password: "123",
host: "localhost",
port: 5432,
database: "fixflow"
});

//DB pool for manual CRUD operations
const pool = new Pool({
  user:  "postgres",
  password: "123",
  host: "localhost",
  port: 5432,
  database: "fixflow"
});
//run express server 
const app = express();

//enable cros origin
app.use(cors({
    origin: 'http://localhost:5173',
    credentials:true
}));


// Parse request bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));



// Configure sessions
app.use(session({
  store : new pgSession({
    pool: sessionDBaccess,
    tableName:'session'
  })
  ,
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false,
            httpOnly:true,        
            maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));


// Login route
app.post('/login', async (req, res) => {

const { email, password } = req.body;

  if(req.session.user){
    console.log("Already Logged in")
    return res.status(202).json({message:"You are laready logged in"});
  }
  const {rows}= await pool.query(`SELECT * FROM users WHERE email=$1`,
    [email.toLowerCase()]
  )
  .catch(err=>{
    console.log(err.message);
    return res.status(404).json({message:"Inavlid Credentials"})
  });
  console.log(rows[0]);
  //if user doesnt exist
    let valid= await argon2.verify(rows[0].password_hash,password)
    .catch(err=>console.log(err.message));
    
    if (valid){
      // Store user information in session (excluding password)
       req.session.user = {
        firstName: rows[0].first_name,
        lastName: rows[0].last_name
      }
      console.log(req.ses)
      return res.status(200).json({message:"You are logged in successfully"});
    }
    else
      return res.status(404).json({message:"Invalid email or password"});
  
  //testing
  console.log(req.body)


});

// Protected route
app.get('/profile', async (req, res) => {
  // Check if user is logged in
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
 
  res.json({ message: 'Profile accessed', user: req.session.user });
});

// Logout route
app.post('/logout', (req, res) => {
  // Destroy session
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Logout failed' });
    }
    res.json({ message: 'Logout successful' });
  });
});

app.post('/signup',async (req,res)=>{
  let {firstName,lastName,password,email,phoneNumber}=req.body;
  let password_hash=await argon2.hash(password);
  let result= 
  await pool.query(`INSERT INTO users(first_name,last_name,email,mobile,password_hash) VALUES($1,$2,$3,$4,$5);`,
                    [firstName,lastName,email.toLowerCase(),phoneNumber,password_hash]
  )
  .then(()=>res.status(200).json({message:"You have signed up successfully"}))
  .catch((err)=>{
    console.log(err.message)
    if(err.message.includes("users_email_key"))
      res.status(404).json({message:"Email already used"});
    else
    res.status(404).json({message:"Inavlid inputs"});
});
  
});

// Start server
app.listen(8080, () => {
  console.log('Server running on port 8080');
});