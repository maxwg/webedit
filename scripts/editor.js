/*******************************************************************************
 ** paint.js
 ** Copyright (C) 2015, Max Wang <maxw@inbox.com>
 *******************************************************************************/
const maxDimensionWidth = 800;
const maxDimensionHeight = 600;
var radius = 16.0;
var zoom = 1;
var hardness = 6;
var cursor;
var prevImgData = null;
mainPeaks = mainPeaks || null;
var worker

function initializeCanvas(src) {
    var img = new Image;
    img.src = src;
    document.getElementById("background").style.backgroundImage = "url(" + src + ")";
    img.onload = function () {
        fillCanvasFromImage(this, mainCanvas, [canvasOverlay, guideCanvas]);
        mainCanvas.onchange();
        bindKeys();
        tool = ToolManager(canvasOverlay);
    }
}

function loadImage(src) {
    if (worker != null)
        worker.terminate();
    var img = new Image;
    img.src = src;
    document.getElementById("background").style.backgroundImage = "url(" + src + ")";
    img.onload = function () {
        fillCanvasFromImage(this, mainCanvas, [canvasOverlay, guideCanvas]);
        mainCanvas.onchange();
    }
}

function saveImage() {
    var image = mainCanvas.toDataURL("png");
    $.ajax({
        url: `http://clydebank.cecs.anu.edu.au/cocoono/api/editor/save`,
        type: 'POST',
        cache: false,
        dataType: 'json',
        data: {
            img: image,
            task: params.task,
            id: params.id,
            removed: params.removed
        },
        xhrFields: {
            withCredentials: true
        }
    });
}

function openImageSelector() {
    var selector = document.getElementById("open-selector")
    fireEvent(selector, "click");
}

/*  Enable the use of keyboard keypresses to activate functionality
 ] >>> enbiggen paint radius
 [ >>> reduce paint radius
 else >>> do canvas overlay
 */
function bindKeys() {
    document.onkeydown = function (e) {
        if (e.keyCode == 221) { //big ]
            if (e.shiftKey) {
                hardness *= 0.8;
                hardness -= 4;
                hardness = hardness < 0 ? 0 : hardness;
            } else {
                radius *= 1.04;
                radius += 5;
                cursor.setAttribute("r", radius);
            }
        }
        else if (e.keyCode == 219) { //small [
            if (e.shiftKey) {
                hardness += 2;
                hardness *= 1.1;
            } else {
                radius *= 0.97;
                radius = Math.max(radius - 5, 1);
                cursor.setAttribute("r", radius);
            }
        }
        else if (e.keyCode == 13 || e.keyCode == 32) { //enter or space
            tool.current().execute();
        }
        else if (e.keyCode == 61) { //+
            zoom = zoom * 1.15;
            Transforms["mainContainer"].scale = zoom;
            var x = Transforms["mainContainer"].x || 0;
            var y = Transforms["mainContainer"].y || 0;
            mainContainer.style.webkitTransform =
                mainContainer.style.transform =
                    'translate(' + x + 'px, ' + y + 'px) scale('
                    + zoom + ", " + zoom + ')';
            tool.refresh();
        }
        else if (e.keyCode == 173) { //-
            zoom = zoom / 1.15;
            Transforms["mainContainer"].scale = zoom;
            var x = Transforms["mainContainer"].x || 0;
            var y = Transforms["mainContainer"].y || 0;
            mainContainer.style.webkitTransform =
                mainContainer.style.transform =
                    'translate(' + x + 'px, ' + y + 'px) scale('
                    + zoom + ", " + zoom + ')';
            tool.refresh();
        }
        else if (e.keyCode == 90) { //Z
            if (prevImgData != null) {
                fillCanvasFromData(prevImgData, mainCanvas);
                prevImgData = null;
            }
        }
        else if (e.keyCode == 17){
            document.getElementById("baseCanvas").style.opacity=1;
        }
    }
    document.onkeyup=function(e){
        document.getElementById("baseCanvas").style.opacity=0;
    }
}


function fillCanvasFromImage(img, canvas, canvasList) {
    var ctx = canvas.getContext("2d");
    canvas.width = img.width;
    canvas.height = img.height;
    for (var cv in canvasList) {
        var c = canvasList[cv];
        c.width = img.width;
        c.height = img.height;
    }
    ctx.drawImage(img, 0, 0);
}

function fillCanvasFromData(imgData, canvas) {
    canvas.height = imgData.height;
    canvas.width = imgData.width;
    canvas.getContext("2d").putImageData(imgData, 0, 0);
}

function clearCanvas(canvas) {
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
}

function getCanvasData(canvas) {
    var ctx = canvas.getContext("2d");
    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return imageData;
}

function drawLine(context, sx, sy, fx, fy) {
    context.beginPath();
    context.moveTo(sx, sy);
    context.lineTo(fx, fy);
    context.closePath();
    context.stroke();
}

function drawCircle(context, x, y, r) {
    context.beginPath();
    context.arc(x, y, r, 0, 2 * Math.PI);
    context.closePath();
    context.fill();
}

function clipCircle(ctx, x, y, r, f) {
    /// create off-screen temporary canvas where we draw in the shadow
    var temp = document.createElement('canvas'),
        tx = temp.getContext('2d');

    temp.width = ctx.canvas.width;
    temp.height = ctx.canvas.height;

    /// offset the context so shape itself is drawn outside canvas
    tx.translate(-temp.width, 0);

    /// offset the shadow to compensate, draws shadow only on canvas
    tx.shadowOffsetX = temp.width;
    tx.shadowOffsetY = 0;

    /// black so alpha gets solid
    tx.shadowColor = '#000';

    /// "feather"
    tx.shadowBlur = f;

    /// draw the arc, only the shadow will be inside the context
    tx.arc(x, y, r, 0, 2 * Math.PI);
    tx.closePath();
    tx.fill();


    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(temp, 0, 0);
    ctx.restore();
    // context.beginPath();
    // context.arc(x, y, r, 0, 2 * Math.PI);
    // context.closePath();
    // context.clip();
}

function getPosition(element) {
    var xPosition = 0;
    var yPosition = 0;

    while (element) {
        xPosition += (element.offsetLeft);
        yPosition += (element.offsetTop);
        element = element.offsetParent;
    }
    return {x: xPosition, y: yPosition};
}

function IsRightMB(e) {
    e = e || window.event;
    if ("which" in e)  // Gecko (Firefox), WebKit (Safari/Chrome) & Opera
        return e.which == 3;
    else if ("button" in e)  // IE, Opera
        return e.button == 2;
}

document.getElementById('img_save_btn').addEventListener("click", function() {
    saveImage();
}, false);

document.getElementById('img_skip_btn').addEventListener("click", function() {
    top.location.reload(true);
}, false);