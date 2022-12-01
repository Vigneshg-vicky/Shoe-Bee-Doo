const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const db = require("../db");
const bcrypt = require("bcrypt");
const mongodb = require("mongodb");
const session = require("express-session");
const appError = require("../utils/appError");
const {
  UserBindingContext,
} = require("twilio/lib/rest/chat/v2/service/user/userBinding");
const { decode } = require("punycode");
const collection = require("./config/collection");

module.exports = {
  //------------login page validation----------------//

  postLogin: async (req, res) => {
    try {
      console.log(req.body);
      const { email, password } = req.body;
      const loginUser = await db
        .getdb()
        .collection(collection.USER_COLLECTION)
        .findOne({ email: email });
      if (loginUser) {
        if(loginUser.IsBlocked){
          res.cookie("userjwt", "", { maxAge: 1 });
            res.status(400).json({
              status:'failed',
              message:'This account is temporarily disabled!',
            })
        }else{
        const result = await bcrypt.compare(password, loginUser.password);
        if (result) {
          usertoken(loginUser._id, res);
          res.status(200).json({ status: "success" });
        } else {
          return res.status(401).json({
            status: "failed",
            message: "Password doesn't match!",
          });
        }
      }
      } else {
        return res.status(401).json({
          status: "failed",
          message: "User doesn't exist!",
        });
      }
    } catch (error) {
      // console.log(error);
    }
  },

  //---------------check SignUp and Validation--------------//

  postSignUpPage: async (req, res) => {
    try {
      console.log(req.body);
      const { name, email, number, password, confirm_password } = req.body;
      const salt = await bcrypt.genSalt();
      const hashedpassword = await bcrypt.hash(password, 10);
      const user = await db
        .getdb()
        .collection(collection.USER_COLLECTION)
        .findOne({ email: email });
        const NumberCheck = await db
        .getdb()
        .collection(collection.USER_COLLECTION)
        .findOne({ number: number });
      if (user) {

        return res.status(401).json({
          status: "failed",
          message: "User aleady exists with the same Email!",
        });
      }else if(NumberCheck){
        return res.status(401).json({
          status: "failed",
          message: "User exists with the same Number!",
        });
      } else {
        if (password !== confirm_password) {
          // req.session.error = "Password doesn't match!";

          return res.status(401).json({
            status: "failed",
            message: "Password doesn't match!",
          });
        } else {
          // req.session.loggedIn = true;
          const userData = await db.getdb().collection("userData").insertOne({
            name: name,
            email: email,
            number: number,
            password: hashedpassword,
          });
          usertoken(userData.insertedId, res);
          res.status(200).json({ status: "success" });
        }
      }

      // res.redirect("/home");
    } catch (error) {
      console.error(error);
    }
  },

  //------------------Admin Authentication (POST Admin login)--------------------//

  postAdminLogin: async (req, res) => {
    const { email, password } = req.body;
    const admin = await db
      .getdb()
      .collection("Admin Data")
      .findOne({ email: email });
    if (admin) {
      const pass = await bcrypt.compare(password, admin.password);
      if (pass) {
        admintoken(admin._id, res);
        return res.status(200).json({ status: "success" });
      } else {
        return res.status(401).json({
          status: "failed",
          message: "Password doesm't match!",
        });
      }
    } else {
      return res.status(400).json({
        status: "failed",
        message: "User doesn't exist!",
      });
    }
  },

  // ---------------PROTECTED ROUTES-------------------//

  protect: async (req, res, next) => {
    try {
      // 1) Getting Token and checking if its there
      let token;
      let decoded;
      if (req.cookies) {
        token = req.cookies.userjwt;
      }
      // console.log(token);
      if (!token) {
        res.redirect("/login?error=Please Login to Continue!");
        // return next(new appError('You are not logged In! Please log In to continue!',401));
      }
      // 2) Verification Token
      else {
        decoded = await promisify(jwt.verify)(
          token,
          process.env.JWT_SECRET_CODE
        );
        if (decoded) {
          // console.log({decoded});
          req.user = decoded.id;
          console.log(req.user)
          const userData = await db
            .getdb()
            .collection(collection.USER_COLLECTION)
            .findOne({ _id: mongodb.ObjectId(req.user) });
          if (userData.IsBlocked) {
            res.cookie("userjwt", "", { maxAge: 1 });
            res.redirect("/login?error=This account is temporarily disabled!");
          }
          // res.redirect('/home')
        } else {
          res.redirect(
            "/login?error=The User with this token no longer exists!"
          );
        }
        // console.log(decoded);
      }

      next();
    } catch (error) {
      console.log(error);
    }
  },

  //--------------LOGOUT---------------//

  Logout: async (req, res) => {
    try {
      console.log(req.user);
      res.cookie("userjwt", "", { maxAge: 1 });
      res.redirect("/login");
    } catch (err) {
      console.log(err);
    }
  },

  //------module ends!------//
};

//-----------------USER TOKEN CREATION---------------------//

function usertoken(userId, res) {
  const userToken = jwt.sign({ id: userId }, process.env.JWT_SECRET_CODE, {
    expiresIn: process.env.DAYS,
  });
  const cookieOption = {
    expires: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), //cookie storing jwt
    httpOnly: true,
  };

  res.cookie("userjwt", userToken, cookieOption);
}

//-------------------------------- Admin Token Creation -------------------------------//

function admintoken(adminId, res) {
  const adminToken = jwt.sign({ id: adminId }, process.env.JWT_SECRET_CODE, {
    expiresIn: process.env.DAYS,
  });
  const cookieOption = {
    expires: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), //cookie storing jwt
    httpOnly: true,
  };

  res.cookie("adminjwt", adminToken, cookieOption);
}

// const protect = async (req, res) => {
//   try {
//     // 1) Getting Token and checking if its there
//     let token;
//     if (
//       req.headers.authorization &&
//       req.headers.authorization.startsWith("Bearer")
//     ) {
//       token = req.headers.authorization.split(" ")[1];
//     }
//     console.log(token);
//     // 2) Verification Token

//     // 3) Check if user still exists

//     // 4) Check if user changed password after the token was issued
//   } catch (error) {}
// };
