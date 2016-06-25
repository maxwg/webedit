"use strict";
this.CloneStamp = function () {
    function bind(canvas) {
        var context = canvas.getContext("2d");
        context.lineJoin = "round";
        context.lineCap = "round";
        var cloneX = 0;
        var cloneY = 0;

        var cx;
        var cy;
        var mpos;
        var paint;
        var isRightMB;
        canvas.onmousedown = function (e) {
            mpos = getPosition(canvas);
            cx = e.pageX - mpos.x;
            cy = e.pageY - mpos.y;
            if (isRightMB = IsRightMB(e)) {
                cloneX = cx;
                cloneY = cy;
            }
            else{
                paint = true;
                context.lineWidth = radius * 2;
                // drawCircle(context, cx, cy, radius);
            }
        }

        canvas.onmousemove = function (e) {
            if (!isRightMB) {
                cursor.style.visibility = "visible";
                cursor.setAttribute("cx", e.clientX);
                cursor.setAttribute("cy", e.clientY);

                mpos = getPosition(canvas);
                cx = e.pageX - mpos.x;
                cy = e.pageY - mpos.y;
                var ctx = guideCanvas.getContext("2d");
                clearCanvas(guideCanvas);
                ctx.drawImage(mainCanvas, cx - cloneX, cy - cloneY);
                clipCircle(ctx, cx, cy, radius, 10);

                if (paint) {
                    // drawLine(context, cx, cy, cx, cy);
                }
            }
        }
        canvas.onmouseup = function (e) {
            paint = false;
            isRightMB = false;
        }
        canvas.onmouseleave = function (e) {
            paint = false;
            if (isRightMB)
                context.restore();
            isRightMB = false;
            cursor.style.visibility = "hidden";
        }
    }


    function unbind(canvas) {
        canvas.onmouseup = undefined;
        canvas.onmousedown = undefined;
        canvas.onmousemove = undefined;
        canvas.onmouseleave = undefined;
    }

    return {
        bind:bind,
        unbind:unbind,
        execute: function(){}
    }
}();