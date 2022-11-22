var express = require("express");
var router = express.Router();
const db = require("../db");
const authcontroller = require("../controllers/authController");
const userController = require("../controllers/userController");
const otpControllers = require('../controllers/otpController');
const collection = require("../controllers/config/collection");

// router.use((req,res,next)=>{
//     console.log("haiii")
//     // const cartCount = db.getdb().collection(collection.CART_DATA)
//     next()
// })
//--------------signup page---------------//

router.get("/",userController.userSignUp);

//-------------login page render----------//

router.get("/login", userController.userLogin);

//-------------OTP login page render----------//

router.get("/otp", userController.OTP);

//--------------FORGOT PASSWORD-------------//

router.get('/forgot-password',userController.ForgetPassword)

//--------------Verify OTP for Forget Password--------------//

router.post('/forgot-password-otp',otpControllers.VerifyPassword)

//---------------VERIFY FORGET PASSWORD----------//

router.post('/forgot-password',userController.OtpForgetPassword)

//-------------POST OTP login page----------//

router.post('/otpcheck',otpControllers.otpLogin)

//-------------POST OTP login page----------//

router.post('/otpsubmit',otpControllers.submitOtp)

//------------Resend OTP--------------//

router.post('/resendOtp',otpControllers.resendOtp)

//------------POST login---------------//

router.post("/login", authcontroller.postLogin);

//------------POST signup--------------//

router.post("/signup", authcontroller.postSignUpPage);

//---------Home Page Render--------------//

router.get("/home", userController.getHomePage);

//---------Shop Page Render--------------//

router.get("/shop",userController.GetShopPage);

//---------Product Page Render--------------//

router.get("/product/:id", userController.GetProductPage);

//---------CART Page Render--------------//

router.get('/cart',authcontroller.protect,userController.getCart)

//--------------apply coupon-------------//

router.post('/apply-coupon',authcontroller.protect,userController.ApplyCoupon)

//---------ADD TO CART Page Render--------------//

router.post('/add-to-cart',authcontroller.protect, userController.addToCart)

//---------CHECKOUT Page Render--------------//

router.get('/checkout',authcontroller.protect,userController.getCheckout)

//----------POST Delete Product from cart-------------//

router.post('/delete-cart-product',authcontroller.protect,userController.postDeleteCartProduct)


//----------POST ADD Address from Checkout-------------//

router.post('/add-address',authcontroller.protect,userController.add_address)

//----------POST ACCOUNTS Page-------------//

router.get('/profile',authcontroller.protect,userController.GetAccount)

//---------------POST Increment Cart Product---------------//

router.post('/cart/increment/:id',authcontroller.protect,userController.Increment)

//--------------product delete after decrement--------------//

// router.post('cart/deleteone/:id',authcontroller.protect,userController.deleteOneCart)

//---------------POST Place Order---------------//

router.post('/place-order',authcontroller.protect,userController.PlaceOrder)

//---------------GET Order Details Page---------------//

router.get('/view-order/:id',authcontroller.protect,userController.ViewOrder)

//---------------Cancel full Order User Side---------------//

router.post('/cancel-order',authcontroller.protect,userController.CancelOrder)

//---------------Cancel Each Prodcuts from Orders---------------//

router.post('/cancel-product',authcontroller.protect,userController.cancelProductFromOrder)

//-------------------Wishlist Page Rendering--------------------//

router.get('/wishlist',authcontroller.protect,userController.Wishlist)

//-------------------Add to Wishlist--------------------//

router.post('/add-to-wishlist',authcontroller.protect,userController.AddToWishlist)

//-------------------DELETE from Wishlist--------------------//

router.post('/wishlist-delete',authcontroller.protect,userController.DeleteWishlist)

//-------------------EDIT USER DETAILS--------------------//

router.post('/edit-user/:id',authcontroller.protect,userController.EditUser)

//-------------------EDIT Password--------------------//

router.get('/password',authcontroller.protect,userController.ChangePassword)

//-------------------POST EDIT Password--------------------//

router.post('/change-password',authcontroller.protect,userController.PostPasswordChange)

//------------------PayPal Success Route---------------------//

router.get('/success',authcontroller.protect,userController.PaypalSuccess)

//-------------------POST EDIT ADDRESS--------------------//

// router.post('/edit-address',authcontroller.protect,userController.PostAddressChange)

//-------------------POST EDIT ADDRESS--------------------//

router.post('/delete-address',authcontroller.protect,userController.DeleteAddress)

//-------------------POST EDIT ADDRESS--------------------//



//-------------------POST VERIFY PAYMENT--------------------//

router.post('/verify-payment',authcontroller.protect,userController.VerifyPayment)

//--------------------logout--------------------//

router.get('/logout',authcontroller.protect,authcontroller.Logout)

module.exports = router;
