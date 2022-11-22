const db = require("../db");
const jwt = require("jsonwebtoken");
const twilio = require("twilio");
const collection = require("./config/collection");
const client = new twilio(process.env.ACCOUNT_SID, process.env.AUTH_TOKEN);

module.exports = {
  // otp login...............................................................................

  otpLogin: async (req, res) => {
    try {
      const numbercheck = await db
        .getdb()
        .collection(collection.USER_COLLECTION)
        .findOne({ number: req.body.number });
        console.log(req.body)
        console.log(numbercheck)
      if (numbercheck) {
        const result = await client.verify
          .services(process.env.SERVICE_ID)
          .verifications.create({
            to: `+91${req.body.number}`,
            channel: "sms",
          });

        return res.status(200).json({
          status: "success",
          message:'OTP has been sent'
        });
      } else {
        return res.status(500).json({
          status: "failed",
          message: "Entered Number is not a valid User *",
        });
      }
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        status: "failed",
        message: "Too many Requests. Please try again after sometime....",
      });
    }
  },
  // otp verification.................................................................................

  submitOtp: async (req, res) => {
    console.log(process.env.SERVICE_ID)
    try {
        console.log(req.body)
      const data = await client.verify
        .services(process.env.SERVICE_ID)
        .verificationChecks.create({
          to: `+91${req.body.number}`,
          code: req.body.otp,
        });
        console.log(data.status)
      if (data.status == "approved") {
        // req.session.login=true;
        // req.session.logintime = new Date();
        // req.session.userId = user._id;
        const user = await db
          .getdb()
          .collection("users")
          .findOne({ number: req.body.number });
        // token(user._id, res);

        res.json({
          status: "success",
        });
        // res.redirect('/')
        // window.location="/"
      } else {
        res.status(400).json({
          status: "failed",
          message: "Invalid OTP",
        });
      }
    } catch (err) {
        console.log(err)
      res.status(500).json({
        status: "failed",
        message: err,
      });
    }
  },

  //------------FORGET PASSWORD-------------//

  VerifyPassword: async (req, res) => {
    console.log(process.env.SERVICE_ID)
    try {
        console.log(req.body)
      const data = await client.verify
        .services(process.env.SERVICE_ID)
        .verificationChecks.create({
          to: `+91${req.body.number}`,
          code: req.body.otp,
        });
        console.log(data.status)
      if (data.status == "approved") {
        // req.session.login=true;
        // req.session.logintime = new Date();
        // req.session.userId = user._id;
        const user = await db
          .getdb()
          .collection("users")
          .findOne({ number: req.body.number });
        // token(user._id, res);

        res.json({
          status: "success",
        });
        // res.redirect('/')
        // window.location="/"
      } else {
        res.status(400).json({
          status: "failed",
          message: "Invalid OTP",
        });
      }
    } catch (err) {
        console.log(err)
      res.status(500).json({
        status: "failed",
        message: err,
      });
    }
  },

  //-------------RESEND OTP--------------//

  resendOtp: async (req, res) => {
    try {
      console.log(req.body)
      const numbercheck = await db
        .getdb()
        .collection(collection.USER_COLLECTION)
        .findOne({ number: req.body.number });
        console.log(numbercheck)
      if (numbercheck) {
        const result = await client.verify
          .services(process.env.SERVICE_ID)
          .verifications.create({
            to: `+91${req.body.number}`,
            channel: "sms",
          });

        return res.status(200).json({
          status: "successs",
          message:'OTP has been sent Again!'
        });
      } else {
        return res.status(500).json({
          status: "failed",
          message: "Entered Number is not an valid user *",
        });
      }
    } catch (err) {
      res.status(500).json({
        status: "failed",
        message: "Too many Requests. Please try again after sometime....",
      });
    }
  },
};


function token(userId, res) {
  const userToken = jwt.sign({ id: userId }, process.env.JWT_SECRET_CODE, {
    expiresIn: process.env.DAYS,
  });
  const cookieOption = {
    expires: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), //cookie storing jwt
    httpOnly: true,
  };

  res.cookie("jwt", userToken, cookieOption);
}
