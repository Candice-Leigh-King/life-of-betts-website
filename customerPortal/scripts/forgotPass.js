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
            input: {
                email: email
            },
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
                console.error('GraphQL Errors:', data.errors);
                loginErrorElement.textContent = 'An unexpected error occurred.';
                loginErrorElement.style.display = 'block';
                return;
            }

            if (data.data?.customerAccessTokenCreate?.customerAccessToken) {
                const accessToken = data.data.customerAccessTokenCreate.customerAccessToken.accessToken;
                localStorage.setItem('shopifyCustomerAccessToken', accessToken);
                setTimeout(() => {
                    window.location.href = 'home.html';
                }, 2000);
            }
            else if (data.data?.customerAccessTokenCreate?.customerUserErrors?.length > 0) {
                const errorMessage = data.data.customerAccessTokenCreate.customerUserErrors
                    .map(error => error.message)
                    .join(', ');
                loginErrorElement.textContent = errorMessage;
                loginErrorElement.style.display = 'block';
            } else {
                loginErrorElement.textContent = 'Login failed. Please check your credentials.';
                loginErrorElement.style.display = 'block';
            }
        } catch (error) {
            console.error('Error during login:', error);
            loginErrorElement.textContent = 'Network error during login.';
            loginErrorElement.style.display = 'block';
        }
    });



});