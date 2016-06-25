var mainCanvas, canvasOverlay, mainContainer,
    guideCanvas, backgroundDiv, cursorContainer, toolbox, cursor;
Transforms = {mainContainer: {scale: 1}};

function Main() {
    mainCanvas = document.getElementById("mainCanvas");
    canvasOverlay = document.getElementById("paintCanvas");
    guideCanvas = document.getElementById("guideCanvas");
    mainContainer = document.getElementById("mainContainer");
    backgroundDiv = document.getElementById("background");
    cursorContainer = document.getElementById("cursorContainer");
    toolbox = document.getElementById("toolbox");
    cursor = document.getElementById("cursor");
    initializeCanvas("res/img.jpg");
    window.onresize = function (event) {
        HandleResize();
    };
    mainCanvas.onchange = function (event) {
        HandleResize();
    };
    HandleResize();
}

function HandleResize() {
    var cHeight = mainCanvas.clientHeight;
    var cWidth = mainCanvas.clientWidth;
    var wHeight = window.innerHeight;
    var wWidth = document.body.clientWidth;

    backgroundDiv.style.width = wWidth + "px";
    backgroundDiv.style.height = Math.max(cHeight + 32, wHeight) + "px";

    mainContainer.style.left = (wWidth - cWidth) / 2 + 56 + "px";
    mainContainer.style.top = ((cHeight + 32 >= wHeight) ? 16 : (wHeight - cHeight) / 2) + "px";
    mainContainer.style.width = mainCanvas.width + 'px';
    mainContainer.style.height = mainCanvas.height + 'px';
    toolbox.style.left = (wWidth - cWidth) / 2 - 48 + "px";
    toolbox.style.top = ((cHeight + 32 >= wHeight) ? 16 : (wHeight - cHeight) / 2) + "px";
    interact('#toolboxHead')
        .draggable({
            inertia: true,
            restrict: {
                restriction: "body",
                endOnly: true,
                elementRect: {top: 0, left: 0, bottom: 1, right: 1}
            },
            onmove: dragMoveListener
        });

    interact('#mainContainerHead')
        .draggable({
            inertia: true,
            restrict: {
                restriction: "body",
                endOnly: true,
                elementRect: {top: 0, left: 0, bottom: 1, right: 1}
            },
            onmove: dragMoveListener
        });
}

function dragMoveListener(event) {
    var target = event.target.parentElement;
    // keep the dragged position in the data-x/data-y attributes
    //     x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx,
    //     y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
    //
    // Transforms[target.id].x = x;
    // Transforms[target.id].y = y;

    // translate the element
    // var scale = Transforms[target.id].scale || 1;
    // target.style.webkitTransform =
    //     target.style.transform =
    //         'translate(' + x + 'px, ' + y + 'px) scale('
    //         + scale + ", " + scale + ')';

    target.style.left = parseFloat(target.style.left) + event.dx + 'px';
    target.style.top = parseFloat(target.style.top) + event.dy + 'px';
}