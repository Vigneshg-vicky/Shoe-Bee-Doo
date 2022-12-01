async function addToWishlist(ProductId) {
  try {
    console.log("Welcome to functionb");

    const response = await axios({
      method: "post",
      url: "/add-to-wishlist",
      data: {
        ProductId,
      },
    });
    if (response.data.status == "success") {
      document.getElementById(`heart${ProductId}`).classList.remove('fa-heart-o');
      document.getElementById(`heart${ProductId}`).classList.add('fa-heart');
      console.log('hiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii')
      document.getElementById("wishlist").innerHTML = response.data.wishlist;
      document.getElementById("wishlist2").textContent = response.data.wishlist;
      console.log("hfgf"+document.getElementById("wishlist2"))

      Toastify({
        text: "Added to Wishlist",
        duration: 3000,
        gravity: "top", // `top` or `bottom`
        position: "center", // `left`, `center` or `right`
        stopOnFocus: true, // Prevents dismissing of toast on hover
        style: {
          background: "green",
        },
        onClick: function () {}, // Callback after click
      }).showToast();
    } else if (response.data.status == "found") {
      document.getElementById(`heart${ProductId}`).classList.remove('fa-heart');
      document.getElementById(`heart${ProductId}`).classList.add('fa-heart-o');
      document.getElementById("wishlist").innerHTML = response.data.wishlist;
      document.getElementById("wishlist2").innerHTML = response.data.wishlist;
      console.log("hfgf"+document.getElementById("wishlist2"))

      Toastify({
        text: "Removed wishlist",
        duration: 3000,
        gravity: "top", // `top` or `bottom`
        position: "center", // `left`, `center` or `right`
        stopOnFocus: true, // Prevents dismissing of toast on hover
        style: {
          background: "red",
        },
        onClick: function () {}, // Callback after click
      }).showToast();
    }
  } catch (error) {
    console.log(error);
  }
}
