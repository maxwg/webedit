"use strict";
this.CloneStamp = function () {
    function bind(canvas) {
        var context = canvas.getContext("2d");
        context.lineJoin = "round";
        context.lineCap = "round";
        var cloneX = 100, ocx = 100;
        var cloneY = 100, ocy = 100;
        var sx, sy;
        var cx;
        var cy;
        var mpos;
        var paint;
        var isRightMB;
        var rotate = 0;

        canvas.onmousedown = function (e) {
            mpos = getPosition(canvas);
            cx = e.pageX - mpos.x;
            cy = e.pageY - mpos.y;
            if (isRightMB = IsRightMB(e)) {
                cloneX = cx;
                cloneY = cy;
                ocx = cx;
                ocy = cy;
                rotate=0;
            }
            else {
                paint = true;
                context.lineWidth = radius * 2;
                var mainCtx = mainCanvas.getContext("2d");
                mainCtx.drawImage(guideCanvas, 0, 0);
            }
        }

        canvas.onmousemove = function (e) {
            if (!isRightMB) {
                mpos = getPosition(canvas);
                cx = e.pageX - mpos.x;
                cy = e.pageY - mpos.y;
                if (paint) {
                    sx = sx || cx;
                    sy = sy || cy;
                    cloneX = ocx + Math.cos(rotate)*(cx - sx) + Math.sin(rotate)*(cy-sy);
                    cloneY = ocy - Math.sin(rotate)*(cx - sx) + Math.cos(rotate)*(cy-sy);
                    draw();
                    var mainCtx = mainCanvas.getContext("2d");
                    mainCtx.drawImage(guideCanvas, 0, 0);
                }
                else
                    draw();
            }
        }

        window.onkeyup = function (e) {
            draw();
        }

        canvas.onmouseup = function (e) {
            paint = false;
            isRightMB = false;
            sx = undefined;
            sy = undefined;
            cloneX = ocx;
            cloneY = ocy;
            draw();
        }
        canvas.onmouseleave = function (e) {
            paint = false;
            isRightMB = false;
        }

        window.onwheel = function(e){
            rotate = (rotate + e.deltaY*0.04) % (Math.PI*2);
            draw();
        }

        function draw(){
            clearCanvas(guideCanvas);
            var ctx = guideCanvas.getContext("2d");

            var w = mainCanvas.width;
            var h = mainCanvas.height;

            ctx.save();
            ctx.translate(w/2, h/2);
            // ctx.drawImage(mainCanvas, px - cloneX, py - cloneY);
            ctx.rotate(rotate);
            ctx.drawImage(mainCanvas, -cloneX, -cloneY);
            ctx.restore();
            ctx.drawImage(ctx.canvas, -w/2 + cx, -h/2 + cy);

            clipCircle(ctx, cx, cy, radius, hardness);
        }
    }


    function unbind(canvas) {
        canvas.onmouseup = undefined;
        canvas.onmousedown = undefined;
        canvas.onmousemove = undefined;
        canvas.onmouseleave = undefined;
        window.onkeyup = undefined;
        window.onwheel = undefined;
    }

    return {
        bind: bind,
        unbind: unbind,
        execute: function () {
        }
    }
}();