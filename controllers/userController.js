const jwt = require("jsonwebtoken");
const db = require("../db");
const bcrypt = require("bcrypt");
const mongodb = require("mongodb");
const session = require("express-session");
const collection = require("./config/collection");
const Razorpay = require("razorpay");
const paypal = require("paypal-rest-sdk");
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
      console.log(req.body);
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

  getHomePage: (req, res) => {
    res.render("user/userHome", { title: "Home Page", user: true });
  },

  //---------------render Shop page---------------------//

  GetShopPage: async (req, res) => {
    try {
      const products = await db
        .getdb()
        .collection(collection.PRODUCT_COLLECTION)
        .find()
        .toArray();
      res.render("user/shopPage", { title: "Shop Page", user: true, products });
    } catch (error) {
      console.log(error);
    }
  },

  //---------------Render Product page---------------------//

  GetProductPage: async (req, res) => {
    try {
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
      const Productstock = await db
        .getdb()
        .collection(collection.PRODUCT_COLLECTION)
        .findOne({ _id: mongodb.ObjectId(id) });
      console.log(Productstock);
      res.render("user/ProductPage", {
        title: "Product Page",
        user: true,
        ProductData,
        Productstock,
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
    console.log(cartdetails);
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
          return res.status(200).json({
            status: "success",
            message: "Same Product added to Cart again",
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
          return res
            .status(200)
            .json({ status: "success", message: "New Product added to Cart" });
        }
      } else {
        const added = await db
          .getdb()
          .collection(collection.CART_DATA)
          .insertOne({
            userId: mongodb.ObjectId(user),
            products: [{ productId: mongodb.ObjectId(proId), quantity: 1 }],
          });
        return res
          .status(200)
          .json({ status: "success", message: "Product added to Cart" });
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
      OrderDetails.map((Data) => {
        const ConvertString = Data.Date.toString();
        Data.Date = ConvertString.split(" ").splice(1, 3).toString();
        // console.log(Data.Date);
      });

      const userData = await db
        .getdb()
        .collection(collection.USER_COLLECTION)
        .findOne({ _id: mongodb.ObjectId(userId) });

      const addressDetails = await db
        .getdb()
        .collection(collection.USER_COLLECTION)
        .findOne({ _id: mongodb.ObjectId(userId) });

      res.render("user/Profile", {
        user: true,
        OrderDetails,
        addressDetails,
        userData,
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

      res.render("user/UserWishlist", {
        title: "Wishlist",
        user: true,
        WishlistProducts,
      });
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

      console.log(wishlist_check);
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

        return res.status(200).json({
          status: "success",
          message: "Added to Wishlist",
        });
      } else {
        return res.status(200).json({
          status: "found",
          message: "Already in wishlist",
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
      console.log({ productId, userId });
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
      console.log(userId);
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
      const coupondetails = await db
        .getdb()
        .collection(collection.COUPON_COLLECTION)
        .findOne({ couponCode: coupon });
      const couponId = coupondetails._id;

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
      console.log(TotalAmount);
      let discount;
      let discountPrice;

      if (coupon !== "") {
        //----------Adding users to coupon collections----------//
        await db
          .getdb()
          .collection(collection.COUPON_COLLECTION)
          .updateOne(
            { _id: mongodb.ObjectId(couponId) },
            { $push: { users: { userId: mongodb.ObjectId(userId) } } }
          );

        const couponCode = await db
          .getdb()
          .collection(collection.COUPON_COLLECTION)
          .findOne({ couponCode: coupon });
        discount = couponCode.discount;
        console.log(discount);
        discountPrice = (TotalAmount * discount) / 100;
        TotalAmount = TotalAmount - discountPrice;
        TotalAmount = Math.floor(TotalAmount);
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

      // await db
      //   .getdb()
      //   .collection(collection.CART_DATA)
      //   .deleteOne({ userId: mongodb.ObjectId(userId) });

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
                console.log(payment.links[i].rel === "approval_url");

                res.json({
                  status: "paypal",
                  RedirectLink: payment.links[i].href,
                });
              }
            }
          }
        });
      } else if (paymentMethod == "COD") {
        const Order_details = await db
          .getdb()
          .collection(collection.ORDER_COLLECTION)
          .insertOne(OrderDetails);
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
      console.log("Cancel Order Reached");
      const orderId = req.body.OrderId;
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
      console.log(req.body);
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
      console.log(Cancel_Product);
    } catch (error) {
      console.log(error);
    }
  },

  EditUser: async (req, res) => {
    try {
      console.log("Entered The function");
      console.log(req.body);
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
      console.log("Hi im here");
      const newpass = req.body.newpass;
      const current = req.body.current;
      console.log(current);
      const userId = req.user;
      const user = await db
        .getdb()
        .collection(collection.USER_COLLECTION)
        .findOne({ _id: mongodb.ObjectId(userId) });
      const ComparePassword = await bcrypt.compare(current, user.password);
      console.log(ComparePassword);
      if (ComparePassword) {
        const hashedpassword = await bcrypt.hash(newpass, 10);
        console.log("first");
        const change = await db
          .getdb()
          .collection(collection.USER_COLLECTION)
          .updateOne(
            { _id: mongodb.ObjectId(userId) },
            { $set: { password: hashedpassword } }
          );
        console.log(change);

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
      const data = await db
        .getdb()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          {
            _id: mongodb.ObjectId(userId),
            "address.id": mongodb.ObjectId(addressId),
          },
          {
            $pull: {
              address: { $elemMatch: { id: mongodb.ObjectId(addressId) } },
            },
          }
        );
      console.log(data);
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
      const Id = req.body.order.receipt;
      const paymentId = req.body.payment.razorpay_payment_id;
      const orderId = req.body.payment.razorpay_order_id;
      const signature = req.body.payment.razorpay_signature;
      const crypto = require("crypto");
      let hmac = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET_KEY);
      hmac.update(orderId + "|" + paymentId);
      hmac = hmac.digest("hex");
      if (hmac == signature) {
        await db
          .getdb()
          .collection(collection.ORDER_COLLECTION)
          .updateOne(
            { _id: mongodb.ObjectId(Id) },
            { $set: { OrderStatus: "Confirmed" } }
          );
        res.status(200).json({
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
        res.status(400).json({
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
