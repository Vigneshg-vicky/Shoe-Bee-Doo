// <!-- Validation -->


	$(document).ready(function () {
		$("#submit-form").validate({
			rules: {
				name: {
					required: true,
					minlength: 6,
				},
				email: {
					required: true,

				},
				number: {
					required: true,
					digits: true,
					minlength: 10,
					maxlength: 10,
				},
				password: {
					required: true,
					minlength: 2,
					maxlength: 12,

				},
			},
			messages: {
				name: {
					required: "Please enter your Username",
					minlength: 'Minimum of 6 letters!',
				},
				email: {
					required: "Enter a valid email address",
				},
				password: {
					required: "Enter your password",
					minlength: 'Minimum length is 7 characters!',
					maxlength: 'Maximum length is 12 characters!',

				},
				number: {
					required: "Enter your Mobile Number",
					minlength: "Enter 10 digits",
					maxlength: "Enter 10 digits",
				},
				confirm_password: {
						required: "Re-enter the password",
	
					}, 

			},
			submitHandler: function (form, e) {

				signup();
			},
		});
	});

	// -----------------AXIOS-------------------//


	async function signup() {
		try {


			const name = document.getElementById('name').value;
			const email = document.getElementById('email').value;
			const number = document.getElementById('number').value;
			const password = document.getElementById('password').value;
			const confirm_password = document.getElementById('confirm_password').value;
			const response = await axios({
				method: 'post',
				url: '/signup',
				data: {
					name,
					email,
					number,
					password,
					confirm_password,
				}
			})
			console.log(response);
			if (response.data.status == 'success') {
				location.assign('/home');
			}
		}
		catch (error) {
			document.getElementById('error').innerHTML = error.response.data.message;
			window.addEventListener('click', () => {
				document.getElementById('error').innerHTML = "";
			})
		}
	}

