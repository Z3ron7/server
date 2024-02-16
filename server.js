const Database = require("./src/configs/Database");
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const cors = require("cors");
const salt = 5;
const nodemailer = require('nodemailer');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const app = express();
const corsOptions = {
  origin: "https://smartexamhub.vercel.app",
  methods: "GET,PUT,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("https://smartexamhub.vercel.app", (req, res) => {
  console.log('Request received:', req.method, req.url);
  res.header("Access-Control-Allow-Origin", "https://smartexamhub.vercel.app");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.header("Access-Control-Allow-Credentials", "true");
  res.status(200).send();
});

app.use(bodyParser.json());

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

cloudinary.config({ 
  cloud_name: 'dypkdhywa', 
  api_key: '214244336281555', 
  api_secret: 'rbwylTa-n0OWPj0EqM9wL9P-BHI' 
});

const storage = multer.diskStorage({
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Use the original file name
  }
});
const upload = multer ({ storage: storage})
const transporter = nodemailer.createTransport({
  service: 'gmail', // Replace with your email service provider
  auth: {
    user: 'smartexamhub@gmail.com', // Replace with your email
    pass: 'pjfm gnwl hdwd rvfc', // Replace with your email password
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
          req.school_id = decoded.school_id,
        next();
      }
    });
  }
};

app.get("/user", verifyUser, (req, res) => {
  return res.json({ Status: "Success", name: req.name, image: req.image, school_id: req.school_id });
});
app.post('/register', upload.single('profileImage'), async (req, res) => {
  const { name, username, password, gender, status, school_id } = req.body;
  let imagePath = ''; // Initialize imagePath as null

  try {
    // Validate incoming data
    if (!name || !username || !password || !gender || !status || !school_id) {
      return res.status(400).json({ Error: "Missing required fields" });
    }

    // Function to check if a username already exists
    const checkIfUsernameExists = async (username) => {
      return new Promise((resolve, reject) => {
        const checkUsernameQuery = 'SELECT COUNT(*) as count FROM users WHERE username = ?';
        conn.query(checkUsernameQuery, [username], (err, result) => {
          if (err) {
            reject(err);
          }
          resolve(result && result[0] && result[0].count > 0);
        });
      });
    };
    const usernameExists = await checkIfUsernameExists(username);
    if (usernameExists) {
      return res.json({ Error: "Username already exists" });
    }

    // Function to check if a school ID already exists
    const checkIfSchoolIdExists = async (schoolId) => {
      return new Promise((resolve, reject) => {
        const checkSchoolIdQuery = 'SELECT COUNT(*) as count FROM users WHERE school_id = ?';
        conn.query(checkSchoolIdQuery, [schoolId], (err, result) => {
          if (err) {
            reject(err);
          }
          resolve(result && result[0] && result[0].count > 0);
        });
      });
    };

    const schoolIdExists = await checkIfSchoolIdExists(school_id);
    if (schoolIdExists) {
      return res.json({ Error: "School ID already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, salt);

    // Image upload to Cloudinary
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        width: 150,
        height: 100,
        crop: 'fill',
      });

      imagePath = result.url; // Save the Cloudinary URL to the imagePath
    }

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
      'INSERT INTO users (name, username, password, gender, role, status, school_id, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    const values = [name, username, hashedPassword, gender, role, status, school_id, imagePath];

    conn.query(insertQuery, values, (err, result) => {
      if (err) {
        console.error("Error inserting user:", err);
        return res.status(500).json({ Error: "Failed to insert user" });
      }
      
      // Send an email to the Super Admin for verification
      transporter.sendMail({
        from: 'smartexamhub@gmail.com', // Replace with your email
        to: 'zoren.panilagao1@gmail.com', // Replace with the Super Admin's email
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
          const school_id = data[0].school_id;

          // Check if the status is "student" or "alumni" and set the role accordingly
          if (status === "student" || status === "alumni") {
            role = "Exam-taker";
          }

          // Here, you can check the verification status from the database
          const isVerified = data[0].isVerified; // Assuming you have an "isVerified" column

          // Include the isVerified status in the token payload
          const token = jwt.sign({ user_id, name, image, role, isVerified, school_id }, "jwt-secret-key", {
            expiresIn: "3d",
          });
          res.cookie("token", token, {
          secure: true,    // Set to true if your app is served over HTTPS
          sameSite: "None", // Set to "None" for cross-site cookies
            });
          return res.json({ Status: "Login Successful", token, user_id, name, image, role, isVerified, school_id });
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

 app.post('/forgot-password', async (req, res) => {
  try {
    const { username } = req.body;
    const getUserByUsername = async (username) => {
      try {
        const query = 'SELECT * FROM users WHERE username = ?';
        const [rows] = await conn.promise().query(query, [username]);
    
        if (rows.length > 0) {
          return rows[0]; // Assuming you want to return the first user with the given username
        } else {
          return null; // Return null if no user is found
        }
      } catch (error) {
        console.error('Error fetching user by username:', error);
        throw error;
      }
    };
    
    // Check if the user with the given username exists
    const user = await getUserByUsername(username);

    if (!user) {
      return res.status(404).json({ Error: 'User not found' });
    }

    // Generate a unique token for the password reset link
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Save the reset token in the database
    const saveResetToken = async (userId, resetToken) => {
      try {
        await conn.promise().query('UPDATE users SET reset_token = ? WHERE user_id = ?', [resetToken, userId]);
      } catch (error) {
        console.error('Error saving reset token:', error);
        throw error;
      }
    };
    
    await saveResetToken(user.user_id, resetToken);

    // Send a password reset email to the user
    const sendPasswordResetEmail = (username, resetToken) => {
      // Define the email content
      console.log('Recipient email:', username);
      const mailOptions = {
        from: 'smartexamhub@gmail.com', // Replace with your email
        to: username,
        subject: 'Password Reset Request',
        text: `Click the following link to reset your password: https://smartexamhub.vercel.app/reset-password/${resetToken}`,
      };

      // Send the email
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Email sending error:', error);
        } else {
          console.log('Email sent:', info.response);
        }
      });
    };

    // Call the function to send the password reset email
    sendPasswordResetEmail(user.username, resetToken);
    
    return res.json({ Status: 'Password reset link sent successfully', resetToken});
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ Error: 'Forgot password process failed' });
  }
});


app.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Validate incoming data
    if (!token || !newPassword) {
      return res.status(400).json({ Error: 'Missing required fields' });
    }

    // Function to get user by reset token
    const getUserByResetToken = async (resetToken) => {
      return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM users WHERE reset_token = ?';
        conn.query(query, [resetToken], (err, result) => {
          if (err) {
            reject(err);
          }
          resolve(result && result[0]);
        });
      });
    };

    // Check if the reset token is valid
    const user = await getUserByResetToken(token);
    if (!user) {
      return res.status(404).json({ Error: 'Invalid reset token' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update the user's password and clear the reset token
    const updatePasswordQuery = 'UPDATE users SET password = ?, reset_token = NULL WHERE user_id = ?';
    const updatePasswordValues = [hashedPassword, user.user_id];
    conn.query(updatePasswordQuery, updatePasswordValues, (err, result) => {
      if (err) {
        console.error('Error updating password:', err);
        return res.status(500).json({ Error: 'Failed to update password' });
      }

      return res.json({ Status: 'Password reset successfully' });
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ Error: 'Reset password process failed' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, function () {
  const db = new Database();
  db.testConnection();
  console.log(`Server is running on port ${PORT}`);
});

