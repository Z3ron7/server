const Database = require("./src/configs/Database");
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const bodyParser = require("body-parser");
const salt = 5;
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');

const app = express();
app.use(express.json());
const corsOptions = {
 origin: 'https://smartexamhub.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
};
app.use(cors(corsOptions));


const examsRouter = require("./src/routes/Exam");
const questionsRouter = require("./src/routes/Questions"); // Add this
const roomRouter = require("./src/routes/Room"); // Add this
const filterRouter = require ("./src/routes/FilterQuestion")
const verifyRouter = require ("./src/routes/Verification")
const usersRouter = require ("./src/routes/Users")
const examRoomRouter = require ("./src/routes/ExamRoom")
const dashboardRouter = require ("./src/routes/Dashboard")

app.use("/exams", examsRouter);
app.use("/exam-room", examRoomRouter);
app.use("/room", roomRouter);
app.use("/questions", questionsRouter);
app.use("/filter", filterRouter);
app.use("/verify", verifyRouter); 
app.use("/users", usersRouter);
app.use("/dashboard", dashboardRouter); 
app.use(cookieParser());

const db = new Database();
const conn = db.pool;
const publicPath = path.join(__dirname, '..', 'smart-exam-final', 'public', 'avatar');

const storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, publicPath); 
  },
  filename: function (req, file, callback) {
    callback(null, file.originalname); // Use the original filename as the stored filename
  },
});


const upload = multer({ storage: storage });

const transporter = nodemailer.createTransport({
  service: 'Gmail', // Replace with your email service provider
  auth: {
    user: 'zoren.panilagao1@gmail.com', // Replace with your email
    pass: 'yvij frwd swws udms', // Replace with your email password
  },
});

const verifyUser = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json({ Error: "You are not authenticated!" });
  } else {
    jwt.verify(token, "jwt-secret-key", (err, decoded) => {
      if (err) {
        return res.json({ Error: "Token is not valid" });
      } else {
          req.user_id = decoded.user_id, // Attach user_id to req.user
          req.name = decoded.name, // Attach other user data if needed
          req.image = decoded.image,
        next();
      }
    });
  }
};
app.post('/register', upload.single('profileImage'), async (req, res) => {
  const { name, username, password, gender, status } = req.body;
  let imagePath = ''; // Initialize imagePath as null


  if (req.file) {
    // Image has been uploaded
    imagePath =  './avatar/' + req.file.originalname; // Path to the uploaded image
  }

  try {
    // Validate incoming data
    if (!name || !username || !password || !gender || !status) {
      return res.status(400).json({ Error: "Missing required fields" });
    }

    // Check if the username already exists
    const usernameExists = await new Promise((resolve, reject) => {
      const checkQuery = 'SELECT COUNT(*) as count FROM users WHERE username = ?';
      conn.query(checkQuery, [username], (err, result) => {
        if (err) reject(err);
        resolve(result && result[0] && result[0].count > 0);
      });
    }).catch((error) => {
      console.error('Promise rejected:', error);
      throw error;
    });

    if (usernameExists) {
      return res.status(400).json({ Error: "Username already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, salt);

    // Set the role based on the status
    let role = 'Exam-taker'; // Default role
    if (status === 'admin') {
      role = 'Admin'; // If status is admin
    }
    if (status === 'alumni') {
      role = 'Exam-taker'; // If status is alumni
    }

    // Insert user into the database, including the imagePath
    const insertQuery =
      'INSERT INTO users (name, username, password, gender, role, status, image) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const values = [name, username, hashedPassword, gender, role, status, imagePath];

    conn.query(insertQuery, values, (err, result) => {
      if (err) {
        console.error("Error inserting user:", err);
        return res.status(500).json({ Error: "Failed to insert user" });
      }

      // Send an email to the Super Admin for verification
      transporter.sendMail({
        from: 'zoren.panilagao1@gmail.com', // Replace with your email
        to: 'zoren.panilagao7@gmail.com', // Replace with the Super Admin's email
        subject: 'New Exam-taker Registration',
        text: 'A new Exam-taker has registered and requires verification.',
      });

      return res.json({ Status: "Success" });
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ Error: "Registration process failed" });
  }
});

app.post("/login", (req, res) => {
  const sql = "SELECT * FROM users WHERE username = ?";
  conn.query(sql, [req.body.username], (err, data) => {
    if (err) {
      return res.json({ Error: "Login error in server" });
    }
    if (data.length > 0) {
      bcrypt.compare(req.body.password.toString(), data[0].password, (err, response) => {
        if (err) {
          return res.json({ Error: "Password compare error" });
        }
        if (response) {
          const name = data[0].name;
          const image = data[0].image;
          let role = data[0].role; // Get the role from the database
          const status = data[0].status; // Get the status from the database
          const user_id = data[0].user_id;

          // Check if the status is "student" or "alumni" and set the role accordingly
          if (status === "student" || status === "alumni") {
            role = "Exam-taker";
          }

          // Here, you can check the verification status from the database
          const isVerified = data[0].isVerified; // Assuming you have an "isVerified" column

          // Include the isVerified status in the token payload
          const token = jwt.sign({ user_id, name, image, role, isVerified }, "jwt-secret-key", {
            expiresIn: "3d",
          });
          res.cookie("token", token, {
          secure: true, // Ensures the cookie is sent only over HTTPS
          sameSite: 'None',
  });
          return res.json({ Status: "Login Successful", token, user_id, name, image, role, isVerified });
        } else {
          return res.json({ Error: "Password error!" });
        }
      });
    } else {
      return res.json({ Error: "Invalid username or password!" });
    }
  });
});

app.get('/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({Status: "Success"});
 })

// Add a new route to fetch user data for the currently logged-in user
app.get("/fetch-user", verifyUser, async (req, res) => {
  const userId = req.user_id; // Retrieve the user ID from req.user
  try {
    // Query the database to fetch user data based on the user ID
    const userData = await db.one("SELECT * FROM users WHERE user_id = $1", userId);
    res.json(userData);
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


app.listen();
