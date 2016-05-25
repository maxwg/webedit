var mainContainer;
var backgroundDiv;
var cursorContainer;

function Main() {
    InitializeCanvas("res/img.jpg");
    window.onresize = function (event) {
        HandleResize();
    };
    var mainCanvas = document.getElementById("mainCanvas");
    mainContainer = document.getElementById("mainContainer");
    backgroundDiv = document.getElementById("background");
    cursorContainer = document.getElementById("cursorContainer");
    mainCanvas.onchange = function (event) {
        HandleResize();
    }
    HandleResize();
}

function HandleResize() {
    var cHeight = mainContainer.clientHeight;
    var cWidth = mainContainer.clientWidth;
    var wHeight = window.innerHeight;
    var wWidth = document.body.clientWidth;

    backgroundDiv.style.width = wWidth + "px";
    backgroundDiv.style.height = Math.max(cHeight + 32, wHeight) + "px";

    mainContainer.style.left = (wWidth - cWidth) / 2 + "px";
    mainContainer.style.top = ((cHeight + 32 >= wHeight) ? 16 : (wHeight - cHeight) / 2) + "px";
}