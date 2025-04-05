$(document).ready(function(){
    // Add smooth scrolling
    $('a[href^="#"]').on('click', function(event) {
        event.preventDefault();
        var target = $(this.getAttribute('href'));
        if( target.length ) {
            $('html, body').stop().animate({
                scrollTop: target.offset().top
            }, 1000);
        }
    });

    // Add parallax effect to hero images
    $(window).scroll(function(){
        var scrolled = $(window).scrollTop();
        $('.hero').css('background-position-y', -(scrolled * 0.5));
    });
});