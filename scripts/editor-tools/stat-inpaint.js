"use strict";
this.StatInpaint = function () {
    /*  Enable Painting on the canvas overlay
     */
    function bindPaintEvent(canvas) {
        var context = canvas.getContext("2d");
        context.lineJoin = "round";
        context.lineCap = "round";
        var sx;
        var sy;
        var ox; //offset x - inpainting
        var oy; // ox && oy != null => right click
        var cloneX;
        var cloneY;
        var fx;
        var fy;
        var mpos;
        var paint;
        var ShiftKey;
        var isRightMB;
        canvas.onmousedown = function (e) {
            mpos = getPosition(canvas);
            sx = e.pageX - mpos.x;
            sy = e.pageY - mpos.y;
            if (isRightMB = IsRightMB(e)) {
                ox = cloneX = sx;
                oy = cloneY = sy;
            }
            else {
                paint = true;
                if (ShiftKey = e.shiftKey) {
                    context.save();
                    context.globalCompositeOperation = 'destination-out';
                }
                context.lineWidth = radius * 2;
                drawCircle(context, sx, sy, radius, paint == 2);
            }
        }

        canvas.onmousemove = function (e) {
            cursor.style.visibility = "visible";
            cursor.setAttribute("cx", e.clientX);
            cursor.setAttribute("cy", e.clientY);
            mpos = getPosition(canvas);
            fx = e.pageX - mpos.x;
            fy = e.pageY - mpos.y;

            if (paint) {
                if (e.shiftKey && !ShiftKey) {
                    context.save();
                    context.globalCompositeOperation = 'destination-out';
                    ShiftKey = true;
                }
                else if (!e.shiftKey && ShiftKey) {
                    ShiftKey = false;
                    context.restore();
                }
                drawLine(context, sx, sy, fx, fy);
            }
            if (ox && oy) {
                draw();
                if (paint) {
                    sx = sx || fx;
                    sy = sy || fy;
                    cloneX = cloneX + (fx - sx);
                    cloneY = cloneY + (fy - sy);
                    draw();
                    var mainCtx = mainCanvas.getContext("2d");
                    mainCtx.drawImage(guideCanvas, 0, 0);
                }
            }
            sx = fx;
            sy = fy;
        };
        canvas.onmouseup = function (e) {
            paint = false;
            if (ShiftKey)
                context.restore();
            ShiftKey = false;
            if (!isRightMB) {
                inpaint([ox - sx, oy - sy], 0);
                ox = oy = undefined;
            }
            else {
                draw();
                isRightMB = false;
            }
        }
        canvas.onmouseleave = function (e) {
            paint = false;
            if (ShiftKey)
                context.restore();
            isRightMB = false;
            ShiftKey = false;
            cursor.style.visibility = "hidden";
        }

        function draw() {
            clearCanvas(guideCanvas);
            var ctx = guideCanvas.getContext("2d");

            // var w = mainCanvas.width;
            // var h = mainCanvas.height;

            // ctx.save();
            // ctx.translate(~~(w / 2), ~~(h / 2));
            ctx.drawImage(mainCanvas, fx - cloneX, fy - cloneY);
            // ctx.drawImage(mainCanvas, -cloneX, -cloneY);
            // ctx.restore();
            // ctx.drawImage(ctx.canvas, ~~(-w / 2) + fx, ~~(-h / 2) + fy);

            clipCircle(ctx, fx, fy, radius - 1, 0);
        }

        startBackgroundOffsets();
    }

    function unbind(canvas) {
        canvas.onmouseup = undefined;
        canvas.onmousedown = undefined;
        canvas.onmousemove = undefined;
        canvas.onmouseleave = undefined;
        clearCanvas(canvasOverlay);
    }

    function inpaint(offset, shuffle) {
        clearCanvas(guideCanvas);
        var paintedArea = getCanvasData(canvasOverlay);
        clearCanvas(canvasOverlay);
        if (typeof (Worker) !== "undefined") {
            if (mainPeaks != null) {
                document.getElementById("progress").style.opacity = 1;
                document.getElementById("progressText").innerHTML = "Loading";
                document.getElementById("progressBar").style.width = "0%";
                prevImgData = getCanvasData(mainCanvas);

                var inpaintOffsets = mainPeaks.slice(); //duplicate array
                if(shuffle){
                    shuffleArray(inpaintOffsets, shuffle);
                }
                if(isFinite(offset[0])){
                    inpaintOffsets.unshift(offset);
                }
                worker = new Worker("scripts/photomontage-worker.js");
                worker.postMessage({
                    "img": prevImgData,
                    "overlay": paintedArea,
                    "peaks": inpaintOffsets,
                    "iterations": document.getElementById("qualitySlider").value
                });

                worker.onmessage = function (e) {
                    if (e.data.progress) {
                        document.getElementById("progressBar").style.width = e.data.complete + "%";
                        document.getElementById("progressText").innerHTML = e.data.task;
                    }
                    else {
                        worker.terminate();
                        document.getElementById("progress").style.opacity = 0;
                        var paintImage = getCanvasData(mainCanvas);
                        var imageData = paintImage.data;
                        var inpaint = e.data.return;
                        for (var pixel in inpaint) {
                            imageData[pixel] = inpaint[pixel];
                        }
                        fillCanvasFromData(paintImage, mainCanvas);
                    }
                }
            } else {
                alert("Inpainting can only be done once preprocessing is finished");
            }

            worker.onerror = function (e) {
                console.log(e);
            }
        }
        else {
            if (mainPeaks == null) {
                var yuv = ImageHelpers.RGBtoYUV(getCanvasData(mainCanvas));
                mainPeaks = ANNStats(8)(yuv);
            }
            prevImgData = getCanvasData(mainCanvas);
            var inpaint = Photomontage(prevImgData, paintedArea, mainPeaks, document.getElementById("qualitySlider").value);
            var paintImage = getCanvasData(mainCanvas);
            var imageData = paintImage.data;
            for (var pixel in inpaint) {
                imageData[pixel] = inpaint[pixel];
            }

            fillCanvasFromData(paintImage, mainCanvas);
        }
    }

    function shuffleArray(array, toIdx) {
        for (var i = toIdx; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
        return array;
    }

    function startBackgroundOffsets() {
        if (!mainPeaks && typeof (Worker) !== "undefined") {
            document.getElementById("progress").style.opacity = 1;
            document.getElementById("progressText").innerHTML = "Loading";
            document.getElementById("progressBar").style.width = "0%";
            worker = new Worker("scripts/nearest-neighbour-worker.js");
            worker.postMessage({"img": getCanvasData(mainCanvas)});
            worker.onmessage = function (e) {
                if (e.data.progress) {
                    document.getElementById("progressBar").style.width = e.data.complete + "%";
                    document.getElementById("progressText").innerHTML = e.data.task;
                }
                else {
                    mainPeaks = e.data.return;
                    // similarOff = e.data.similarOff;
                    worker.terminate();
                    document.getElementById("progress").style.opacity = 0;
                }
            };
            worker.onerror = function (e) {
                console.log(e);
            }

        }
    }

    return {
        bind: bindPaintEvent,
        unbind: unbind,
        execute: inpaint
    }
}
();