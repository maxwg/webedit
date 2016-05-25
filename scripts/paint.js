/*******************************************************************************
** paint.js
** Copyright (C) 2015, Max Wang <maxw@inbox.com>
*******************************************************************************/
const maxDimensionWidth = 800;
const maxDimensionHeight = 600;
var radius = 36.0;
var mainCanvas;
var canvasOverlay;
var cursor;
var prevImgData = null;
var mainPeaks = null;
var worker;

function InitializeCanvas(src) {
    cursor = document.getElementById("cursor");
    mainCanvas = document.getElementById("mainCanvas");
    canvasOverlay = document.getElementById("paintCanvas");
    var img = new Image;
    img.src = src;
    document.getElementById("background").style.backgroundImage = "url(" + src + ")";
    img.onload = function () {
        FillCanvasFromImage(this, mainCanvas, canvasOverlay);
        mainCanvas.onchange();
        BindPaintEvent(canvasOverlay);
        BindRadiusKeys();
        StartBackgroundOffsets();
    }
}

function LoadImage(src) {
    if (worker != null)
        worker.terminate();
    var img = new Image;
    img.src = src;
    document.getElementById("background").style.backgroundImage = "url(" + src + ")";
    img.onload = function () {
        FillCanvasFromImage(this, mainCanvas, canvasOverlay);
        mainCanvas.onchange();
        BindPaintEvent(canvasOverlay);
        StartBackgroundOffsets();
    }
}

/*  Enable the use of keyboard keypresses to activate functionality
    ] >>> enbiggen paint radius
    [ >>> reduce paint radius
    else >>> do canvas overlay
*/
function BindRadiusKeys() {
    document.onkeydown = function (e) {
        if (e.keyCode == 221) { //big ]
            radius *= 1.04;
            radius += 5;
            cursor.setAttribute("r", radius);
        }
        else if (e.keyCode == 219) { //small [
            radius *= 0.97;
            radius = Math.max(radius - 5, 1);
            cursor.setAttribute("r", radius);
        }
        else if (e.keyCode == 13) { //enter
            Inpaint();
        }
        else if (e.keyCode == 90) { //Z
            if (prevImgData != null) {
                FillCanvasFromData(prevImgData, mainCanvas);
                prevImgData = null;
            }
        }
    }
}

function Inpaint() {
    var paintedArea = GetCanvasData(canvasOverlay);
    ClearCanvas(canvasOverlay);
    if (false && typeof (Worker) !== "undefined") {
        if (mainPeaks != null) {
            document.getElementById("progress").style.opacity = 1;
            document.getElementById("progressText").innerHTML = "Loading";
            document.getElementById("progressBar").style.width = "0%";
            prevImgData = GetCanvasData(mainCanvas);

            worker = new Worker("scripts/graphcutworker.js");
            worker.postMessage({ "img": prevImgData, "overlay": paintedArea, "peaks": mainPeaks, "iterations": document.getElementById("qualitySlider").value, "similar": similarOff });

            worker.onmessage = function (e) {
                if (e.data.progress) {
                    document.getElementById("progressBar").style.width = e.data.complete + "%";
                    document.getElementById("progressText").innerHTML = e.data.task;
                }
                else {
                    worker.terminate();
                    document.getElementById("progress").style.opacity = 0;
                    var paintImage = GetCanvasData(mainCanvas);
                    var imageData = paintImage.data;
                    var inpaint = e.data.return;
                    for (var pixel in inpaint) {
                        imageData[pixel] = inpaint[pixel];
                    }

                    var inpainting = GetCanvasData(mainCanvas);
                    FillCanvasFromData(paintImage, mainCanvas);

                    for (var g = 0; g < inpainting.width * inpainting.height; g++) {
                        inpainting.data[g * 4] = Math.abs((e.data.label[g] + 255) % 256);
                        inpainting.data[g * 4 + 1] = Math.abs((e.data.label[g] * 17 + 255) % 256);
                        inpainting.data[g * 4 + 2] = Math.abs((e.data.label[g] * 83 + 255) % 256);
                    }
                    FillCanvasFromData(inpainting, document.getElementById("inpaintCanvas"));
                }
            };
            worker.onerror = function (e) {
                console.log(e);
            }
        } else {
            alert("Inpainting can only be done once preprocessing is finished");
        }
    } else {
        if (mainPeaks == null) {
            var yuv = RGBtoYUV(GetCanvasData(mainCanvas));
            mainPeaks = GetSimilarFieldPeaks(yuv, 200);
        }
        prevImgData = GetCanvasData(mainCanvas);
        var inpaint = GraphCutOptimisation(prevImgData, paintedArea, mainPeaks, document.getElementById("qualitySlider").value);
        var paintImage = GetCanvasData(mainCanvas);
        var imageData = paintImage.data;
        for (var pixel in inpaint) {
            imageData[pixel] = inpaint[pixel];
        }

        FillCanvasFromData(paintImage, mainCanvas);
    }
}

