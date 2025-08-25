
document.addEventListener('DOMContentLoaded', () => {

    const storefrontAccessToken = '9231184be30a83d5acbb0e9bc70d4823'; 
    const graphqlEndpoint = 'https://life-of-betts.myshopify.com/api/2024-07/graphql.json';

    const productListContainer = document.getElementById('productList');

    const customerAccessToken = localStorage.getItem('shopifyCustomerAccessToken');

    const loadingOverlay = document.getElementById('loadingOverlay');
    const startLoadingButton = document.getElementById('startLoading');
    const stopLoadingButton = document.getElementById('stopLoading');

    let formattedCollections = {};

    // check if logged in
    if (!customerAccessToken) {
        window.location.href = 'login.html';
        return;
    }

    function startLoading() {
        loadingOverlay.style.display = 'flex';
    }

    function stopLoading() {
        loadingOverlay.style.display = 'none';
    }

    async function shopifyGraphQLRequest(query, variables = {}) {
        try {
            const response = await fetch(graphqlEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
            },
            body: JSON.stringify({ query, variables }),
            });

            if (!response.ok) {
                const errorBody = await response.json();
                console.error('Shopify GraphQL Request Error:', response.status, response.statusText, errorBody);
                throw new Error(`Shopify GraphQL Request Failed: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            return data;

        } catch (error) {
            console.error('Shopify GraphQL Request Error:', error);
            throw error;
        }
    }
    async function getCollections() {

        startLoading();

        try {
            // 1. Fetch all products (handle pagination)
            let allCollections = [];
            let hasNextPage = true;
            let cursor = null;

            while (hasNextPage) {

                const getAllProductsQuery = `
                    query {
                        collections(first: 10) {
                            edges {
                                node {
                                    id
                                    title
                                    handle
                                    products(first: 100) {
                                        edges {
                                            node {
                                                id
                                                title
                                                handle
                                                featuredImage {
                                                    url
                                                }
                                                metafields(identifiers: [{ namespace: "custom", key: "buyNowLink" }, { namespace: "custom", key: "pdfLink" }]) {
                                                    value
                                                    key
                                                    namespace
                                                }
                                            }
                                        }
                                        pageInfo {
                                            hasNextPage
                                        }
                                    }
                                }
                            }
                            pageInfo {
                                hasNextPage
                            }
                        }
                    }
                `;
                
                const variables = { cursor };
                const collectionsData = await shopifyGraphQLRequest(getAllProductsQuery, variables);                

                if (collectionsData.data?.collections?.edges) {

                    collectionsData.data.collections.edges.map( collection => { 
                        if(collection.node.handle !== "frontpage" || collection.node.handle !== "learn" ) formattedCollections[collection.node.handle] = collection.node.products.edges 
                    } )
                    

                    hasNextPage = collectionsData.data.collections.pageInfo.hasNextPage;
                    cursor = collectionsData.data.collections.pageInfo.endCursor;
                } else {
                    hasNextPage = false;
                }
            }

            // 2. Fetch customer's orders (handle pagination)
            const purchasedProductIds = new Set();
            let hasNextOrderPage = true;
            let orderCursor = null;

            while (hasNextOrderPage) {
                const getCustomerOrdersQuery = `
                    
                    query GetCustomerOrders($customerAccessToken: String!, $cursor: String) {
                        customer(customerAccessToken: $customerAccessToken) {
                            orders(first: 50, after: $cursor) {
                            edges {
                                node {
                                id # You might want the order ID here
                                lineItems(first: 250) {
                                    edges {
                                    node {
                                        variant {
                                        product {
                                            id
                                            title # Often useful to get product title
                                            handle # Also useful for product identification
                                        }
                                        }
                                    }
                                    }
                                    pageInfo { 
                                    hasNextPage
                                    endCursor
                                    }
                                }
                                }
                            }
                            pageInfo { 
                                hasNextPage
                                endCursor
                            }
                            }
                        }
                        }
                `;

                const variables = { customerAccessToken, cursor: orderCursor };
                const ordersData = await shopifyGraphQLRequest(getCustomerOrdersQuery, variables);           

                if (ordersData.data?.customer?.orders?.edges) {

                    const ordersEdges = ordersData?.data?.customer?.orders?.edges;
                    
                    for (const orderEdge of ordersEdges) {
                        const lineItemsEdges = orderEdge?.node?.lineItems?.edges;

                        if (lineItemsEdges && Array.isArray(lineItemsEdges)) {
                            for (const lineItemEdge of lineItemsEdges) {
                            const productId = lineItemEdge?.node?.variant?.product?.id;

                            // If a product ID is found, add it to the Set
                            if (productId) {
                                purchasedProductIds.add(productId);
                            }
                            }
                        }
                    }

                    hasNextOrderPage = ordersData.data.customer.orders.pageInfo.hasNextPage;
                    orderCursor = ordersData.data.customer.orders.pageInfo.endCursor;
                } 
                else {
                    hasNextOrderPage = false;
                }
            }

            let purchasedCollections = {};
            let nonPurchasedCollections = {};

            for (const collectionHandle in formattedCollections) {
                // Ensure the collectionHandle is an own property of the object and not from its prototype chain.
                if (Object.prototype.hasOwnProperty.call(formattedCollections, collectionHandle)) {

                    // Ignore the "frontpage" & creator-course-bundle collection as requested.
                    if (collectionHandle === "frontpage" || collectionHandle === "creator-course-bundle") {
                        continue; // Skip to the next collection
                    }                    

                    const productsInCurrentCollection = formattedCollections[collectionHandle];
                    const currentCollectionPurchasedProducts = [];
                    const currentCollectionNonPurchasedProducts = [];

                    // Iterate through each product in the current collection.
                    for (const product of productsInCurrentCollection) {
                        // Check if the product's ID is present in the set of purchased IDs.

                        if (purchasedProductIds.has(product.node.id)) {  
                            currentCollectionPurchasedProducts.push(product);
                        } else {
                            currentCollectionNonPurchasedProducts.push(product);
                        }
                    }

                    // If there are any purchased products in this collection, add it to purchasedCollections.
                    if (currentCollectionPurchasedProducts.length > 0) {
                        purchasedCollections[collectionHandle] = currentCollectionPurchasedProducts;
                    }

                    // If there are any non-purchased products in this collection, add it to nonPurchasedCollections.
                    if (currentCollectionNonPurchasedProducts.length > 0) {
                        nonPurchasedCollections[collectionHandle] = currentCollectionNonPurchasedProducts;
                    }
                }
            }
            
            displayProducts(purchasedCollections, nonPurchasedCollections);
            stopLoading();

        } 
        catch (error) {
            console.error('Error fetching customer products:', error);
            productListContainer.innerHTML = '<p>Failed to load products.</p>';
            stopLoading();
        }

        checkCollections();

    }

    // make full width if only 1 collection
    function checkCollections() {

        // check if user has only learn or only travel products
        if(formattedCollections['learn'].length === 0 || formattedCollections['travel'].length === 0 ) {
            let purchasedSectionType = document.querySelector('body div.productsContainer .purchasedProductsWrapper .productSection .sectionType');
            purchasedSectionType.style.width = '100%';
            let nonpurchasedSectionType = document.querySelector('body div.productsContainer .nonpurchasedProductsWrapper .productSection .sectionType');
            nonpurchasedSectionType.style.width = '100%';
        }

    }

    function displayProducts(purchasedCollections, nonPurchasedCollections) {
        

        // function displayProducts(purchasedCollections, nonPurchasedCollections) {
            productListContainer.innerHTML = ''; // Clear existing content
            productListContainer.classList.add(); // Add overall container styling

            const hasPurchasedCollections = Object.keys(purchasedCollections).length > 0;
            const hasNonPurchasedCollections = Object.keys(nonPurchasedCollections).length > 0;

            // --- Display Purchased Collections ---
            if (hasPurchasedCollections) {
                const purchasedSection = document.createElement('section');
                purchasedSection.classList.add('purchasedProductsWrapper');

                const purchasedTitle = document.createElement('h2');
                purchasedTitle.textContent = 'Your Product Dashboard';
                purchasedTitle.classList.add('purchasedProductsHeading');
                purchasedSection.appendChild(purchasedTitle);

                const purchasedCollectionsGrid = document.createElement('div');
                purchasedCollectionsGrid.classList.add('productSection');

                // Loop through each purchased collection
                for (const handle in purchasedCollections) {
                    if (Object.prototype.hasOwnProperty.call(purchasedCollections, handle)) {
                        const collectionDiv = document.createElement('div');
                        collectionDiv.classList.add('sectionType');

                        const collectionTitle = document.createElement('h3');
                        collectionTitle.textContent = formatHandleAsTitle(handle);
                        collectionTitle.classList.add('sectionTitle');
                        collectionDiv.appendChild(collectionTitle);

                        const productsListDiv = document.createElement('div');
                        productsListDiv.classList.add('productGrid'); // Add spacing between product cards

                        // Loop through products in this specific purchased collection
                        purchasedCollections[handle].forEach(product => {
                        const productCard = createProductCard(product.node, true, handle);
                        productsListDiv.appendChild(productCard);
                        });

                        collectionDiv.appendChild(productsListDiv);
                        purchasedCollectionsGrid.appendChild(collectionDiv);
                    }
                }
                purchasedSection.appendChild(purchasedCollectionsGrid);
                productListContainer.appendChild(purchasedSection);
            }

            // --- Display Non-Purchased Collections ---
            if (hasNonPurchasedCollections) {
                const nonPurchasedSection = document.createElement('section');
                nonPurchasedSection.classList.add('nonpurchasedProductsWrapper');

                const nonPurchasedTitle = document.createElement('h2');
                nonPurchasedTitle.textContent = 'Check Out Our Other Products';
                nonPurchasedTitle.classList.add('nonpurchasedProductsHeading');
                nonPurchasedSection.appendChild(nonPurchasedTitle);

                const nonPurchasedCollectionsGrid = document.createElement('div');
                nonPurchasedCollectionsGrid.classList.add('productSection');

                // Loop through each non-purchased collection
                for (const handle in nonPurchasedCollections) {
                if (Object.prototype.hasOwnProperty.call(nonPurchasedCollections, handle)) {
                    const collectionDiv = document.createElement('div');
                    collectionDiv.classList.add('sectionType');

                    const collectionTitle = document.createElement('h3');
                    collectionTitle.textContent = formatHandleAsTitle(handle);
                    collectionTitle.classList.add('sectionTitle');
                    collectionDiv.appendChild(collectionTitle);

                    const productsListDiv = document.createElement('div');
                    productsListDiv.classList.add('productGrid'); // Add spacing between product cards

                    // Loop through products in this specific non-purchased collection
                    nonPurchasedCollections[handle].forEach(product => {
                    const productCard = createProductCard(product.node, false, handle);
                    productsListDiv.appendChild(productCard);
                    });

                    collectionDiv.appendChild(productsListDiv);
                    nonPurchasedCollectionsGrid.appendChild(collectionDiv);
                }
                }
                nonPurchasedSection.appendChild(nonPurchasedCollectionsGrid);
                productListContainer.appendChild(nonPurchasedSection);
            }

            // --- Handle empty state for both categories ---
            if (!hasPurchasedCollections && !hasNonPurchasedCollections) {
                productListContainer.innerHTML = `
                <div class="text-center p-8 bg-white rounded-lg shadow-md text-gray-600">
                    <p class="text-xl font-medium">No products found to display.</p>
                    <p class="text-sm mt-2">Check your data fetching and categorization logic.</p>
                </div>
                `;
            }
        // }

    }

    // Helper function to convert a collection handle to a more readable title
    function formatHandleAsTitle(handle) {
        if (!handle) return '';
        return handle
            .split('-') // Split by hyphen
            .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
            .join(' '); // Join with space
    }

    function createProductCard(product, isPurchased, collection) {

        const productCard = document.createElement('div');
        productCard.classList.add('productCard');

        const img = document.createElement('img');
        img.src = product.featuredImage?.url || 'placeholder.jpg';
        img.alt = product.title;

        const title = document.createElement('h3');
        title.classList.add('productTitle');
        title.textContent = product.title;

        productCard.appendChild(img);
        productCard.appendChild(title);

        if (!isPurchased) {
            productCard.classList.add('not-owned');
            const buyNowButton = document.createElement('button');
            buyNowButton.classList.add('buyNowButton');
            buyNowButton.textContent = 'Buy Now';
            productCard.addEventListener('click', () => {
                let buyNowLinkURL = product.metafields.filter(metaData => {
                    if(metaData && metaData.key == "buynowlink") return metaData;
                })
                window.open(buyNowLinkURL[0].value, '_blank', 'noopener,noreferrer');
            });
            productCard.appendChild(buyNowButton);
        }
        else {
            productCard.classList.add('is-owned');
            const openProductButton = document.createElement('button');
            openProductButton.classList.add('pdfButton');
            openProductButton.textContent = 'Go to Product';
            productCard.addEventListener('click', () => {

                localStorage.setItem('productHandle', JSON.stringify(product.handle));

                if(collection == "learn") window.location.href = 'learnProduct.html';
                else if(collection == "travel") window.location.href = 'travelProduct.html';
                else window.location.href = 'travelProduct.html';

            });
            productCard.appendChild(openProductButton);
        }

        return productCard;

    }

    async function logoutCustomer() {

        const mutation = `
            mutation customerAccessTokenDelete($customerAccessToken: String!) {
                customerAccessTokenDelete(customerAccessToken: $customerAccessToken) {
                    deletedAccessToken
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;

        const variables = {
            customerAccessToken: customerAccessToken,
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
                return { success: false, errors: data.errors };
            }

            if (data.data?.customerAccessTokenDelete?.deletedAccessToken) {
                console.log('Logout successful. Deleted Token:', data.data.customerAccessTokenDelete.deletedAccessToken);
                localStorage.removeItem('shopifyCustomerAccessToken'); // Clear the token
                return { success: true };
            } else if (data.data?.customerAccessTokenDelete?.userErrors?.length > 0) {
                console.error('Logout Errors:', data.data.customerAccessTokenDelete.userErrors);
                return { success: false, errors: data.data.customerAccessTokenDelete.userErrors };
            } else {
                return { success: false, errors: [{ message: 'Logout failed for an unknown reason.' }] };
            }
        } catch (error) {
            console.error('Error during logout:', error);
            return { success: false, errors: [{ message: 'Network error during logout.' }] };
        }
    };

    // logout btn
    document.getElementById('logoutBtn').addEventListener('click', async (event) => {

        await logoutCustomer();
        
        window.location.href = './login.html';
    });

    // backToWebsiteBtn btn
    document.getElementById('backToWebsiteBtn').addEventListener('click', async (event) => {
        window.location.href = '/';
    });

    getCollections();


});
