async function addToWishlist(ProductId) {
  try {
    console.log("Welcome to functionb")
  
    const response = await axios({
      method: "post",
      url: "/add-to-wishlist",
      data: {
        ProductId,
      },
    });
    if (response.data.status == "success") {
      // classList.remove("icon-heart");
      // document.getElementById('heart').textContent="❤️"
        Toastify({
            text: "Added to Wishlist",
            duration: 3000,
            gravity: "top", // `top` or `bottom`
            position: "center", // `left`, `center` or `right`
            stopOnFocus: true, // Prevents dismissing of toast on hover
            style: {
                background: "red",
            },
            onClick: function () { } // Callback after click
        }).showToast();    
    }
    else if(response.data.status == 'found'){
      Toastify({
        text: "Already in wishlist",
        duration: 3000,
        gravity: "top", // `top` or `bottom`
        position: "center", // `left`, `center` or `right`
        stopOnFocus: true, // Prevents dismissing of toast on hover
        style: {
            background: "red",
        },
        onClick: function () { } // Callback after click
    }).showToast();    
    }
  } catch (error) {
    console.log(error);
  }
}
