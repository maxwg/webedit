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

function saveImage(){
    var image = mainCanvas.toDataURL("png");  // here is the most important part because if you dont replace you will get a DOM 18 exception.
    window.location.href=image;
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

/**
 * Fire an event handler to the specified node. Event handlers can detect that the event was fired programatically
 * by testing for a 'synthetic=true' property on the event object
 * @param {HTMLNode} node The node to fire the event handler on.
 * @param {String} eventName The name of the event without the "on" (e.g., "focus")
 */
function fireEvent(node, eventName) {
    // Make sure we use the ownerDocument from the provided node to avoid cross-window problems
    var doc;
    if (node.ownerDocument) {
        doc = node.ownerDocument;
    } else if (node.nodeType == 9) {
        // the node may be the document itself, nodeType 9 = DOCUMENT_NODE
        doc = node;
    } else {
        throw new Error("Invalid node passed to fireEvent: " + node.id);
    }

    if (node.dispatchEvent) {
        // Gecko-style approach (now the standard) takes more work
        var eventClass = "";

        // Different events have different event classes.
        // If this switch statement can't map an eventName to an eventClass,
        // the event firing is going to fail.
        switch (eventName) {
            case "click": // Dispatching of 'click' appears to not work correctly in Safari. Use 'mousedown' or 'mouseup' instead.
            case "mousedown":
            case "mouseup":
                eventClass = "MouseEvents";
                break;

            case "focus":
            case "change":
            case "blur":
            case "select":
                eventClass = "HTMLEvents";
                break;

            default:
                throw "fireEvent: Couldn't find an event class for event '" + eventName + "'.";
                break;
        }
        var event = doc.createEvent(eventClass);
        event.initEvent(eventName, true, true); // All events created as bubbling and cancelable.

        event.synthetic = true; // allow detection of synthetic events
        // The second parameter says go ahead with the default action
        node.dispatchEvent(event, true);
    } else if (node.fireEvent) {
        // IE-old school style
        var event = doc.createEventObject();
        event.synthetic = true; // allow detection of synthetic events
        node.fireEvent("on" + eventName, event);
    }
};



