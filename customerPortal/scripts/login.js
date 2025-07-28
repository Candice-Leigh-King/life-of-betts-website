document.addEventListener('DOMContentLoaded', () => {

    const storefrontAccessToken = '9231184be30a83d5acbb0e9bc70d4823'; 
    const graphqlEndpoint = 'https://life-of-betts.myshopify.com/api/2024-07/graphql.json';

    const loginForm = document.getElementById('loginForm');
    const loginErrorElement = document.getElementById('loginError');

    const urlParams = new URLSearchParams(window.location.search);
    let activationUrl = urlParams.get('activation_url');

    const CUSTOMER_ACCESS_TOKEN_CREATE =
        `mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
            customerAccessTokenCreate(input: $input) {
                customerAccessToken {
                    accessToken
                    expiresAt
                }
                customerUserErrors {
                    field
                    message
                }
            }
        }
    `;

    // GraphQL Mutation for Customer Activation by URL
    const CUSTOMER_ACTIVATE_BY_URL_MUTATION = `
        mutation customerActivateByUrl($activationUrl: URL!, $password: String!) {
            customerActivateByUrl(activationUrl: $activationUrl, password: $password) {
                customer {
                    id
                    firstName
                    lastName
                    email
                }
                customerAccessToken {
                    accessToken
                    expiresAt
                }
                customerUserErrors {
                    code
                    field
                    message
                }
            }
        }
    `;

    async function login() {

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        let variables, mutation;

        if (!email || !password) {
            loginErrorElement.textContent = 'Please enter both email and password.';
            loginErrorElement.style.display = 'block';
            return;
        }        

        if(activationUrl) {    

            // activating account (first time login)
            variables = {
                activationUrl: activationUrl,
                password: password
            };

            mutation = CUSTOMER_ACTIVATE_BY_URL_MUTATION;
    
        }
        else{

            // standard login
            variables = {
                input: {
                    email: email,
                    password: password,
                },
            };

            mutation = CUSTOMER_ACCESS_TOKEN_CREATE;

        }

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

            if (data.data?.customerAccessTokenCreate?.customerAccessToken || data.data?.customerActivateByUrl?.customerAccessToken) {
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
            }
            else if (data.data?.customerActivateByUrl?.customerUserErrors?.length > 0) {
                    const errorMessage = data.data.customerActivateByUrl.customerUserErrors
                    .map(error => error.message)
                    .join(', ');
                loginErrorElement.textContent = errorMessage;
                loginErrorElement.style.display = 'block';

                if(data.data.customerActivateByUrl.customerUserErrors[0].code === "ALREADY_ENABLED") {
                    activationUrl = "";
                    login();
                }

            }
            else {
                loginErrorElement.textContent = 'Login failed. Please check your credentials.';
                loginErrorElement.style.display = 'block';
            }
        } catch (error) {
            console.error('Error during login:', error);
            loginErrorElement.textContent = 'Network error during login.';
            loginErrorElement.style.display = 'block';
        }

    }

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        login();        
    });

});