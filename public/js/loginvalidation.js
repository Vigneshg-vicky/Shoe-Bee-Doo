// Validation

$(document).ready(function () {
  $("#submit-form").validate({
    rules: {
      email: {
        required: true,
      },
      password: {
        required: true,
      },
    },
    messages: {
      email: {
        required: "Enter a valid email address",
      },
      password: {
        required: "Enter your password",
      },
    },
    submitHandler: function (form, e) {
      login();
    },
  });
});

// -----------------AXIOS-------------------//

const login = async function () {
  try {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const response = await axios({
      method: "post",
      url: "/login",
      data: {
        email,
        password,
      },
    });
    //console.log(response.data)
    if (response.data.status == "success") {
      location.assign("/home");
    }
  } catch (error) {
    //console.log({error});
    document.getElementById("error").innerHTML = error.response.data.message;
    window.addEventListener("click", () => {
      document.getElementById("error").innerHTML = "";
    });
  }
};
