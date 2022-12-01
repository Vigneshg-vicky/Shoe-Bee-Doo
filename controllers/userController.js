const jwt = require("jsonwebtoken");
const db = require("../db");
const bcrypt = require("bcrypt");
const mongodb = require("mongodb");
const session = require("express-session");
const collection = require("./config/collection");
const Razorpay = require("razorpay");
const paypal = require("paypal-rest-sdk");
const commonController = require("./commonControllers");
paypal.configure({
  mode: "sandbox", //sandbox or live
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_SECRET,
});

module.exports = {
  //--------------render signup page---------------------//

  userSignUp: (req, res) => {
    if (req.cookies.userjwt) {
      res.redirect("/home");
    } else {
      res.render("user/signup", { title: "SignUp Page", user: true });
    }
  },
  //--------------render Login page---------------------//

  userLogin: (req, res) => {
    if (req.cookies.userjwt) {
      res.redirect("/home");
    } else {
      const error = req.query?.error;
      res.render("user/login", { title: "Login Page", user: true, error });
    }
  },

  //---------------OTP page-------------------//

  OTP: (req, res) => {
    res.render("user/otp", { title: "OTP Verification", user: true });
  },

  //------------FORGET PASSWORD----------------//

  ForgetPassword: (req, res) => {
    res.render("user/forgotPassword", { user: true, title: "Forget Password" });
  },

  //----------------PAssword Verifying after OTP-----------//

  OtpForgetPassword: async (req, res) => {
    try {
      // console.log(req.body);
      const password = req.body.password;
      const re_password = req.body.re_password;
      const number = req.body.number;
      const hashPass = await bcrypt.hash(password, 10);
      const passwordChange = await db
        .getdb()
        .collection(collection.USER_COLLECTION)
        .updateOne({ number }, { $set: { password: hashPass } });
      return res.status(200).json({
        status: "success",
        message: "Password Changed!",
      });
    } catch (err) {
      console.log(err);
      return json({
        status: "failed",
        message: err,
      });
    }
  },

  //---------------render home page---------------------//

  getHomePage: async (req, res) => {
    try {
      const users = req.user;
      const banner = await db
        .getdb()
        .collection(collection.BANNER_COLLECTION)
        .find()
        .toArray();
      const products = await db
        .getdb()
        .collection(collection.PRODUCT_COLLECTION)
        .find()
        .sort({ date: -1 })
        .limit(4)
        .toArray();

      const wishlist = await db
        .getdb()
        .collection(collection.WISHLIST_COLLECTION)
        .findOne({ userId: mongodb.ObjectId(users) });

      if (wishlist) {
        if (wishlist.products.length > 0) {
          wishlist.products.forEach((item) => {
            const index = products.findIndex(
              (productss) =>
                productss._id.toString() === item.productId.toString()
            );
            if (index !== -1) {
              products[index].wishlist = true;
            }
          });
        }
      }

      res.render("user/userHome", {
        title: "Home Page",
        user: true,
        banner,
        products,
        users,
      });
    } catch (error) {
      console.log(error);
    }
  },

  //------------SEARCH PAGE--------------//

  Search: async (req, res) => {
    try {
      // console.log(req.query.search);
      const word = req.query.search;
      const trimmed = word.trim();
      let product = await db
        .getdb()
        .collection(collection.PRODUCT_COLLECTION)
        .find({ product: { $regex: trimmed, $options: "i" } })
        .toArray();
      // console.log(product);
      res.render("user/shopPage", {
        title: "Searched Products",
        user: true,
        product,
      });
    } catch (error) {
      console.log(error);
    }
  },

  //---------------render Shop page---------------------//

  GetShopPage: async (req, res) => {
    try {
      const users = req.user;
      // console.log('first',users)
      // console.log(req.query.Men);
      let sort1;
      let sort2;
      let query = {};
      let sort = {};
      const limit = 4;

      let pageNo;
      if (req.query?.catId) {
        if (req.query?.catId == "Men") {
          query = { category: "Men" };
        } else if (req.query?.catId == "Women") {
          query = { category: "Women" };
        } else if (req.query?.catId == "Kids") {
          query = { category: "Kids" };
        }
      }
      if (req.query?.brandId) {
        const brandId = req.query?.brandId;
        query = { brand: mongodb.ObjectId(brandId) };
      }
      if (req.query?.sort) {
        if (req.query?.sort == 1) {
          sort1 = true;
        } else {
          sort2 = true;
        }
        // console.log(sortNo)
        sort = { discountprice: req.query?.sort };
      }
      if (req.query?.page) {
        // console.log(req.query?.page);
        pageNo = req.query?.page - 1 || 0;
        // console.log(pageNo);
      }

      const product = await db
        .getdb()
        .collection(collection.PRODUCT_COLLECTION)
        .find(query)
        .skip(pageNo * limit)
        .limit(limit)
        .sort(sort)
        .toArray();

      const products = await db
        .getdb()
        .collection(collection.PRODUCT_COLLECTION)
        .find()
        .toArray();

      const wishlist = await db
        .getdb()
        .collection(collection.WISHLIST_COLLECTION)
        .findOne({ userId: mongodb.ObjectId(users) });

      if (wishlist) {
        if (wishlist.products.length > 0) {
          wishlist.products.forEach((item) => {
            const index = product.findIndex(
              (productss) =>
                productss._id.toString() === item.productId.toString()
            );
            if (index !== -1) {
              product[index].wishlist = true;
            }
          });
        }
      }

      // console.log(product);
      // to get number of page

      let max = products.length / limit;
      let m = Math.ceil(max);
      let page = [];
      for (let i = 1; i <= m; i++) {
        page.push(i);
      }

      res.render("user/shopPage", {
        title: "Shop Page",
        user: true,
        products,
        product,
        users,
        page,
        sort1,
        sort2,
      });
    } catch (error) {
      console.log(error);
    }
  },

  //------------CART AND WISHLIST COUNT------------//

  Count: async (req, res) => {
    try {
      let cartCount;
      const userId = req.user;
      const userCart = await db
        .getdb()
        .collection(collection.CART_DATA)
        .findOne({ userId: mongodb.ObjectId(userId) });

   
      if (userCart == null) {
        cartCount = 0;
      } else {
        cartCount = userCart.products.length;
      }

      const userWishlist = await db
        .getdb()
        .collection(collection.WISHLIST_COLLECTION)
        .findOne({ userId: mongodb.ObjectId(userId) });

      let wishlistCount;
      if (userWishlist == null) {
        wishlistCount = 0;
      } else {
        wishlistCount = userWishlist.products.length;
      }
      res.status(200).json({
        status: "success",
        message: "Count is found!",
        cart: cartCount,
        wishlist: wishlistCount,
      });
    } catch (error) {
      console.log(error);
    }
  },

  //-----------SORT PRODUCTS IN SHOP PAGE-------------//

  SortProducts: async (req, res) => {
    try {
      const sort = req.body.sortValue;
      if (sort == 1) {
        const lowToHigh = await db
          .getdb()
          .collection(collection.PRODUCT_COLLECTION)
          .find()
          .sort({ discountprice: 1 })
          .toArray();

        return res.status(200).json({
          status: "lowToHigh",
          message: "Low to High sort",
          products: lowToHigh,
        });
      } else if (sort == -1) {
        const highToLow = await db
          .getdb()
          .collection(collection.PRODUCT_COLLECTION)
          .find()
          .sort({ discountprice: -1 })
          .toArray();

        return res.status(200).json({
          status: "highToLow",
          message: "High to Low sort",
          products: highToLow,
        });
      }
    } catch (error) {
      console.log(error);
    }
  },

  //---------------Render Product page---------------------//

  GetProductPage: async (req, res) => {
    try {
      const users = req.user;
      const id = req.params.id;
      const agg = [
        {
          $match: {
            _id: mongodb.ObjectId(id),
          },
        },
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
      const ProductData = await db
        .getdb()
        .collection(collection.PRODUCT_COLLECTION)
        .aggregate(agg)
        .toArray();
      let Discount;
      if (
        ProductData.productDiscount == 0 &&
        ProductData.categoryDiscount == 0
      ) {
        Discount = 0;
      } else if (ProductData.productDiscount >= ProductData.categoryDiscount) {
        Discount = ProductData.productDiscount;
      } else if (ProductData.productDiscount < ProductData.categoryDiscount) {
        Discount = ProductData.categoryDiscount;
      }

      let price;
      if (ProductData.originalprice == ProductData.discountprice) {
        price = true;
      } else if (ProductData.originalprice >= ProductData.discountprice) {
        price = false;
      }
      const Productstock = await db
        .getdb()
        .collection(collection.PRODUCT_COLLECTION)
        .findOne({ _id: mongodb.ObjectId(id) });

      const getProducts = await db
        .getdb()
        .collection(collection.PRODUCT_COLLECTION)
        .findOne({ _id: mongodb.ObjectId(id) });
      const subId = getProducts.subcategory;

      const relatedProducts = await db
        .getdb()
        .collection(collection.PRODUCT_COLLECTION)
        .find({ subcategory: mongodb.ObjectId(subId) })
        .toArray();

      // console.log(Productstock);
      res.render("user/ProductPage", {
        title: "Product Page",
        user: true,
        ProductData,
        Productstock,
        // users,
        price,
        Discount,
        relatedProducts,
      });
    } catch (error) {
      console.log(error);
    }
  },

  //---------------Render CART page---------------------//

  getCart: async (req, res) => {
    const id = req.user;

    const agg = [
      {
        $match: {
          userId: mongodb.ObjectId(id),
        },
      },
      {
        $unwind: {
          path: "$products",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: "Products",
          localField: "products.productId",
          foreignField: "_id",
          as: "product_details",
        },
      },
      {
        $project: {
          userId: "$userId",
          products: "$products",
          product: {
            $arrayElemAt: ["$product_details", 0],
          },
        },
      },
      {
        $group: {
          _id: "$userId",
          products: {
            $push: {
              product_details: "$product",
              quantity: "$products.quantity",
              subTotal: {
                $sum: {
                  $multiply: ["$products.quantity", "$product.discountprice"],
                },
              },
            },
          },
          total: {
            $sum: {
              $multiply: ["$products.quantity", "$product.discountprice"],
            },
          },
        },
      },
    ];
    const [cartdetails] = await db
      .getdb()
      .collection(collection.CART_DATA)
      .aggregate(agg)
      .toArray();
    // console.log(cartdetails);
    if (!cartdetails) {
      res.render("user/emptyCart", { title: "Empty Cart", user: true });
    } else {
      res.render("user/cart", { title: "Cart", user: true, cartdetails, id });
    }
  },

  //---------------Render CART page---------------------//

  addToCart: async (req, res) => {
    try {
      const proId = req.body.id;
      // console.log(req.body.id);
      const user = req.user;
      const userExist = await db
        .getdb()
        .collection(collection.CART_DATA)
        .findOne({ userId: mongodb.ObjectId(user) });
      if (userExist) {
        const ProductExistsInCart = await db
          .getdb()
          .collection(collection.CART_DATA)
          .findOne({
            userId: mongodb.ObjectId(user),
            products: { $elemMatch: { productId: mongodb.ObjectId(proId) } },
          });
        if (ProductExistsInCart) {
          await db
            .getdb()
            .collection(collection.CART_DATA)
            .updateOne(
              {
                userId: mongodb.ObjectId(user),
                "products.productId": mongodb.ObjectId(proId),
              },
              { $inc: { "products.$.quantity": 1 } }
            );
          const cart = await db
            .getdb()
            .collection(collection.CART_DATA)
            .findOne({ userId: mongodb.ObjectId(user) });
          const cartCount = cart.products.length;
          return res.status(200).json({
            status: "success",
            message: "Same Product added to Cart again",
            cart: cartCount,
          });
        } else {
          await db
            .getdb()
            .collection(collection.CART_DATA)
            .updateOne(
              { userId: mongodb.ObjectId(user) },
              {
                $push: {
                  products: { productId: mongodb.ObjectId(proId), quantity: 1 },
                },
              }
            );
          const cart = await db
            .getdb()
            .collection(collection.CART_DATA)
            .findOne({ userId: mongodb.ObjectId(user) });
          const cartCount = cart.products.length;
          return res.status(200).json({
            status: "success",
            message: "New Product added to Cart",
            cart: cartCount,
          });
        }
      } else {
        const added = await db
          .getdb()
          .collection(collection.CART_DATA)
          .insertOne({
            userId: mongodb.ObjectId(user),
            products: [{ productId: mongodb.ObjectId(proId), quantity: 1 }],
          });
        const cart = await db
          .getdb()
          .collection(collection.CART_DATA)
          .findOne({ userId: mongodb.ObjectId(user) });
        const cartCount = cart.products.length;
        return res.status(200).json({
          status: "success",
          message: "Product added to Cart",
          cart: cartCount,
        });
      }

      // res.redirect("/cart");
    } catch (error) {
      console.log(error);
      return res.status(404).json({
        status: "failed",
        message: error,
      });
    }
  },

  //------------APPLY COUPON IN CART-----------//

  ApplyCoupon: async (req, res) => {
    try {
      // console.log(req.body);
      const total = req.body.total;
      const userId = req.body.userId;
      const coupon = req.body.coupon;
      const checkcoupon = await db
        .getdb()
        .collection(collection.COUPON_COLLECTION)
        .findOne({ couponCode: coupon });
      if (checkcoupon) {
        const user = await db
          .getdb()
          .collection(collection.COUPON_COLLECTION)
          .findOne({
            _id: mongodb.ObjectId(checkcoupon._id),
            users: { $elemMatch: { userId: mongodb.ObjectId(userId) } },
          });
        // console.log(user);
        if (user) {
          return res.status(400).json({
            status: "failed",
            message: "You already used this Coupon!",
          });
        } else {
          if (new Date() >= checkcoupon.date) {
            return res.status(400).json({
              status: "failed",
              message: "The coupon has expired!",
            });
          } else {
            const discounted = Math.floor((total * checkcoupon.discount) / 100);
            return res.status(200).json({
              status: "success",
              message: "The coupon has been applied!",
              discounted,
            });
          }
        }
      } else {
        return res.status(401).json({
          status: "failed",
          message: "Invalid Coupon!",
        });
      }
    } catch (err) {
      console.log(err);
      res.status(404).json({
        status: "failed",
        message: err,
      });
    }
  },

  //----------POST ACCOUNTS Page-------------//

  GetAccount: async (req, res) => {
    try {
      const userId = req.user;
      const OrderDetails = await db
        .getdb()
        .collection(collection.ORDER_COLLECTION)
        .find({ userId: mongodb.ObjectId(userId) })
        .sort({ Date: -1 })
        .toArray();
   

      let EmptyCart;
      if (OrderDetails.length === 0) {
        EmptyCart = true;
      } else {
        EmptyCart = false;
      }

      OrderDetails.map((Data) => {
        const ConvertString = Data.Date.toString();
        Data.Date = ConvertString.split(" ").splice(1, 3).toString();
        // console.log(Data.Date);
      });

      const userData = await db
        .getdb()
        .collection(collection.USER_COLLECTION)
        .findOne({ _id: mongodb.ObjectId(userId) });

      res.render("user/Profile", {
        user: true,
        OrderDetails,
        userData,
        EmptyCart,
      });
    } catch (error) {
      console.log(error);
    }
  },

  //----------------GET ADDRESSES-----------------//

  GetAddresses: async (req, res) => {
    try {
      const userId = req.user;
      const addressDetails = await db
        .getdb()
        .collection(collection.USER_COLLECTION)
        .findOne({ _id: mongodb.ObjectId(userId) });
      let found;
      if (addressDetails.address) {
        if (addressDetails.address.length > 0) {
          found = true;
        } else {
          found = false;
        }
      } else {
        found = false;
      }

      res.render("user/address", {
        user: true,
        addressDetails,
        title: "Addresses",
        found,
      });
    } catch (error) {
      console.log(error);
    }
  },

  //------------------Get User Details-------------------//

  GetDetails: async (req, res) => {
    try {
      const userId = req.user;
      const userData = await db
        .getdb()
        .collection(collection.USER_COLLECTION)
        .findOne({ _id: mongodb.ObjectId(userId) });
      res.render("user/accountDetails", {
        user: true,
        userData,
        title: "Account Details",
      });
    } catch (error) {
      console.log(error);
    }
  },

  //-------------------Wishlist Page Rendering--------------------//

  Wishlist: async (req, res) => {
    try {
      const userId = req.user;
      const wishlist_products = [
        {
          $match: {
            userId: mongodb.ObjectId(userId),
          },
        },
        {
          $lookup: {
            from: "Products",
            localField: "products.productId",
            foreignField: "_id",
            as: "Product_details",
          },
        },
      ];

      const [WishlistProducts] = await db
        .getdb()
        .collection(collection.WISHLIST_COLLECTION)
        .aggregate(wishlist_products)
        .toArray();

      let WishlistExists = true;
      if (!WishlistProducts) {
        WishlistExists = false;
      } else {
        if (WishlistProducts.Product_details.length == 0) {
          WishlistExists = false;
        } else {

          WishlistExists = true;
        }
      }
      if (WishlistExists) {
        res.render("user/UserWishlist", {
          title: "Wishlist",
          user: true,
          WishlistProducts,
        });
      } else {
        res.render("user/emptyWishlist", {
          user: true,
          title: "Empty wishlist",
        });
      }
    } catch (error) {
      console.log(error);
    }
  },

  //-------------------Add to Wishlist--------------------//

  AddToWishlist: async (req, res) => {
    try {
      const ProductId = req.body.ProductId;
      const userId = req.user;
      const wishlist_check = await db
        .getdb()
        .collection(collection.WISHLIST_COLLECTION)
        .findOne({
          userId: mongodb.ObjectId(userId),
          products: { $elemMatch: { productId: mongodb.ObjectId(ProductId) } },
        });

      if (!wishlist_check) {
        const Add_to_wishlist = await db
          .getdb()
          .collection(collection.WISHLIST_COLLECTION)
          .updateOne(
            { userId: mongodb.ObjectId(userId) },
            {
              $push: {
                products: { productId: mongodb.ObjectId(ProductId) },
              },
            },
            { upsert: true }
          );

        const wishlists = await db
          .getdb()
          .collection(collection.WISHLIST_COLLECTION)
          .findOne({ userId: mongodb.ObjectId(userId) });
        const wishlistcount = wishlists.products.length;
        return res.status(200).json({
          status: "success",
          message: "Added to Wishlist",
          wishlist: wishlistcount,
        });
      } else {
        const remove = await db
          .getdb()
          .collection(collection.WISHLIST_COLLECTION)
          .updateOne(
            { userId: mongodb.ObjectId(userId) },
            {
              $pull: {
                products: { productId: mongodb.ObjectId(ProductId) },
              },
            }
          );

        const wishlists = await db
          .getdb()
          .collection(collection.WISHLIST_COLLECTION)
          .findOne({ userId: mongodb.ObjectId(userId) });
        const wishlistcount = wishlists.products.length;

        return res.status(200).json({
          status: "found",
          message: "Removed from wishlist",
          wishlist: wishlistcount,
        });
      }
    } catch (error) {
      console.log(error);
      return res.status(404).json({
        status: "failed",
        message: error,
      });
      res;
    }
  },

  //-------------------DELETE from Wishlist--------------------//

  DeleteWishlist: async (req, res) => {
    try {
      const productId = req.body.productId;
      const userId = req.user;
      const Delete_Wishlist = await db
        .getdb()
        .collection(collection.WISHLIST_COLLECTION)
        .updateOne(
          { userId: mongodb.ObjectId(userId) },
          { $pull: { products: { productId: mongodb.ObjectId(productId) } } }
        );

      return res.status(200).json({
        status: "success",
        message: "Deleted from wishlist",
      });
    } catch (error) {}
  },

  //---------------RETURN ODER POST----------------//

  ReturnOrder: async (req, res) => {
    try {
      const userId = req.user;
      const orderId = req.body.orderId;

      const ProductInventory = [
        {
          $match: {
            _id: mongodb.ObjectId(orderId),
          },
        },
        {
          $unwind: {
            path: "$Products",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            productId: "$Products.product_details._id",
            quantity: "$Products.quantity",
          },
        },
      ];

      const StockChange = await db
        .getdb()
        .collection(collection.ORDER_COLLECTION)
        .aggregate(ProductInventory)
        .toArray();

      StockChange.map(async (data) => {
        let Id = data.productId;
        let quantity = data.quantity;

        const change = await db
          .getdb()
          .collection(collection.PRODUCT_COLLECTION)
          .updateOne(
            { _id: mongodb.ObjectId(Id) },
            { $inc: { stock: -quantity } }
          );
      });

      const orderDetails = await db
        .getdb()
        .collection(collection.ORDER_COLLECTION)
        .findOne({ _id: mongodb.ObjectId(orderId) });

      await db
        .getdb()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          { _id: mongodb.ObjectId(orderId) },
          { $set: { return: true, OrderStatus: "Returned" } }
        );

      const WalletData = await db
        .getdb()
        .collection(collection.WALLET_COLLECTION)
        .findOne({ userId: mongodb.ObjectId(userId) });

      if (WalletData) {
        const updateWallet = await db
          .getdb()
          .collection(collection.WALLET_COLLECTION)
          .updateOne(
            { userId: mongodb.ObjectId(userId) },
            {
              $inc: { TotalAmount: orderDetails.TotalPrice },

              $push: {
                transactions: {
                  amount: orderDetails.TotalPrice,
                  date: commonController.date(),
                  type: "Refund",
                  transaction: "Credit",
                  Id: new mongodb.ObjectId(),
                },
              },
            }
          );
      } else {
        const wallet = await db
          .getdb()
          .collection(collection.WALLET_COLLECTION)
          .insertOne({
            userId: mongodb.ObjectId(userId),
            TotalAmount: orderDetails.TotalPrice,
            transactions: [
              {
                amount: orderDetails.TotalPrice,
                date: commonController.date(),
                type: "Refund",
                transaction: "Credit",
                Id: new mongodb.ObjectId(),
              },
            ],
          });
      }

      return res.status(200).json({
        status: "success",
        message: "Return Successful!",
      });
    } catch (err) {
      console.log(err);
      return res.status(400).json({
        status: "failed",
        message: err,
      });
    }
  },

  //---------------Render Wallet page---------------------//

  GetWallet: async (req, res) => {
    try {
      const WalletData = await db
        .getdb()
        .collection(collection.WALLET_COLLECTION)
        .findOne();
      res.render("user/wallet", { user: true, title: "Wallet", WalletData });
    } catch (error) {
      console.log(error);
    }
  },

  //---------------Render CHECKOUT page---------------------//

  getCheckout: async (req, res) => {
    const id = req.user;

    const agg = [
      {
        $match: {
          userId: mongodb.ObjectId(id),
        },
      },
      {
        $unwind: {
          path: "$products",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: "Products",
          localField: "products.productId",
          foreignField: "_id",
          as: "product_details",
        },
      },
      {
        $project: {
          userId: "$userId",
          products: "$products",
          product: {
            $arrayElemAt: ["$product_details", 0],
          },
        },
      },
      {
        $group: {
          _id: "$userId",
          products: {
            $push: {
              product_details: "$product",
              quantity: "$products.quantity",
              subTotal: {
                $sum: {
                  $multiply: ["$products.quantity", "$product.discountprice"],
                },
              },
            },
          },
          total: {
            $sum: {
              $multiply: ["$products.quantity", "$product.discountprice"],
            },
          },
        },
      },
    ];
    const [CheckOutProducts] = await db
      .getdb()
      .collection(collection.CART_DATA)
      .aggregate(agg)
      .toArray();

    const useraddress = await db
      .getdb()
      .collection(collection.USER_COLLECTION)
      .findOne({ _id: mongodb.ObjectId(id) });

    res.render("user/checkout", {
      title: "CheckOut",
      user: true,
      CheckOutProducts,
      useraddress,
      id,
    });
  },

  //----------POST Delete Product from cart-------------//

  postDeleteCartProduct: async (req, res) => {
    try {
      const productId = req.body.productId;
      const userId = req.user;
      // console.log({ productId, userId });
      const deletedProduct = await db
        .getdb()
        .collection(collection.CART_DATA)
        .updateOne(
          {
            userId: mongodb.ObjectId(userId),
            "products.productId": mongodb.ObjectId(productId),
          },
          { $pull: { products: { productId: mongodb.ObjectId(productId) } } }
        );
      return res.status(200).json({
        status: "success",
        message: "Product deleted from cart!",
      });
    } catch (error) {
      console.log(error);
      res.status(404).json({
        status: "failed",
        message: "Error.Page Not Found",
      });
    }
  },

  //---------------POST Increment Cart Product---------------//

  Increment: async (req, res) => {
    try {
      const Id = req.params.id;
      const quantity = req.body.quantity;
      const count = req.body.count;
      const userId = req.user;
      const UpdatedValue = await db
        .getdb()
        .collection(collection.CART_DATA)
        .findOneAndUpdate(
          {
            userId: mongodb.ObjectId(userId),
            "products.productId": mongodb.ObjectId(Id),
          },
          { $inc: { "products.$.quantity": count } }
        );

      return res.status(200).json({
        status: "success",
        message: "Updated Successfully!",
      });
    } catch (error) {
      console.log(error);
      return res.status(404).json({
        status: "failed",
        message: error,
      });
    }
  },

  //----------POST ADD Address from Checkout-------------//

  add_address: async (req, res) => {
    try {
      const userId = req.user;
      // console.log(userId);
      const { name, number, district, pincode, address, state, landmark } =
        req.body;
      const data = await db
        .getdb()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { _id: mongodb.ObjectId(userId) },
          {
            $push: {
              address: {
                id: mongodb.ObjectId(),
                name: name,
                number: Number(number),
                district: district,
                pincode: Number(pincode),
                address: address,
                state: state,
                landmark: landmark,
              },
            },
          }
        );
      res.status(200).json({
        status: "success",
        message: "Address added",
      });
    } catch (error) {
      console.log(error);
      res.status(404).json({
        status: "failed",
        message: error,
      });
    }
  },

  //---------------POST Place Order---------------//

  PlaceOrder: async (req, res) => {
    try {
      const userId = req.body.userId;
      const addressId = req.body.addressId;
      const paymentMethod = req.body.paymentMethod;
      const coupon = req.body.coupon;

      // if (coupon !== "") {
      //   const coupondetails = await db
      //     .getdb()
      //     .collection(collection.COUPON_COLLECTION)
      //     .findOne({ couponCode: coupon });
      //   couponId = coupondetails._id;
      // }
      // console.log(req.body);
      const agg = [
        {
          $match: {
            userId: mongodb.ObjectId(userId),
          },
        },
        {
          $unwind: {
            path: "$products",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $lookup: {
            from: "Products",
            localField: "products.productId",
            foreignField: "_id",
            as: "product_details",
          },
        },
        {
          $project: {
            userId: "$userId",
            products: "$products",
            product: {
              $arrayElemAt: ["$product_details", 0],
            },
          },
        },
        {
          $group: {
            _id: "$userId",
            products: {
              $push: {
                product_details: "$product",
                quantity: "$products.quantity",
                subTotal: {
                  $sum: {
                    $multiply: ["$products.quantity", "$product.originalprice"],
                  },
                },
              },
            },
            total: {
              $sum: {
                $multiply: ["$products.quantity", "$product.discountprice"],
              },
            },
          },
        },
      ];

      const CartDetails = await db
        .getdb()
        .collection(collection.CART_DATA)
        .aggregate(agg)
        .toArray();

      const addressData = [
        {
          $match: {
            _id: mongodb.ObjectId(userId),
          },
        },
        {
          $unwind: {
            path: "$address",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: {
            "address.id": mongodb.ObjectId(addressId),
          },
        },
        {
          $project: {
            address: 1,
            _id: 0,
          },
        },
      ];

      const Address_Details = await db
        .getdb()
        .collection(collection.USER_COLLECTION)
        .aggregate(addressData)
        .toArray();

      let TotalAmount = CartDetails[0].total;
      // console.log(TotalAmount);
      let discount;
      let discountPrice;
      let couponId;

      if (coupon !== "") {
        //----------Adding users to coupon collections----------//

        const coupondetails = await db
          .getdb()
          .collection(collection.COUPON_COLLECTION)
          .findOne({ couponCode: coupon });

        if (coupondetails) {
          const user = await db
            .getdb()
            .collection(collection.COUPON_COLLECTION)
            .findOne({
              _id: mongodb.ObjectId(coupondetails._id),
              users: { $elemMatch: { userId: mongodb.ObjectId(userId) } },
            });
          // console.log(user);
          if (user) {
            TotalAmount = CartDetails[0].total;
          } else {
            if (new Date() >= coupondetails.date) {
              TotalAmount = CartDetails[0].total;
            } else {
              couponId = coupondetails._id;
              discount = coupondetails.discount;
              discountPrice = (TotalAmount * discount) / 100;
              TotalAmount = TotalAmount - discountPrice;
              TotalAmount = Math.floor(TotalAmount);
            }
          }
        } else {
          TotalAmount = CartDetails[0].total;
        }

        // couponId = coupondetails._id;
        // discount = coupondetails.discount;
        // discountPrice = (TotalAmount * discount) / 100;
        // TotalAmount = TotalAmount - discountPrice;
        // TotalAmount = Math.floor(TotalAmount);

        await db
          .getdb()
          .collection(collection.COUPON_COLLECTION)
          .updateOne(
            { _id: mongodb.ObjectId(couponId) },
            { $push: { users: { userId: mongodb.ObjectId(userId) } } }
          );

        // const couponCode = await db
        //   .getdb()
        //   .collection(collection.COUPON_COLLECTION)
        //   .findOne({ couponCode: coupon });
        // discount = couponCode.discount;
        // discountPrice = (TotalAmount * discount) / 100;
        // TotalAmount = TotalAmount - discountPrice;
        // TotalAmount = Math.floor(TotalAmount);
      } else {
        TotalAmount = CartDetails[0].total;
      }

      const OrderDetails = {
        orderId: mongodb.ObjectId(),
        userId: mongodb.ObjectId(userId),
        Address: Address_Details[0].address,
        Payment: paymentMethod,
        OrderStatus: "Confirmed",
        Products: CartDetails[0].products,
        TotalPrice: TotalAmount,
        Date: new Date(),
        cancel: false,
      };

      // Delete Cart Products after checkout

      await db
        .getdb()
        .collection(collection.CART_DATA)
        .deleteOne({ userId: mongodb.ObjectId(userId) });

      if (paymentMethod == "RAZORPAY") {
        OrderDetails.OrderStatus = "Pending";
        // OrderDetails.cancel = true;

        const Order_details = await db
          .getdb()
          .collection(collection.ORDER_COLLECTION)
          .insertOne(OrderDetails);

        // console.log("first");
        const instance = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_SECRET_KEY,
        });
        var options = {
          amount: (OrderDetails.TotalPrice * 100).toString(), // amount in the smallest currency unit
          currency: "INR",
          receipt: Order_details.insertedId.toString(),
        };

        let Order = await instance.orders.create(options);
        console.log(Order);

        res.json({
          status: "Razorpay",
          Order,
        });
      } else if (paymentMethod == "PAYPAL") {
        OrderDetails.OrderStatus = "Confirmed";

        const Order_details = await db
          .getdb()
          .collection(collection.ORDER_COLLECTION)
          .insertOne(OrderDetails);

        const ProductInventory = [
          {
            $match: {
              _id: mongodb.ObjectId(Order_details.insertedId),
            },
          },
          {
            $unwind: {
              path: "$Products",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              productId: "$Products.product_details._id",
              quantity: "$Products.quantity",
            },
          },
        ];

        const StockChange = await db
          .getdb()
          .collection(collection.ORDER_COLLECTION)
          .aggregate(ProductInventory)
          .toArray();

        StockChange.map(async (data) => {
          let Id = data.productId;
          let quantity = data.quantity;

          const change = await db
            .getdb()
            .collection(collection.PRODUCT_COLLECTION)
            .updateOne(
              { _id: mongodb.ObjectId(Id) },
              { $inc: { stock: -quantity } }
            );
        });

        var create_payment_json = {
          intent: "sale",
          payer: {
            payment_method: "paypal",
          },
          redirect_urls: {
            return_url: "http://localhost:3000/success",
            cancel_url: "http://localhost:3000/checkout",
          },
          transactions: [
            {
              item_list: {
                items: [
                  {
                    name: "item",
                    sku: "item",
                    price:
                      Math.floor((OrderDetails.TotalPrice / 81) * 100) / 100,
                    currency: "USD",
                    quantity: 1,
                  },
                ],
              },
              amount: {
                currency: "USD",
                total: Math.floor((OrderDetails.TotalPrice / 81) * 100) / 100,
              },
              description: "This is the payment description.",
            },
          ],
        };

        paypal.payment.create(create_payment_json, function (error, payment) {
          if (error) {
            console.log("I reached the error");
            throw error;
          } else {
            for (let i = 0; i < payment.links.length; i++) {
              if (payment.links[i].rel === "approval_url") {
                // console.log(payment.links[i].rel === "approval_url");

                res.json({
                  status: "paypal",
                  RedirectLink: payment.links[i].href,
                });
              }
            }
          }
        });
      } else if (paymentMethod == "WALLET") {
        const walletData = await db
          .getdb()
          .collection(collection.WALLET_COLLECTION)
          .findOne({ userId: mongodb.ObjectId(userId) });
        if (TotalAmount > walletData.TotalAmount) {
          return res.status(400).json({
            status: "no-fund",
            message: "The Wallet doesn't have enough money!",
          });
        } else {
          const WalletMoneyChange = await db
            .getdb()
            .collection(collection.WALLET_COLLECTION)
            .updateOne(
              { userId: mongodb.ObjectId(userId) },
              { $inc: { TotalAmount: -TotalAmount } }
            );

          const Order_details = await db
            .getdb()
            .collection(collection.ORDER_COLLECTION)
            .insertOne(OrderDetails);

          const ProductInventory = [
            {
              $match: {
                _id: mongodb.ObjectId(Order_details.insertedId),
              },
            },
            {
              $unwind: {
                path: "$Products",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                productId: "$Products.product_details._id",
                quantity: "$Products.quantity",
              },
            },
          ];

          const StockChange = await db
            .getdb()
            .collection(collection.ORDER_COLLECTION)
            .aggregate(ProductInventory)
            .toArray();

          StockChange.map(async (data) => {
            let Id = data.productId;
            let quantity = data.quantity;

            const change = await db
              .getdb()
              .collection(collection.PRODUCT_COLLECTION)
              .updateOne(
                { _id: mongodb.ObjectId(Id) },
                { $inc: { stock: -quantity } }
              );
          });

          return res.status(200).json({
            status: "success",
            message: "Order Placed with Wallet Money",
          });
        }
      } else if (paymentMethod == "COD") {
        const Order_details = await db
          .getdb()
          .collection(collection.ORDER_COLLECTION)
          .insertOne(OrderDetails);

        const ProductInventory = [
          {
            $match: {
              _id: mongodb.ObjectId(Order_details.insertedId),
            },
          },
          {
            $unwind: {
              path: "$Products",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              productId: "$Products.product_details._id",
              quantity: "$Products.quantity",
            },
          },
        ];

        const StockChange = await db
          .getdb()
          .collection(collection.ORDER_COLLECTION)
          .aggregate(ProductInventory)
          .toArray();

        StockChange.map(async (data) => {
          let Id = data.productId;
          let quantity = data.quantity;

          const change = await db
            .getdb()
            .collection(collection.PRODUCT_COLLECTION)
            .updateOne(
              { _id: mongodb.ObjectId(Id) },
              { $inc: { stock: -quantity } }
            );
        });
        return res.status(200).json({
          status: "success",
          message: "Order Placed!",
        });
      }
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "failed",
        message: error,
      });
    }
  },

  //---------------GET Order Details Page---------------//

  ViewOrder: async (req, res) => {
    try {
      const orderId = req.params.id;
      const OrderDetails = await db
        .getdb()
        .collection(collection.ORDER_COLLECTION)
        .findOne({ _id: mongodb.ObjectId(orderId) });
      res.render("user/orderDetails", {
        title: "Order Details",
        user: true,
        OrderDetails,
        orderId,
      });
    } catch (error) {
      console.log(error);
    }
  },

  //---------------Cancel full Order User Side---------------//

  CancelOrder: async (req, res) => {
    try {
      const orderId = req.body.OrderId;
      const userId = req.user;

      const ProductInventory = [
        {
          $match: {
            _id: mongodb.ObjectId(orderId),
          },
        },
        {
          $unwind: {
            path: "$Products",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            productId: "$Products.product_details._id",
            quantity: "$Products.quantity",
          },
        },
      ];

      const StockChange = await db
        .getdb()
        .collection(collection.ORDER_COLLECTION)
        .aggregate(ProductInventory)
        .toArray();

      StockChange.map(async (data) => {
        let Id = data.productId;
        let quantity = data.quantity;

        const change = await db
          .getdb()
          .collection(collection.PRODUCT_COLLECTION)
          .updateOne(
            { _id: mongodb.ObjectId(Id) },
            { $inc: { stock: -quantity } }
          );
      });

      const OrderDetails = await db
        .getdb()
        .collection(collection.ORDER_COLLECTION)
        .findOne({ _id: mongodb.ObjectId(orderId) });

      // console.log(OrderDetails.TotalPrice);

      const checkWallet = await db
        .getdb()
        .collection(collection.WALLET_COLLECTION)
        .findOne({ userId: mongodb.ObjectId(userId) });
      // console.log(checkWallet);

      if (OrderDetails.Payment !== "COD") {
        if (checkWallet) {
          const updateWallet = await db
            .getdb()
            .collection(collection.WALLET_COLLECTION)
            .updateOne(
              { userId: mongodb.ObjectId(userId) },
              {
                $inc: { TotalAmount: OrderDetails.TotalPrice },

                $push: {
                  transactions: {
                    amount: OrderDetails.TotalPrice,
                    date: commonController.date(),
                    type: "Refund",
                    transaction: "Credit",
                    Id: new mongodb.ObjectId(),
                  },
                },
              }
            );
        } else {
          const wallet = await db
            .getdb()
            .collection(collection.WALLET_COLLECTION)
            .insertOne({
              userId: mongodb.ObjectId(userId),
              TotalAmount: OrderDetails.TotalPrice,
              transactions: [
                {
                  amount: OrderDetails.TotalPrice,
                  date: commonController.date(),
                  type: "Refund",
                  transaction: "Credit",
                  Id: new mongodb.ObjectId(),
                },
              ],
            });
        }
      }

      const Cancelled = await db
        .getdb()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          { _id: mongodb.ObjectId(orderId) },
          { $set: { OrderStatus: "Cancelled", cancel: true } }
        );
      res.status(200).json({
        status: "success",
        message: "Order Cancelled",
      });
    } catch (error) {
      console.log(error);
    }
  },

  //---------------Cancel Each Prodcuts from Orders---------------//

  cancelProductFromOrder: async (req, res) => {
    try {
      // console.log(req.body);
      const orderId = req.body.orderId;
      const ProId = req.body.ProId;
      const Cancel_Product = await db
        .getdb()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          {
            _id: mongodb.ObjectId(orderId),
            "Products.product_details._id": mongodb.ObjectId(ProId),
          },
          {
            $set: {
              Products: {
                product_details: { status: { cancel_product: true } },
              },
            },
          },
          { upsert: true }
        );
      // console.log(Cancel_Product);
    } catch (error) {
      console.log(error);
    }
  },

  EditUser: async (req, res) => {
    try {
      // console.log("Entered The function");
      // console.log(req.body);
      const { name, email, number } = req.body;
      const userId = req.params.id;
      const Edit_User = await db
        .getdb()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { _id: mongodb.ObjectId(userId) },
          { $set: { name: name, email: email, number: number } }
        );
      res.redirect("/profile");
    } catch (error) {
      console.log(error);
    }
  },

  ChangePassword: (req, res) => {
    res.render("user/changePassword", { title: "Change Password", user: true });
  },

  //-------------------POST EDIT Password--------------------//

  PostPasswordChange: async (req, res) => {
    try {
      // console.log("Hi im here");
      const newpass = req.body.newpass;
      const current = req.body.current;
      // console.log(current);
      const userId = req.user;
      const user = await db
        .getdb()
        .collection(collection.USER_COLLECTION)
        .findOne({ _id: mongodb.ObjectId(userId) });
      const ComparePassword = await bcrypt.compare(current, user.password);
      // console.log(ComparePassword);
      if (ComparePassword) {
        const hashedpassword = await bcrypt.hash(newpass, 10);
        // console.log("first");
        const change = await db
          .getdb()
          .collection(collection.USER_COLLECTION)
          .updateOne(
            { _id: mongodb.ObjectId(userId) },
            { $set: { password: hashedpassword } }
          );
        // console.log(change);

        return res.status(200).json({
          status: "success",
          message: "Password Changed",
        });
      } else {
        return res.status(200).json({
          status: "missmatch",
          message: "Current Password doesnt match ",
        });
      }
    } catch (error) {
      console.log(error);
    }
  },

  // PostAddressChange: async (req, res) => {
  //   try {
  //     const userId = req.user;
  //     const addressId = req.body.addressId;
  //     const data = await db
  //       .getdb()
  //       .collection(collection.USER_COLLECTION)
  //       .findOne({
  //         _id: mongodb.ObjectId(userId),
  //         "address.id": mongodb.ObjectId(addressId),
  //       });
  //     console.log(data)
  //     const change = await db.getdb
  //   } catch (error) {
  //     console.log(error);
  //   }
  // },

  DeleteAddress: async (req, res) => {
    try {
      const userId = req.user;
      const addressId = req.body.addressId;
      console.log(addressId);
      // console.log(first);
      const data = await db
        .getdb()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          {
            _id: mongodb.ObjectId(userId),
          },
          {
            $pull: {
              address: { $elemMatch: { id: mongodb.ObjectId(addressId) } },
            },
          }
        );
      // console.log(data);
      return res.status(200).json({
        status: "success",
        message: "address deleted",
      });
    } catch (error) {
      console.log(error);
    }
  },

  //-------------------POST VERIFY PAYMENT--------------------//

  VerifyPayment: async (req, res) => {
    try {
      const Id = mongodb.ObjectId(req.body.order.receipt);

      const paymentId = req.body.payment.razorpay_payment_id;

      const orderId = req.body.payment.razorpay_order_id;

      const signature = req.body.payment.razorpay_signature;

      const crypto = require("crypto");
      let hmac = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET_KEY);
      hmac.update(orderId + "|" + paymentId);
      hmac = hmac.digest("hex");

      if (hmac == signature) {
        const ProductInventory = [
          {
            $match: {
              _id: mongodb.ObjectId(Id),
            },
          },
          {
            $unwind: {
              path: "$Products",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              productId: "$Products.product_details._id",
              quantity: "$Products.quantity",
            },
          },
        ];

        const StockChange = await db
          .getdb()
          .collection(collection.ORDER_COLLECTION)
          .aggregate(ProductInventory)
          .toArray();

        StockChange.map(async (data) => {
          let Id = data.productId;
          let quantity = data.quantity;

          const change = await db
            .getdb()
            .collection(collection.PRODUCT_COLLECTION)
            .updateOne(
              { _id: mongodb.ObjectId(Id) },
              { $inc: { stock: -quantity } }
            );
        });

        await db
          .getdb()
          .collection(collection.ORDER_COLLECTION)
          .updateOne(
            { _id: mongodb.ObjectId(Id) },
            { $set: { OrderStatus: "Confirmed" } }
          );
        return res.status(200).json({
          status: "success",
          message: "Payment Successful",
        });
      } else {
        await db
          .getdb()
          .collection(collection.ORDER_COLLECTION)
          .updateOne(
            { _id: mongodb.ObjectId(Id) },
            { $set: { OrderStatus: "Failed" } }
          );
        return res.status(400).json({
          status: "failed",
          message: "Payment Failed",
        });
      }
    } catch (error) {
      console.log(error);
    }
  },

  //------------PayPal Success Route-------------//

  PaypalSuccess: (req, res) => {
    res.render("user/PayPalSuccess", { paypal: true });

    //   const payerId = req.query.PayerID;
    //   const paymentId = req.query.paymentId;
    //   console.log(paymentId);
    //   console.log(payerId);
    //   const execute_payment_json = {
    //     "payer_id": payerId,
    //     "transactions": [{
    //         "amount": {
    //             "currency": "USD",
    //             "total": "1"
    //         }
    //     }]
    //   };

    //   paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
    //     if (error) {
    //         console.log(error.response);
    //         throw error;
    //     } else {
    //         console.log(JSON.stringify(payment));
    //         res.send('Success');
    //     }
    // });

    // res.render('user/PayPalSuccess')
  },

  //------module ends!------//
};
