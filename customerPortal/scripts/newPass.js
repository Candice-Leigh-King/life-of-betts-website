

document.addEventListener('DOMContentLoaded', () => {

    const storefrontAccessToken = '9231184be30a83d5acbb0e9bc70d4823'; 
    const graphqlEndpoint = 'https://life-of-betts.myshopify.com/api/2024-07/graphql.json';

    const loginForm = document.getElementById('loginForm');
    const loginErrorElement = document.getElementById('loginError');
    

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        const resetUrlString = urlParams.get('reset_url');        
        
        const password1 = document.getElementById('password1').value;
        const password2 = document.getElementById('password2').value;

        if (!password1 || !password2) {
            loginErrorElement.textContent = 'Please enter a new password in both fields.';
            loginErrorElement.style.display = 'block';
            return;
        }

        if (password1 !== password2) {
            loginErrorElement.textContent = 'Please enter the same password in both fields.';
            loginErrorElement.style.display = 'block';
            return;
        }

        const mutation =
            `mutation customerResetByUrl($resetUrl: URL!, $password: String!) {
                customerResetByUrl(resetUrl: $resetUrl, password: $password) {
                    customer {
                        id
                    }
                    customerUserErrors {
                        code
                        field
                        message
                    }
                }
            }
        `;

        const variables = {
            resetUrl: resetUrlString,
            password: password1
        };

        try {
            const response = await fetch(graphqlEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
                },
                body: JSON.stringify({ query: mutation, variables }),
            });

            const data = await response.json();

            console.log(data);

            if (data.errors) {
                console.error('GraphQL Errors:', data.errors);
                const errorMessage = data.errors.map(err => err.message).join(', ');
                // Assuming 'loginErrorElement' is for the reset password form
                loginErrorElement.textContent = 'An unexpected error occurred: ' + errorMessage;
                loginErrorElement.style.display = 'block';
                return { success: false, errors: data.errors };
            }

            // Check for specific customerUserErrors from Shopify's business logic
            if (data.data && data.data.customerResetByUrl && data.data.customerResetByUrl.customerUserErrors.length > 0) {
                console.error("Shopify Customer User Errors:", data.data.customerResetByUrl.customerUserErrors);
                const shopifyErrorMessage = data.data.customerResetByUrl.customerUserErrors
                    .map(error => error.message)
                    .join(', ');
                loginErrorElement.textContent = shopifyErrorMessage;
                loginErrorElement.style.display = 'block';
                return { success: false, errors: data.data.customerResetByUrl.customerUserErrors };
            }

            // Check for successful password reset (customer ID returned)
            if (data.data && data.data.customerResetByUrl && data.data.customerResetByUrl.customer && data.data.customerResetByUrl.customer.id) {
                console.log("Password successfully reset for customer ID:", data.data.customerResetByUrl.customer.id);
                loginErrorElement.textContent = "Your password has been successfully reset. You can now log in.";
                loginErrorElement.style.display = 'block';
                // Optionally redirect to login page after a short delay
                setTimeout(() => {
                    window.location.href = 'login.html'; // Or your main login page
                }, 2000);
                return { success: true, customerId: data.data.customerResetByUrl.customer.id, message: "Password reset successful." };
            } else {
                // Fallback for unexpected successful response without customer data
                console.error("Unexpected successful response for password reset.");
                loginErrorElement.textContent = "Password reset failed due to an unexpected issue. Please try again.";
                loginErrorElement.style.display = 'block';
                return { success: false, errors: [{ message: "An unexpected error occurred." }] };
            }

        } catch (error) {
            console.error('Error during login:', error);
            loginErrorElement.textContent = 'Network error during login.';
            loginErrorElement.style.display = 'block';
        }
    });



});