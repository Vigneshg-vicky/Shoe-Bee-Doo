const jwt = require("jsonwebtoken");
const db = require("../db");
const bcrypt = require("bcrypt");
const path = require("path");
const mongodb = require("mongodb");
const session = require("express-session");
const multer = require("multer");
const cloudinary = require("../utils/cloudinary");
const adminCollection = require("./config/collection");
const collection = require("./config/collection");
const commonController = require("./commonControllers");

// CLOUDINARY

module.exports = {
  //---------------render Admin Login page---------------------//

  getAdminLogin: (req, res) => {
    if (req.cookies.adminjwt) {
      res.redirect("/admin/home");
    } else {
      res.render("admin/adminLogin", { title: "Admin Login", login: true });
    }
  },

  //------------------Render Admin Home Page--------------------//

  AdminHome: (req, res) => {
    res.render("admin/adminHome", { title: "Admin Home", admin: true });
  },

  //------------------Render Admin User Details Page--------------------//

  AdminUser: async (req, res) => {
    const UserDetails = await db
      .getdb()
      .collection(collection.USER_COLLECTION)
      .find({})
      .toArray();
    res.render("admin/adminUserDetail", {
      title: "Admin User Details",
      admin: true,
      UserDetails,
    });
  },

  //---------------render CATEGORY page---------------------//

  AdminCategory: async (req, res) => {
    try {
      const categoryData = await db
        .getdb()
        .collection("Category")
        .find({})
        .toArray();
      console.log(categoryData);
      res.render("admin/adminCategory", {
        title: "Admin Category",
        admin: true,
        categoryData,
      });
    } catch (error) {
      console.log(error);
    }
  },

  //---------------render PRODUCT page---------------------//

  AdminProduct: async (req, res) => {
    try {
      const agg = [
        {
          $lookup: {
            from: "Category",
            localField: "subcategory",
            foreignField: "_id",
            as: "CatName",
          },
        },
        {
          $lookup: {
            from: "Brands",
            localField: "brand",
            foreignField: "_id",
            as: "Brandname",
          },
        },
        {
          $unwind: {
            path: "$CatName",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$Brandname",
            preserveNullAndEmptyArrays: true,
          },
        },
      ];

      const data = await db
        .getdb()
        .collection(adminCollection.PRODUCT_COLLECTION)
        .aggregate(agg)
        .toArray();
      res.render("admin/adminProduct", {
        title: "Admin Product",
        admin: true,
        data,
      });
    } catch (error) {
      console.log(error);
    }
  },

  //---------------render Brands page---------------------//

  AdminBrands: async (req, res) => {
    const data = await db.getdb().collection("Brands").find({}).toArray();
    res.render("admin/adminBrands", {
      title: "Admin Brands",
      admin: true,
      data,
    });
  },

  //---------------render ADD PRODUCT page---------------------//

  AddProduct: async (req, res) => {
    // const data = await db.getdb().collection("Product").find({}).toArray();
    const category = await db
      .getdb()
      .collection(adminCollection.CATEGORY_COLLECTION)
      .find({})
      .toArray();
    const brands = await db
      .getdb()
      .collection(adminCollection.BRAND_COLLECTION)
      .find({})
      .toArray();
    res.render("admin/addProduct", {
      title: "Add Product",
      admin: true,
      brands,
      category,
    });
  },

  //--------------Banner Route--------------//

  GetBanners: async (req, res) => {
    try {
      const banners = await db
        .getdb()
        .collection(collection.BANNER_COLLECTION)
        .find()
        .toArray();

      const Products = await db
        .getdb()
        .collection(collection.PRODUCT_COLLECTION)
        .find()
        .toArray();
      res.render("admin/adminBanners", {
        admin: true,
        title: "Admin Banners",
        Products,
        banners,
      });
    } catch (error) {
      console.log(error);
    }
  },

  //----------------Add Banners----------------//

  AddBanners: async (req, res) => {
    console.log(req.body);
    console.log(req.files);
    const description = req.body.description;
    const productId = req.body.products;

    const result = await cloudinary.uploader.upload(req.file.path);
    const banner = {
      product: mongodb.ObjectId(productId),
      description: description,
      image: result.secure_url,
      created_on: commonController.date(),
    };
    const bannerUpload = await db
      .getdb()
      .collection(collection.BANNER_COLLECTION)
      .insertOne(banner);
    res.redirect("/admin/banners");
  },

  //--------------Delete Banner--------------//

  DeleteBanner: async (req, res) => {
    try {
      const id = mongodb.ObjectId(req.params.id);
      const Delete = await db
        .getdb()
        .collection(collection.BANNER_COLLECTION)
        .deleteOne({ _id: id });
      res.redirect("/admin/banners");
    } catch (error) {
      console.log(error);
    }
  },

  //----------------Get Offers-----------------//

  GetOffers: async (req, res) => {
    try {
      const Category = await db
        .getdb()
        .collection(collection.CATEGORY_COLLECTION)
        .find()
        .toArray();
      const Products = await db
        .getdb()
        .collection(collection.PRODUCT_COLLECTION)
        .find()
        .toArray();
      const disCategory = await db
        .getdb()
        .collection(collection.CATEGORY_COLLECTION)
        .find({ categoryDiscount: { $gt: 0 } })
        .toArray();

      const disProduct = await db
        .getdb()
        .collection(collection.PRODUCT_COLLECTION)
        .find({ productDiscount: { $gt: 0 } })
        .toArray();

      res.render("admin/AdminOffers", {
        admin: true,
        title: "Offer Management",
        Category,
        Products,
        disCategory,
        disProduct,
      });
    } catch (err) {
      console.log(err);
    }
  },

  //---------------Create CATEGORY OFFER----------------//

  CategoryOffer: async (req, res) => {
    try {
      const discount = Number(req.body.categoryDiscount);
      const categoryId = req.body.category;
      await db
        .getdb()
        .collection(collection.PRODUCT_COLLECTION)
        .updateMany(
          { subcategory: mongodb.ObjectId(categoryId) },
          { $set: { categoryDiscount: discount } }
        );
      await db
        .getdb()
        .collection(collection.CATEGORY_COLLECTION)
        .updateOne(
          { _id: mongodb.ObjectId(categoryId) },
          { $set: { categoryDiscount: discount } }
        );
      res.redirect("/admin/offers");
    } catch (err) {
      console.log(err);
    }
  },

  //------------------EDIT CATEGORY OFFERS----------------//

  EditCategoryOffers: async (req, res) => {
    try {
      const categoryId = req.params.id;
      const discount = Number(req.body.discount);
      console.log(req.body, req.params.id);
      const change = await db
        .getdb()
        .collection(collection.CATEGORY_COLLECTION)
        .updateOne(
          { _id: mongodb.ObjectId(categoryId) },
          { $set: { categoryDiscount: discount } }
        );
      res.redirect("/admin/offers");
    } catch (err) {
      console.log(err);
    }
  },

  //------------------ADD PRODUCT OFFERS------------------//

  AddProductOffer: async (req, res) => {
    try {
      // console.log(req.body)
      // if(req.body.product){
      //   console.log('This is true')
      // }else{
      //   console.log('Not working')
      // }
      const productId = req.body.product;
      const discount = Number(req.body.productDiscount);
      const add = await db
        .getdb()
        .collection(collection.PRODUCT_COLLECTION)
        .updateOne(
          { _id: mongodb.ObjectId(productId) },
          { $set: { productDiscount: discount } }
        );
      res.redirect("/admin/offers");
    } catch (err) {
      console.log(err);
    }
  },

  //---------------EDIT PRODUCT OFFERS----------------//

  EditProductOffer: async (req, res) => {
    try {
      const discount = Number(req.body.discount);
      const productId = req.params.id;
      const edit = await db
        .getdb()
        .collection(collection.PRODUCT_COLLECTION)
        .updateOne(
          { _id: mongodb.ObjectId(productId) },
          { $set: { productDiscount: discount } }
        );
      res.redirect("/admin/offers");
    } catch (err) {
      console.log(err);
    }
  },

  //---------------DELETE PRODUCT OFFER--------------//

  deleteProductOffer: async (req, res) => {
    try {
      const productId = req.params.id;
      const deleteOffer = await db
        .getdb()
        .collection(collection.PRODUCT_COLLECTION)
        .updateOne(
          { _id: mongodb.ObjectId(productId) },
          { $set: { productDiscount: 0 } }
        );
      res.redirect("/admin/offers");
    } catch (err) {
      console.log(err);
    }
  },

  //----------------GET COUPON PAGE-----------------//

  GetCoupon: async (req, res) => {
    try {
      const coupons = await db
        .getdb()
        .collection(collection.COUPON_COLLECTION)
        .find()
        .toArray();
      res.render("admin/adminCoupon", {
        admin: true,
        title: "Coupon Managements",
        coupons,
      });
    } catch (err) {
      console.log(err);
    }
  },

  //-----------------ADD COUPONS----------------//

  AddCoupons: async (req, res) => {
    try {
      console.log(req.body);
      const couponCode = req.body.couponName;
      const discount = Number(req.body.discount);
      const date = req.body.date;
      const limit = Number(req.body.limit);
      const addCoupon = await db
        .getdb()
        .collection(collection.COUPON_COLLECTION)
        .insertOne({ couponCode, discount, date: new Date(date), limit });
      res.redirect("/admin/coupons");
    } catch (err) {
      console.log(err);
    }
  },

  //-----------------Edit Coupon-----------------//

  EditCoupon: async (req, res) => {
    try {
      console.log(req.body);
      const couponId = req.params.id;
      const couponCode = req.body.couponName;
      const discount = req.body.discount;
      const date = req.body.date;
      const limit = req.body.limit;
      const change = await db
        .getdb()
        .collection(collection.COUPON_COLLECTION)
        .updateOne(
          { _id: mongodb.ObjectId(couponId) },
          { $set: { couponCode, discount, date, limit } }
        );
      res.redirect("/admin/coupons");
    } catch (err) {
      console.log(err);
    }
  },

  //----------------Delete Coupon-----------------//

  DeleteCoupon: async (req, res) => {
    try {
      const couponId = req.params.id;
      await db
        .getdb()
        .collection(collection.COUPON_COLLECTION)
        .deleteOne({ _id: mongodb.ObjectId(couponId) });
      res.redirect("/admin/coupons");
    } catch (err) {
      console.log(err);
    }
  },

  //-----------------GET SALES PAGE--------------//

  GetSales: (req, res) => {
    try {
      res.render("admin/salesReport", { admin: true, title: "Sales Report" });
    } catch (err) {
      console.log(err);
    }
  },

  //---------------Render GET Orders--------------------//

  GetOrders: async (req, res) => {
    try {
      const agg = [
        {
          $lookup: {
            from: "userData",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $sort: {
            Date: -1,
          },
        },
      ];
      const OrderDetails = await db
        .getdb()
        .collection(collection.ORDER_COLLECTION)
        .aggregate(agg)
        .toArray();
      res.render("admin/adminOrders", {
        title: "Orders",
        admin: true,
        OrderDetails,
      });
    } catch (error) {
      console.log(error);
    }
  },

  //==============USER BLOCK===============//

  UserBlock: async (req, res) => {
    try {
      const userId = req.params.id;
      const isBlocked = await db
        .getdb()
        .collection(collection.USER_COLLECTION)
        .findOne({ _id: mongodb.ObjectId(userId), IsBlocked: true });
      if (isBlocked) {
        const block = await db
          .getdb()
          .collection(collection.USER_COLLECTION)
          .updateOne(
            { _id: mongodb.ObjectId(userId) },
            { $set: { IsBlocked: false } }
          );
      } else {
        const block = await db
          .getdb()
          .collection(collection.USER_COLLECTION)
          .updateOne(
            { _id: mongodb.ObjectId(userId) },
            { $set: { IsBlocked: true } }
          );
      }
      res.redirect("/admin/users");
    } catch (err) {
      console.log(err);
    }
  },

  //---------------POST Add Category-------------------//

  AddCategory: async (req, res) => {
    try {
      const { name, details } = req.body;
      const added = await db
        .getdb()
        .collection("Category")
        .insertOne({ categoryName: name, description: details });
      res.redirect("/admin/category");
    } catch (error) {
      console.log(error);
    }
  },

  //---------------POST Edit Category-------------------//

  EditCategory: async (req, res) => {
    try {
      const id = req.params.id;
      const { name, details } = req.body;
      const Edited = await db
        .getdb()
        .collection("Category")
        .updateOne(
          { _id: mongodb.ObjectId(id) },
          { $set: { categoryName: name, description: details } }
        );
      res.redirect("/admin/category");
    } catch (error) {
      console.log(error);
    }
  },

  //---------------POST Add Brands-------------------//

  AddBrands: async (req, res) => {
    try {
      const { brand, details } = req.body;
      const addBrand = await db
        .getdb()
        .collection("Brands")
        .insertOne({ BrandName: brand, description: details });
      res.redirect("/admin/brands");
    } catch (error) {
      console.log(error);
    }
  },

  //---------------POST Add Brands-------------------//

  EditBrands: async (req, res) => {
    try {
      const id = req.params.id;
      const { brand, details } = req.body;
      const editedData = await db
        .getdb()
        .collection("Brands")
        .updateOne(
          { _id: mongodb.ObjectId(id) },
          { $set: { BrandName: brand, description: details } }
        );
      res.redirect("/admin/brands");
    } catch (error) {
      console.log(error);
    }
  },

  //**********************ADD ROUTES**********************//

  PostAddProduct: async (req, res) => {
    try {
      const org = Number(req.body.orgprice);
      const disc = Number(req.body.disprice);
      const cloudinaryImageUploadMethod = (file) => {
        console.log(file);
        return new Promise((resolve) => {
          cloudinary.uploader.upload(file, (err, res) => {
            if (err) console.log(err);
            if (res) {
              resolve(res.secure_url);
            }
          });
        });
      };

      const files = req.files;
      let arr1 = Object.values(files);
      let arr2 = arr1.flat();

      const urls = await Promise.all(
        arr2.map(async (file) => {
          const { path: filepath } = file;
          console.log(file);
          const result = await cloudinaryImageUploadMethod(
            path.join(process.cwd(), filepath)
          );
          return result;
        })
      );
      console.log(urls);

      // const result=urls.map(url =>url.res)

      const product = {
        product: req.body.name,
        description: req.body.description,
        category: req.body.category,
        subcategory: mongodb.ObjectId(req.body.subcategory),
        brand: mongodb.ObjectId(req.body.brand),
        size: Number(req.body.size),
        stock: Number(req.body.stock),
        productDiscount: 0,
        categoryDiscount: 0,
        originalprice: Number(req.body.orgprice),
        discountprice: Number(req.body.disprice),
        urls: urls,
      };
      // console.log({product})

      const newProduct = await db
        .getdb()
        .collection(adminCollection.PRODUCT_COLLECTION)
        .insertOne(product);
      // console.log(newProduct);
      res.redirect("/admin/product");
    } catch (err) {
      console.log(err);
    }
  },

  //**********************EDIT ROUTES**********************//

  EditProduct: async (req, res) => {
    try {
      const id = req.params.id;
      console.log(id);
      const subcategory = await db
        .getdb()
        .collection(adminCollection.CATEGORY_COLLECTION)
        .find({})
        .toArray();
      const brands = await db
        .getdb()
        .collection(adminCollection.BRAND_COLLECTION)
        .find({})
        .toArray();
      const productData = await db
        .getdb()
        .collection(adminCollection.PRODUCT_COLLECTION)
        .findOne({ _id: mongodb.ObjectId(id) });
      console.log(productData);
      res.render("admin/editProduct", {
        title: "Edit Product",
        admin: true,
        productData,
        subcategory,
        brands,
      });
    } catch (error) {
      console.log(error);
    }
  },

  PostEditProduct: async (req, res) => {
    let urls;
    if (req.files) {
      const cloudinaryImageUploadMethod = (file) => {
        console.log(file);
        return new Promise((resolve) => {
          cloudinary.uploader.upload(file, (err, res) => {
            if (err) console.log(err);
            if (res) {
              resolve(res.secure_url);
            }
          });
        });
      };

      const files = req.files;
      let arr1 = Object.values(files);
      let arr2 = arr1.flat();

      urls = await Promise.all(
        arr2.map(async (file) => {
          const { path: filepath } = file;
          console.log(file);
          const result = await cloudinaryImageUploadMethod(
            path.join(process.cwd(), filepath)
          );
          return result;
        })
      );
    }
    console.log(req.body);
    const id = req.params.id;
    console.log(id);
    const product = {
      product: req.body.name,
      description: req.body.description,
      category: req.body.category,
      subcategory: mongodb.ObjectId(req.body.subcategory),
      brand: mongodb.ObjectId(req.body.brand),
      size: Number(req.body.size),
      stock: Number(req.body.stock),
      productDiscount: 0,
      categoryDiscount: 0,
      originalprice: Number(req.body.orgprice),
      discountprice: Number(req.body.disprice),
      urls: urls,
    };

    const updatedData = await db
      .getdb()
      .collection(adminCollection.PRODUCT_COLLECTION)
      .updateOne({ _id: mongodb.ObjectId(id) }, { $set: { ...product } });
    res.redirect("/admin/product");
  },

  //**********************DELETE ROUTES**********************//

  //------GET Category Delete-------//

  deleteCategory: async (req, res) => {
    try {
      const id = req.params.id;
      await db
        .getdb()
        .collection("Category")
        .deleteOne({ _id: mongodb.ObjectId(id) });
      res.redirect("/admin/category");
    } catch (error) {
      console.log(error);
    }
  },

  //------GET Brand Delete-------//

  deleteBrand: async (req, res) => {
    try {
      const id = req.params.id;
      await db
        .getdb()
        .collection("Brands")
        .deleteOne({ _id: mongodb.ObjectId(id) });
      res.redirect("/admin/brands");
    } catch (error) {
      console.log(error);
    }
  },

  //------GET Product Delete-------//

  deleteProduct: async (req, res) => {
    try {
      const id = req.params.id;
      await db
        .getdb()
        .collection("Products")
        .deleteOne({ _id: mongodb.ObjectId(id) });
      res.redirect("/admin/product");
    } catch (error) {
      console.log(error);
    }
  },

  OrderCancel: async (req, res) => {
    try {
      const orderId = req.params.id;
      const status = req.body.status;
      if (status == "cancel") {
        const Cancel = await db
          .getdb()
          .collection(collection.ORDER_COLLECTION)
          .updateOne(
            { _id: mongodb.ObjectId(orderId) },
            {
              $set: {
                cancel: true,
                OrderStatus: "Cancelled by Admin",
                admin: true,
              },
            }
          );
      } else if (status == "shipped") {
        const Shipped = await db
          .getdb()
          .collection(collection.ORDER_COLLECTION)
          .updateOne(
            { _id: mongodb.ObjectId(orderId) },
            { $set: { OrderStatus: "Shipped" } }
          );
      } else if (status == "outForDelivery") {
        const Out_for_delivery = await db
          .getdb()
          .collection(collection.ORDER_COLLECTION)
          .updateOne(
            { _id: mongodb.ObjectId(orderId) },
            { $set: { OrderStatus: "Out For Delivery" } }
          );
      } else if (status == "delivered") {
        const Delivered = await db
          .getdb()
          .collection(collection.ORDER_COLLECTION)
          .updateOne(
            { _id: mongodb.ObjectId(orderId) },
            {
              $set: {
                OrderStatus: "Delivered",
                delivered: true,
                cancel: false,
              },
            }
          );
      } else if (status == "confirmed") {
        const Confirmed = await db
          .getdb()
          .collection(collection.ORDER_COLLECTION)
          .updateOne(
            { _id: mongodb.ObjectId(orderId) },
            { $set: { OrderStatus: "Confirmed" } }
          );
      }
      res.redirect("/admin/orders");
    } catch (error) {
      console.log(error);
    }
  },

  //------module ends!------//
};
