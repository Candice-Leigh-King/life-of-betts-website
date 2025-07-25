

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
                loginErrorElement.textContent = 'An unexpected error occurred.';
                loginErrorElement.style.display = 'block';
                return;
            }

            // Check for customerUserErrors from the Shopify API
            if (data.data && data.data.customerResetByUrl && data.data.customerResetByUrl.customerUserErrors.length > 0) {
                console.error("Shopify Customer User Errors:", data.data.customerResetByUrl.customerUserErrors);
            }

            if (data.data?.customerAccessTokenCreate?.customerAccessToken) {
                const accessToken = data.data.customerAccessTokenCreate.customerAccessToken.accessToken;
                localStorage.setItem('shopifyCustomerAccessToken', accessToken);
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            }
            else if (data.data?.customerAccessTokenCreate?.customerUserErrors?.length > 0) {
                const errorMessage = data.data.customerAccessTokenCreate.customerUserErrors
                    .map(error => error.message)
                    .join(', ');
                loginErrorElement.textContent = errorMessage;
                loginErrorElement.style.display = 'block';
            } else {
                loginErrorElement.textContent = 'Password Reset failed. Please try again.';
                loginErrorElement.style.display = 'block';
            }
        } catch (error) {
            console.error('Error during login:', error);
            loginErrorElement.textContent = 'Network error during login.';
            loginErrorElement.style.display = 'block';
        }
    });



});