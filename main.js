
$(document).ready(function() {
	//make sure the page is ready befor running the scripts
	// This is the hamburger menu
	$(".hamburger").click(function(){

	  $(this).toggleClass('active');
	  $(".mobile-menu").fadeToggle();
		});

// put class of exit on elements to make them navigate back to page-nav
			$(".exit").click(function(){

				$(this).toggleClass('active');
				$(".page-nav").fadeToggle();
			});

			// end hamburger menu

			$(document).ready(function(){
					$('.one-time').slick({
			dots: true,
			infinite: true,
			draggable: true,
			speed: 1000,
			slidesToShow: 1,
			autoplay: false,
			adaptiveHeight: true
			});
			});
			});

			// on scroll
			// on scroll
			function reveal() {
			let reveals = document.querySelectorAll(".reveal");

			for (let i = 0; i < reveals.length; i++) {
			let windowHeight = window.innerHeight;
			let elementTop = reveals[i].getBoundingClientRect().top;
			let elementVisible = 150;

			if (elementTop < windowHeight - elementVisible) {
			reveals[i].classList.add("active");
			} else {
			}
			}
			}

			window.addEventListener("scroll", reveal);

			
			$('[data-fancybox="gallery"]').fancybox({
			  loop: true,
			  buttons: [
				"zoom",
				"slideShow",
				"thumbs",
				"close"
				],
				animationEffect: "zoom",
				transitionEffect: "zoom-in-out",
			});

			$(".read-more-button").click(function(){
				$(this).toggleClass("active")
				var target = $(this).attr("data-target");
			   $(".read-more-section").each(function(){
				 if($(this).attr("data-section") == target){
				   $(this).slideToggle();
				 }});
			});