function StartBackgroundOffsets() {
    if (typeof (Worker) !== "undefined") {
        document.getElementById("progress").style.opacity = 1;
        document.getElementById("progressText").innerHTML = "Loading";
        document.getElementById("progressBar").style.width = "0%";
        worker = new Worker("scripts/patchmatchworker.js");
        worker.postMessage({ "img": GetCanvasData(mainCanvas), "offsets": 1000 });
        worker.onmessage = function (e) {
            if (e.data.progress) {
                document.getElementById("progressBar").style.width = e.data.complete + "%";
                document.getElementById("progressText").innerHTML = e.data.task;
            }
            else {
                mainPeaks = e.data.return;
                similarOff = e.data.similarOff;
                worker.terminate();
                document.getElementById("progress").style.opacity = 0;
            }
        };
        worker.onerror = function (e) {
            console.log(e);
        }

    }
}

/*  Enable Painting on the canvas overlay
*/
function BindPaintEvent(canvas) {
    var context = canvas.getContext("2d");
    context.lineJoin = "round";
    context.lineCap = "round";
    var sx;
    var sy;
    var fx;
    var fy;
    var mpos;
    var paint;
    var isRightMB;
    canvas.onmousedown = function (e) {
        paint = true;
        if (isRightMB = IsRightMB(e)) {
            context.save();
            context.globalCompositeOperation = 'destination-out';
        }
        mpos = GetPosition(canvas);
        sx = e.pageX - mpos.x;
        sy = e.pageY - mpos.y;
        context.lineWidth = radius * 2;
        DrawCircle(context, sx, sy, radius, paint == 2);

    }

    canvas.onmousemove = function (e) {
        cursor.style.visibility = "visible";
        cursor.setAttribute("cx", e.clientX);
        cursor.setAttribute("cy", e.clientY);
        if (paint) {
            mpos = GetPosition(canvas);
            fx = e.pageX - mpos.x;
            fy = e.pageY - mpos.y;
            DrawLine(context, sx, sy, fx, fy);
            sx = fx;
            sy = fy;
        }
    }
    canvas.onmouseup = function (e) {
        paint = false;
        if (isRightMB)
            context.restore();
    }
    canvas.onmouseleave = function (e) {
        paint = false;
        if (isRightMB)
            context.restore();
        cursor.style.visibility = "hidden";
    }
}

function FillCanvasFromImage(img, canvas, canvasOverlay) {
    var ctx = canvas.getContext("2d");
    canvas.width = img.width;
    canvasOverlay.width = img.width;
    canvas.height = img.height;
    canvasOverlay.height = img.height;
    ctx.drawImage(img, 0, 0);
}

function FillCanvasFromData(imgData, canvas) {
    canvas.height = imgData.height;
    canvas.width = imgData.width;
    canvas.getContext("2d").putImageData(imgData, 0, 0);
}

function ClearCanvas(canvas) {
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
}

function GetCanvasData(canvas) {
    var ctx = canvas.getContext("2d");
    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return imageData;
}

function DrawLine(context, sx, sy, fx, fy) {
    context.beginPath();
    context.moveTo(sx, sy);
    context.lineTo(fx, fy);
    context.closePath();
    context.stroke();
}

function DrawCircle(context, x, y, r) {
    context.beginPath();
    context.arc(x, y, r, 0, 2 * Math.PI);
    context.closePath();
    context.fill();
}

function GetPosition(element) {
    var xPosition = 0;
    var yPosition = 0;

    while (element) {
        xPosition += (element.offsetLeft);
        yPosition += (element.offsetTop);
        element = element.offsetParent;
    }
    return { x: xPosition, y: yPosition };
}

function IsRightMB(e) {
    e = e || window.event;
    if ("which" in e)  // Gecko (Firefox), WebKit (Safari/Chrome) & Opera
        return e.which == 3;
    else if ("button" in e)  // IE, Opera 
        return e.button == 2;
}