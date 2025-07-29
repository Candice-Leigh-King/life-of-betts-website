document.addEventListener('DOMContentLoaded', () => {

    const storefrontAccessToken = '9231184be30a83d5acbb0e9bc70d4823'; 
    const graphqlEndpoint = 'https://life-of-betts.myshopify.com/api/2024-07/graphql.json';

    const customerAccessToken = localStorage.getItem('shopifyCustomerAccessToken');
    const productHandle = JSON.parse(localStorage.getItem('productHandle'));

    const overlay = document.getElementById('overlay');
    const openButton = document.getElementById('openButton');
    const iframe = document.getElementById('iframe');
    const videoDiv = document.getElementById('videoDiv');
    const title = document.getElementById('productTitle');
    const productImgDiv = document.getElementById('productImg');
    const extraResourceDiv = document.getElementById('extraResourceDiv');

    const uploadsUrl = 'https://rose-waves.cloudvent.net/customerPortal/assets/pdfs/';

    let product = {};
    let extraResourceLinks = [];

    // check if logged in
    if (!customerAccessToken) {
        window.location.href = 'login.html';
        return;
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

    async function getProduct() {

        const getProductQuery = `
            query getProductByHandle($handle: String!) {
                productByHandle(handle: $handle) {
                    id
                    title
                    descriptionHtml
                    onlineStoreUrl
                    featuredImage {
                        url
                        altText
                    }
                    metafields(identifiers: [
                        { namespace: "custom", key: "extraResourceLinks" },
                        { namespace: "custom", key: "videoLink" },
                        { namespace: "custom", key: "pdfLink" },
                        { namespace: "custom", key: "buyNowLink" }
                    ]) {
                        value
                        key
                        namespace              
                    }
                }
            }
        `;
                    
        const variables = { handle: productHandle };
        const productData = await shopifyGraphQLRequest(getProductQuery, variables);

        product = productData.data.productByHandle;
        

        title.textContent = product.title;
        productImgDiv.src = product.featuredImage.url;
        productImgDiv.alt = product.featuredImage.alt;

        if(product.metafields) {            

            product.metafields.map( (metaF )=>{                

                if(metaF && metaF.key === "pdflink") {
                    iframe.src = uploadsUrl+metaF.value;
                }
                else if(metaF && metaF.key === "videolink") {
                    videoDiv.src = metaF.value;
                }
                else if(metaF && metaF.key === "extraresourcelinks") {
                    extraResourceLinks = JSON.parse(metaF.value);
                }
                else {
                    // console.log('not a required metaField');
                    
                }

            });

        }

        setupExtraResources()

    }


    function openIframe () {

        // Push a new state to history when opening the overlay
        // This creates a history entry that the back button can pop
        if (history.pushState) {
            history.pushState({ overlayOpen: true }, '', '#overlay-open');
        }
        
        overlay.classList.add('visible'); // Make the overlay visible
        document.body.style.overflow = 'hidden'; // Prevent scrolling the main page

    }

    function closeIframe () {

        overlay.classList.remove('visible'); // Hide the overlay
        document.body.style.overflow = ''; // Restore body scrolling
        

        // If the current history state indicates the overlay was open,
        // go back one step to remove the '#overlay-open' from the URL.
        // This prevents the user from having to press back twice to leave the page.
        if (history.state && history.state.overlayOpen) {
            history.back();
        }

    }

    function setupExtraResources () {        

        for (const linkData of extraResourceLinks) {
        
            const link = document.createElement('a');
            link.innerHTML = linkData.linkText;
            link.href = linkData.source;
            link.target = "_blank";
            link.rel = "noopener noreferrer";

            const extraText = document.createElement('p');
            link.innerHTML = linkData.extraText;
        
            extraResourceDiv.append(link);
            extraResourceDiv.append(extraText);
        }        

    }

    openButton.addEventListener('click', () => {

        openIframe(); // Call function to open the overlay

        // Optional: Button click visual feedback (as in previous versions)
        openButton.textContent = "Opening...";
        openButton.classList.add('clicked');
        setTimeout(() => {
            openButton.textContent = "Open me";
            openButton.classList.remove('clicked');
        }, 1000); // Shorter delay for opening action
    });

    // Listen for messages from the iframe to close itself
    window.addEventListener('message', (event) => {
        // Ensure the message is from a trusted origin if in a real application
        // For this example, we accept messages from any origin ('*')
        if (event.data === 'closeIframe') {
            closeIframe();
        }
    });

    // Optional: Close overlay if user clicks outside the iframe (on the semi-transparent background)
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) { // Check if the click was directly on the overlay, not its children
            closeIframe();
        }
    });

    // Listen for popstate event (when back/forward buttons are used)
    window.addEventListener('popstate', (event) => {
        // Check if the overlay is currently visible AND the popstate event
        // is not related to our overlay's state (i.e., user pressed back to go *past* our overlay state)
        if (overlay.classList.contains('visible') && !(event.state && event.state.overlayOpen)) {
            closeIframe();
        }
        // If the overlay is not visible, or if the popstate is our own overlay state,
        // let the browser handle the navigation normally.
    });

    // back btn
    document.getElementById('backBtn').addEventListener('click', async (event) => {
        window.history.back();
    });

    getProduct()

});