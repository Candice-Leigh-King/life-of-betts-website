document.addEventListener('DOMContentLoaded', () => {

    const storefrontAccessToken = '9231184be30a83d5acbb0e9bc70d4823'; 
    const graphqlEndpoint = 'https://life-of-betts.myshopify.com/api/2024-07/graphql.json';

    const customerAccessToken = localStorage.getItem('shopifyCustomerAccessToken');
    const productHandle = JSON.parse(localStorage.getItem('productHandle'));

    const overlay = document.getElementById('overlay');
    const videoDiv = document.getElementById('videoDiv');
    const extraResourceDiv = document.getElementById('extraResourceDiv');
    const pdfContainer = document.getElementById('pdfContainer');

    // local testing
    // const uploadsUrl = './assets/pdfs/';

    // staging URL 
    const uploadsUrl = 'https://rose-waves.cloudvent.net/customerPortal/assets/pdfs/';

    // LIVE URL 
    // const uploadsUrl = 'https://lifeofbetts.com/customerPortal/assets/pdfs/';

    // get pdfLink to display
    pdfContainer.innerHTML = ''; // Clear existing content

    // Create the iframe element
    const iframe = document.createElement('iframe');

    // IOS & SAFARI

    const openButton = document.createElement('button');
    openButton.classList.add('backBtn');

    // Create a new anchor element
    const link = document.createElement('a');
    link.classList.add('iosProduct');
    // create a image of the product
    const productImage = document.createElement('img');
    productImage.classList.add('iosProductImage');
    // create a image of the product
    const productTitle = document.createElement('h3');
    productTitle.classList.add('iosProductTitle');

    // Set target="_blank" to open the PDF in a new tab/window.
    // This is crucial for triggering the native PDF viewer on iOS.
    link.target = '_blank';

    // end of IOS

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
        productImage.src = product.featuredImage.url;
        productTitle.textContent = product.title;

        if(product.metafields) {            

            product.metafields.map( (metaF )=>{                

                if(metaF && metaF.key === "pdflink") {
                    iframe.src = uploadsUrl+metaF.value;
                    link.href = uploadsUrl+metaF.value;                    
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

    // Set essential attributes for the iframe
    iframe.title = "Dynamic Content Frame"; // Always add a descriptive title for accessibility
    iframe.width = "100%"; // Make iframe responsive to its container width
    iframe.height = "90vh"; // Set a default height
    iframe.frameBorder = "0"; // Remove default border
    // iframe.allow = "clipboard-write"; // Allow clipboard access if needed (be cautious with this)
    iframe.allowfullscreen = true;
    iframe.id="travelIframe"

    // Add some basic styling for the iframe using Tailwind-like classes (or actual Tailwind if you generate them)
    iframe.style.cssText = `
        border-radius: 0.5rem; /* rounded-lg */
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); /* shadow-md */
        display: block; /* Remove extra space below iframe */
        max-width: 1400px; /* Ensure it fits container */
        height: 95vh
    `;

    // Optional: Add a loading indicator
    const loadingIndicator = document.createElement('p');
    loadingIndicator.textContent = 'Loading content...';
    loadingIndicator.classList.add('text-gray-500', 'text-center', 'py-4');
    pdfContainer.appendChild(loadingIndicator);

    // Event listener for when the iframe content has loaded
    iframe.onload = () => {
        // Remove loading indicator once loaded
        if (pdfContainer.contains(loadingIndicator)) {
            pdfContainer.removeChild(loadingIndicator);
        }
    };

    iframe.onerror = () => {
        if (pdfContainer.contains(loadingIndicator)) {
            pdfContainer.removeChild(loadingIndicator);
        }
        const errorMsg = document.createElement('p');
        errorMsg.textContent = 'Failed to load content. Please check the URL or content security policies.';
        errorMsg.classList.add('text-red-600', 'text-center', 'py-4');
        pdfContainer.appendChild(errorMsg);
    };   

    // function openIframe () {

    //     // Push a new state to history when opening the overlay
    //     // This creates a history entry that the back button can pop
    //     if (history.pushState) {
    //         history.pushState({ overlayOpen: true }, '', '#overlay-open');
    //     }
        
    //     overlay.classList.add('visible'); // Make the overlay visible
    //     document.body.style.overflow = 'hidden'; // Prevent scrolling the main page

    // }

    // function closeIframe () {

    //     overlay.classList.remove('visible'); // Hide the overlay
    //     document.body.style.overflow = ''; // Restore body scrolling
        

    //     // If the current history state indicates the overlay was open,
    //     // go back one step to remove the '#overlay-open' from the URL.
    //     // This prevents the user from having to press back twice to leave the page.
    //     if (history.state && history.state.overlayOpen) {
    //         history.back();
    //     }

    // }

    function setupExtraResources () {        

        for (const linkData of extraResourceLinks) {
        
            const linkWrapper = document.createElement('div');
            linkWrapper.classList.add('linkDiv');
            const link = document.createElement('a');
            link.innerHTML = linkData.linkText;
            link.href = linkData.source;
            link.target = "_blank";
            link.rel = "noopener noreferrer";

            const extraText = document.createElement('p');
            extraText.innerHTML = linkData.extraText;
        
            linkWrapper.append(link);
            linkWrapper.append(extraText);
            extraResourceDiv.append(linkWrapper);
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

    // Fullscreen btn
    document.getElementById('fullScreenBtn').addEventListener('click', async (event) => {
        // going fullscreen
        if (iframe.requestFullscreen) {
            iframe.requestFullscreen();
        } else if (iframe.mozRequestFullScreen) { /* Firefox */
            iframe.mozRequestFullScreen();
        } else if (iframe.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
            iframe.webkitRequestFullscreen();
        } else if (iframe.msRequestFullscreen) { /* IE/Edge */
            iframe.msRequestFullscreen();
        }
    });

    function isIOS() {
       const userAgent = navigator.userAgent;

        // Check for iOS device
        const isIPad = /iPad/i.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isIPhone = /iPhone/i.test(userAgent);
        const isIPod = /iPod/i.test(userAgent);

        return isIPad || isIPhone || isIPod;
    }

    getProduct().then(()=>{

        if(isIOS()) {
            // Append the link to the container
            
            link.append(productImage);
            link.append(productTitle);
            pdfContainer.appendChild(link);
            loadingIndicator.textContent = '';

            // hide fullscreen btn on IOS
            let fullscreenBtn = document.getElementsByClassName('fullScreenWrapper');
            fullscreenBtn[0].style.display = 'none';
            
        }
        else {
            // Append the iframe to the container
            pdfContainer.appendChild(iframe);
        }

    });

    

    

});