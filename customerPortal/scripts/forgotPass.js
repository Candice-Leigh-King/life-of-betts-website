document.addEventListener('DOMContentLoaded', () => {

    const storefrontAccessToken = '9231184be30a83d5acbb0e9bc70d4823'; 
    const graphqlEndpoint = 'https://life-of-betts.myshopify.com/api/2024-07/graphql.json';

    const loginForm = document.getElementById('loginForm');
    const loginErrorElement = document.getElementById('loginError');
    

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const email = document.getElementById('email').value;

        if (!email) {
            loginErrorElement.textContent = 'Please enter an email address.';
            loginErrorElement.style.display = 'block';
            return;
        }

        const mutation =
            `mutation customerRecover($email: String!) {
                customerRecover(email: $email) {
                    customerUserErrors {
                    code
                    field
                    message
                    }
                }
            }
        `;
        

        const variables = {
            email: email
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

            if (data.errors) {
                // These are GraphQL server-level errors (e.g., syntax error in query, network issue)
                console.error('GraphQL Errors:', data.errors);
                const errorMessage = data.errors.map(err => err.message).join(', ');
                // Assuming 'loginErrorElement' is an element to display errors for the forgot password form
                loginErrorElement.textContent = 'An unexpected error occurred: ' + errorMessage;
                loginErrorElement.style.display = 'block';
                return { success: false, errors: data.errors }; // Return for function caller
            }

            // Check for specific customerUserErrors from Shopify's business logic
            if (data.data && data.data.customerRecover && data.data.customerRecover.customerUserErrors.length > 0) {
                console.error("Shopify Customer User Errors:", data.data.customerRecover.customerUserErrors);
                const shopifyErrorMessage = data.data.customerRecover.customerUserErrors
                    .map(error => error.message)
                    .join(', ');
                loginErrorElement.textContent = shopifyErrorMessage;
                loginErrorElement.style.display = 'block';
                return { success: false, errors: data.data.customerRecover.customerUserErrors }; // Return for function caller
            }

            // If we reach here, no errors were returned, meaning the request was successful
            // Shopify will often send the email even if the account doesn't exist, to prevent enumeration.
            // So, the success message should be generic.
            loginErrorElement.textContent = "If an account exists for that email, a password reset link has been sent.";
            loginErrorElement.style.display = 'block';
            return { success: true, message: "Password reset email sent." };

        } catch (error) {
            console.error('Error during login:', error);
            loginErrorElement.textContent = 'Network error during login.';
            loginErrorElement.style.display = 'block';
        }
    });



});