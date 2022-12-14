async function AddToCart(proId) {
    try {
        console.log(proId)
        const id = proId;
        const response = await axios({
            method: 'post',
            url: '/add-to-cart',
            data: {
                id
            }
        })
        if (response.data.status == 'success') {
            document.getElementById('cart').innerHTML = response.data.cart;
            
            document.getElementById('cart2').textContent = response.data.cart;

            Toastify({
                text: "Added to Cart",
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