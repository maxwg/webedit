"use strict";
this.CloneStamp = function () {
    function bind(canvas) {
        var context = canvas.getContext("2d");
        context.lineJoin = "round";
        context.lineCap = "round";
        var cloneX = 0;
        var cloneY = 0;

        var sx;
        var sy;
        var fx;
        var fy;
        var mpos;
        var paint;
        var isRightMB;
        canvas.onmousedown = function (e) {
            mpos = getPosition(canvas);
            sx = e.pageX - mpos.x;
            sy = e.pageY - mpos.y;
            if (isRightMB = IsRightMB(e)) {
                cloneX = sx;
                cloneY = sy;
            }
            else{
                paint = true;
                context.lineWidth = radius * 2;
                drawCircle(context, sx, sy, radius);
            }
        }

        canvas.onmousemove = function (e) {
            if (!IsRightMB) {
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
        }
        canvas.onmouseup = function (e) {
            paint = false;
        }
        canvas.onmouseleave = function (e) {
            paint = false;
            if (isRightMB)
                context.restore();
            cursor.style.visibility = "hidden";
        }
    }
}();