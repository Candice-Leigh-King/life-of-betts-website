
document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');
    const signupErrorElement = document.getElementById('signupError');
    const signupSuccessElement = document.getElementById('signupSuccess');
    const storefrontAccessToken = '9231184be30a83d5acbb0e9bc70d4823'; 
    const graphqlEndpoint = 'https://life-of-betts.myshopify.com/api/2025-04/graphql.json'; 

    signupForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (!firstName || !lastName || !email || !password) {
            signupErrorElement.textContent = 'Please fill in all fields.';
            signupErrorElement.style.display = 'block';
            signupSuccessElement.style.display = 'none';
            return;
        }

        const mutation = `
            mutation customerCreate($input: CustomerCreateInput!) {
                customerCreate(input: $input) {
                    customer {
                        id
                        email
                        firstName
                        lastName
                    }
                    customerUserErrors {
                        field
                        message
                    }
                }
            }
        `;

        const variables = {
            input: {
                firstName: firstName,
                lastName: lastName,
                email: email,
                password: password,
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
                signupErrorElement.textContent = 'An unexpected error occurred.';
                signupErrorElement.style.display = 'block';
                signupSuccessElement.style.display = 'none';
                return;
            }

            if (data.data?.customerCreate?.customer) {
                console.log('Customer created:', data.data.customerCreate.customer);
                signupSuccessElement.textContent = 'Account created successfully! You can now log in.';
                signupSuccessElement.style.display = 'block';
                signupErrorElement.style.display = 'none';

                const customerID = data.data.customerCreate.customer.id;

                localStorage.setItem('shopifyCustomerId', customerID);

                // Optionally redirect to the login page after a short delay
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else if (data.data?.customerCreate?.customerUserErrors?.length > 0) {
                const errorMessage = data.data.customerCreate.customerUserErrors
                    .map(error => error.message)
                    .join(', ');
                signupErrorElement.textContent = errorMessage;
                signupErrorElement.style.display = 'block';
                signupSuccessElement.style.display = 'none';
            } else {
                signupErrorElement.textContent = 'Signup failed for an unknown reason.';
                signupErrorElement.style.display = 'block';
                signupSuccessElement.style.display = 'none';
            }
        } catch (error) {
            console.error('Error during signup:', error);
            signupErrorElement.textContent = 'Network error during signup.';
            signupErrorElement.style.display = 'block';
            signupSuccessElement.style.display = 'none';
        }
    });

    // backToWebsiteBtn btn
    document.getElementById('backToWebsiteBtn').addEventListener('click', async (event) => {
        window.location.href = '/';
    });

});