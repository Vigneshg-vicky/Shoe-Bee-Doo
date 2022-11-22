var express = require("express");
const path = require("path");
const authController = require("../controllers/authController");
const adminController = require("../controllers/adminController");
var router = express.Router();
const multer = require("multer");

// MULTER
const storage = multer.diskStorage({
  destination: "./public/uploads/",
  filename: function (req, file, cb) {
    console.log(file);
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
});

/* GET users listing. */

//--------GET admin login-----------//

router.get("/", adminController.getAdminLogin);

//--------POST admin login-----------//

router.post("/login", authController.postAdminLogin);

//--------GET Admin Home-----------//

router.get("/home", adminController.AdminHome);

//--------GET Admin User Details-----------//

router.get("/users", adminController.AdminUser);

//--------GET Admin Category Details-----------//

router.get("/category", adminController.AdminCategory);

//--------GET Admin Products Details-----------//

router.get("/product", adminController.AdminProduct);

//--------GET Product Add Page-----------//

router.get("/addproduct", adminController.AddProduct);

//--------POST Admin Add Category-----------//

router.post("/addCategory", adminController.AddCategory);

//--------POST Admin Edit Category-----------//

router.post("/editcategory/:id", adminController.EditCategory);

//--------GET Admin Brands-----------//

router.get("/brands", adminController.AdminBrands);

//--------POST Admin Add Brand-----------//

router.post("/addBrand", adminController.AddBrands);

//--------POST Admin Edit Brand-----------//

router.post("/editbrand/:id", adminController.EditBrands);

//**********************EDIT ITEMS ROUTES**********************//

//--------EDIT GET PRODUCT----------//

router.get("/editproduct/:id", adminController.EditProduct);

//--------EDIT POST PRODUCT----------//

router.post(
  "/editproduct/:id",
  upload.fields([
    { name: "image1", maxCount: 1 },
    { name: "image2", maxCount: 1 },
    { name: "image3", maxCount: 1 },
    { name: "image4", maxCount: 1 },
  ]),
  adminController.PostEditProduct
);

//**********************ADD ITEMS ROUTES**********************//

router.post(
  "/addProduct",
  upload.fields([
    { name: "image1", maxCount: 1 },
    { name: "image2", maxCount: 1 },
    { name: "image3", maxCount: 1 },
    { name: "image4", maxCount: 1 },
  ]),
  adminController.PostAddProduct
);

//********************DELETE ITEMS ROUTES*********************//

//------GET Category Delete-------//

router.get("/deletecategory/:id", adminController.deleteCategory);

//------GET Brand Delete-------//

router.get("/deletebrand/:id", adminController.deleteBrand);

//------GET Orders Render-------//

router.get("/orders", adminController.GetOrders);

//--------------Order Cancel----------------//

router.post("/order-cancel/:id", adminController.OrderCancel);

//--------------Banner Routes-----------------//

router.get("/banners", adminController.GetBanners);

//----------------Add Banners--------------//

router.post(
  "/add-banner",
  upload.single("image"),
  adminController.AddBanners
);

//==========Delete Banner============//

router.get('/delete-banner/:id',adminController.DeleteBanner)

//----------------OFFER PAGE RENDERING---------------//

router.get('/offers',adminController.GetOffers)

//------------Create CATEGORY OFFER-------------//

router.post('/add-offer',adminController.CategoryOffer)

//----------------EDIT CATEGORY OFFERS----------------//

router.post('/edit-category-offer/:id',adminController.EditCategoryOffers)

//----------------EDIT CATEGORY OFFERS----------------//

router.post('/add-productoffer',adminController.AddProductOffer)

//----------------EDIT PRODUCT OFFERS----------------//

router.post('/edit-product-offer/:id',adminController.EditProductOffer)

//-------------DELETE PRODUCT OFFER--------------//

router.get('/delete-product-offer/:id',adminController.deleteProductOffer)

//---------------COUPON MANAGEMENT---------------//

router.get('/coupons',adminController.GetCoupon)

//------------ADD COUPONS-------------//

router.post('/add-coupon',adminController.AddCoupons)

//------------Edit Coupon--------------//

router.post('/edit-coupon/:id',adminController.EditCoupon)

//-----------------Delete Coupon------------------//

router.get('/delete-coupon/:id',adminController.DeleteCoupon)

//-----------------GET SALES REPORT PAGE-----------------//

router.get('/sales',adminController.GetSales)

//----------------USER BLOCK----------------//

router.get('/action/:id',adminController.UserBlock)

module.exports = router;