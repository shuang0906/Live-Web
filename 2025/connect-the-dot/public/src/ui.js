function showInfo() {
    var popup = document.getElementById('info-pop');
    if (popup.style.display === 'none') {
        popup.style.display = 'block';
    } else {
        popup.style.display = 'none';
    }
};

var myButton = document.getElementsByClassName('myButton')[0];
myButton.addEventListener('mouseenter', showInfo);
myButton.addEventListener('mouseleave', showInfo);