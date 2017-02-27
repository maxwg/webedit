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
            mpos = getPosition(canvas);
            sx = e.pageX - mpos.x;
            sy = e.pageY - mpos.y;
            context.lineWidth = radius * 2;
            drawCircle(context, sx, sy, radius, paint == 2);
        }

        canvas.onmousemove = function (e) {
            cursor.style.visibility = "visible";
            cursor.setAttribute("cx", e.clientX);
            cursor.setAttribute("cy", e.clientY);
            if (paint) {
                mpos = getPosition(canvas);
                fx = e.pageX - mpos.x;
                fy = e.pageY - mpos.y;
                drawLine(context, sx, sy, fx, fy);
                sx = fx;
                sy = fy;
            }
        }
        canvas.onmouseup = function (e) {
            paint = false;
            if (isRightMB)
                context.restore();
            isRightMB = false;
        }
        canvas.onmouseleave = function (e) {
            paint = false;
            if (isRightMB)
                context.restore();
            isRightMB = false;
            cursor.style.visibility = "hidden";
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

    function inpaint() {
        var paintedArea = getCanvasData(canvasOverlay);
        clearCanvas(canvasOverlay);
        if (typeof (Worker) !== "undefined") {
            if (mainPeaks != null) {
                document.getElementById("progress").style.opacity = 1;
                document.getElementById("progressText").innerHTML = "Loading";
                document.getElementById("progressBar").style.width = "0%";
                prevImgData = getCanvasData(mainCanvas);

                worker = new Worker("scripts/photomontage-worker.js");
                worker.postMessage({
                    "img": prevImgData,
                    "overlay": paintedArea,
                    "peaks": mainPeaks,
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
                        console.log(imageData);
                        console.log(inpaint);
                        for (var pixel in inpaint) {
                            imageData[pixel] = inpaint[pixel];
                        }
                        fillCanvasFromData(paintImage, mainCanvas);
                    }
                    // var inpainting = getCanvasData(mainCanvas);
                    //     for (var g = 0; g < inpainting.width * inpainting.height; g++) {
                    //         inpainting.data[g * 4] = Math.abs((e.data.label[g] + 255) % 256);
                    //         inpainting.data[g * 4 + 1] = Math.abs((e.data.label[g] * 17 + 255) % 256);
                    //         inpainting.data[g * 4 + 2] = Math.abs((e.data.label[g] * 83 + 255) % 256);
                    //     }
                    //     fillCanvasFromData(inpainting, document.getElementById("inpaintCanvas"));
                    // }
                };
                worker.onerror = function (e) {
                    console.log(e);
                }
            } else {
                alert("Inpainting can only be done once preprocessing is finished");
            }
        } else {
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

    function startBackgroundOffsets() {
        if (typeof (Worker) !== "undefined") {
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
}();