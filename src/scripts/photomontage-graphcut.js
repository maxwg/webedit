/*******************************************************************************
 ** photomontagegraphcut.js
 ** Copyright (C) 2015, Max Wang <maxw@inbox.com>
 ** Implements the Interactive Digital Photomontage graph-cut function, as specified
 ** by Agarwala et al (2004) in Interactive Digital Photomontage
 **
 ** This code unwraps loops for performance purposes. The original 'concise' and
 ** elegant solution performed around 33% slower in tests conducted last semester
 *
 * PARAMS:
 *      image: Base Image extracted from canvas,
 *      area: area to inpaint, extracted from alpha layer of a canvas image.
 *      offsets: $K$ most commmon offsets.
 *      iterations: Number of offsets to use.
 *      [shuffleamt: number of items to shuffle from start in offsets]
 *******************************************************************************/
"use strict";

// const Canvas = require('canvas');
const ImgHelpers = ImageHelpers || require('./image-helpers.js');
const MaxFlowGraph = FlowGraph || require('./flow-graph.js');
const Blend = PoissonBlend || require('./photomontage-blend.js');

var PhotomontageGraphCut = function (image, area, offsets, iterations) {
    const INVALID_COST = 1000000000;
    var imgData = image.data;
    var imgLen = imgData.length;
    var aData = area.data;
    var imgW = image.width;
    var imgH = image.height;
    var alphaX, alphaY, pixel, px, py, p4;

    function shuffleArray(array, toIdx) {
        for (var i = toIdx; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
        return array;
    }

    function findOptimalAssignment() {
        var label = []; //Array mapping pixel to its labelling (pixel offset * 4)
        var paintedArea = []; //Array mapping node to pixel
        var pixelNode = []; //Array mapping pixel to its corresponding node.
        var nodeCount = 0;
        console.log(offsets);
        for (var i = 3; i < imgLen; i += 4) {
            pixel = Math.floor(i / 4);
            if (aData[i] > 0) {
                label[pixel] = offsets[0];
                paintedArea.push(pixel);
                pixelNode[pixel] = nodeCount;
                nodeCount++;
            }
        }

        if (nodeCount > 0) {
            var pairwiseFn = PhotomontagePairwiseFnRGB;
            var unaryFn = PhotomontageUnaryFnRGB;

            var graph = MaxFlowGraph(nodeCount);
            for (var iter = 1; iter <= iterations; iter++) {
                var alphaLabel = (iter) % offsets.length;
                var alphaOff = offsets[alphaLabel];
                for (var i = 0, paintedPixels = paintedArea.length; i < paintedPixels; i++) {
                    //var
                    pixel = paintedArea[i];
                    p4 = pixel * 4;
                    px = pixel % imgW;
                    py = Math.floor(pixel / imgW);

                    //var
                    alphaX = px + alphaOff[0], alphaY = py + alphaOff[1];
                    var clX = px + label[pixel][0], clY = py + label[pixel][1];
                    var thisNode = pixelNode[pixel];
                    var naCost = 0, aCost = 0;

                    if (!(clX > 0 && clX < imgW - 1 && clY > 0 && clY < imgH - 1)) {
                        naCost += INVALID_COST;
                    }
                    if (aData[(clX + clY * imgW) * 4 + 3] != 0)
                        naCost += INVALID_COST / 2;

                    if (!(alphaX > 0 && alphaX < imgW - 1 && alphaY > 0 && alphaY < imgH - 1)) {
                        aCost += INVALID_COST;
                    }
                    if (aData[(alphaX + alphaY * imgW) * 4 + 3] != 0)
                        aCost += INVALID_COST / 2;

                    if (aCost < INVALID_COST && naCost < INVALID_COST) {
                        //top
                        if (py > 0) {
                            var cp = pixel - imgW;
                            var cp4 = cp * 4;
                            var node = pixelNode[cp];
                            if (node != undefined) {
                                var cost = pairwiseFn(p4, cp4, alphaOff, label[cp]);
//                        if (isNaN(cost))
//                            console.log("1 broke");
                                graph.setEdge(thisNode, node, cost);
                            } else {
                                naCost += unaryFn(p4, cp4, label[pixel]);
                                aCost += unaryFn(p4, cp4, alphaOff);
                                if (naCost == INVALID_COST && aCost == INVALID_COST)  aCost -= INVALID_COST;

                            }
                        }

                        //bottom
                        if (py < imgH) {
                            var cp = pixel + imgW, cp4 = cp * 4;
                            var node = pixelNode[cp];
                            if (node != undefined) {
                                var cost = pairwiseFn(p4, cp4, alphaOff, label[cp]);
//                        if (isNaN(cost))
//                            console.log("2 broke");
                                graph.setEdge(thisNode, node, cost);
                            } else {
                                naCost += unaryFn(p4, cp4, label[pixel]);
                                aCost += unaryFn(p4, cp4, alphaOff);
                                if (naCost == INVALID_COST && aCost == INVALID_COST)  aCost -= INVALID_COST;
                            }
                        }

                        //left
                        if (px < imgW) {
                            var cp = pixel - 1, cp4 = cp * 4;
                            var node = pixelNode[cp];
                            if (node != undefined) {
                                var cost = pairwiseFn(p4, cp * 4, alphaOff, label[cp]);
//                        if (isNaN(cost))
//                            console.log("3 broke");
                                graph.setEdge(thisNode, node, cost);
                            } else {
                                naCost += unaryFn(p4, cp4, label[pixel]);
                                aCost += unaryFn(p4, cp4, alphaOff);
                                if (naCost == INVALID_COST && aCost == INVALID_COST)  aCost -= INVALID_COST;
                            }
                        }

                        //right
                        if (px > 0) {
                            var cp = pixel + 1, cp4 = cp * 4;
                            var node = pixelNode[cp];
                            if (node != undefined) {
                                var cost = pairwiseFn(p4, cp * 4, alphaOff, label[cp]);
//                        if (isNaN(cost))
//                            console.log("4 broke");
                                graph.setEdge(thisNode, node, cost);
                            } else {
                                naCost += unaryFn(p4, cp4, label[pixel]);
                                aCost += unaryFn(p4, cp4, alphaOff);
                                if (naCost == INVALID_COST && aCost == INVALID_COST)  aCost -= INVALID_COST;
                            }
                        }
                    }
                    graph.setSourceEdge(thisNode, naCost);
                    graph.setTargetEdge(thisNode, aCost);
                }

                graph.maxFlow();
//            console.log(iter + ": " + graph.maxFlow());

                for (var j = 0; j < nodeCount; j++) {
                    if (graph.cut[j] == graph.SOURCE || graph.cut[j] == graph.FREE) {
                        label[paintedArea[j]] = alphaOff;
                    }
                    //else if (graph.cut[j] != graph.TARGET) { //&& graph.cut[j] != MAX_FLOW_FREE) {
                    //    console.log("why? cut " + j + "TYPE : " + graph.cut[j]);
                    //}
                }
                graph.reset();
            }

            var result = [];
            for (var i = 0; i < nodeCount; i++) {
                var pixel = paintedArea[i];
                var p4 = pixel * 4;
                var pixLabel = (label[pixel][0] + label[pixel][1] * imgW) * 4;
                result[p4] = imgData[p4 + pixLabel];
                result[p4 + 1] = imgData[p4 + pixLabel + 1];
                result[p4 + 2] = imgData[p4 + pixLabel + 2];
            }

            for (var pixel in result) {
                imgData[pixel] = result[pixel];
            }

            return Blend(image, label, paintedArea, pixelNode);
        }
    }

    // function drawLabelsVectors(img, label, paintedArea, nodeCount) {
    //   const canvas = new Canvas(img.width, img.height);
    //   const ctx = canvas.getContext('2d');
    //   const labelName = name + '_labels';
    //   var imageData;
    //   ctx.putImageData(img, 0, 0);
    //
    //   for (var i = 0; i < nodeCount; i++) {
    //     var pixel = paintedArea[i];
    //     var px = pixel % img.width, py = Math.floor(pixel / img.width);
    //     var ox = px + label[pixel][0];
    //     var oy = py + label[pixel][1];
    //     var gradient = ctx.createLinearGradient(px, py, ox, oy);
    //     gradient.addColorStop(0, "rgba(0, 0, 255, 0.1)");
    //     gradient.addColorStop(1, "rgba(255, 0, 0, 0.1)");
    //
    //     ctx.beginPath();
    //     ctx.moveTo(px, py);
    //     ctx.lineTo(ox, oy);
    //     ctx.strokeStyle = gradient;
    //     ctx.stroke();
    //   }
    //
    //   imageData = ctx.getImageData(0, 0, img.width, img.height);
    //   return labelName;
    // }

    function PhotomontagePairwiseFnRGB(p1, p2, o1, o2) {
        o1 = (o1[0] + o1[1] * imgW) * 4;
        o2 = (o2[0] + o2[1] * imgW) * 4;
        var tmp = imgData[p1 + o1] - imgData[p2 + o2];
        tmp = tmp * tmp;
        var rgbDiff = tmp;
        tmp = imgData[p1 + 1 + o1] - imgData[p2 + 1 + o2];
        tmp = tmp * tmp;
        rgbDiff += tmp;
        tmp = imgData[p1 + 2 + o1] - imgData[p2 + 2 + o2];
        tmp = tmp * tmp;
        rgbDiff += tmp;

        return isNaN(rgbDiff) ? INVALID_COST : rgbDiff;
    }

    function PhotomontageUnaryFnRGB(p1, p2, o1) {
        o1 = (o1[0] + o1[1] * imgW) * 4;
        var tmp = imgData[p1 + o1] - imgData[p2];
        tmp = tmp * tmp;
        var rgbDiff = tmp;
        tmp = imgData[p1 + 1 + o1] - imgData[p2 + 1];
        tmp = tmp * tmp;
        rgbDiff += tmp;
        tmp = imgData[p1 + 2 + o1] - imgData[p2 + 2];
        tmp = tmp * tmp;
        rgbDiff += tmp;

        return isNaN(rgbDiff) ? INVALID_COST : rgbDiff;
    }

    function PhotomontagePairwiseFn(p1, p2, o1, o2) {
        o1 = (o1[0] + o1[1] * imgW) * 4;
        o2 = (o2[0] + o2[1] * imgW) * 4;
        var tmp = imgData[p1 + o1] - imgData[p1 + o2];
        tmp = tmp * tmp;
        var t1 = tmp;
        tmp = imgData[p1 + o1 + 1] - imgData[p1 + o2 + 1];
        tmp = tmp * tmp;
        t1 += tmp;
        tmp = imgData[p1 + o1 + 2] - imgData[p1 + o2 + 2];
        tmp = tmp * tmp;
        t1 += tmp;

        tmp = imgData[p2 + o1] - imgData[p2 + o2];
        tmp = tmp * tmp;
        var t2 = tmp;
        tmp = imgData[p2 + o1 + 1] - imgData[p2 + o2 + 1];
        tmp = tmp * tmp;
        t2 += tmp;
        tmp = imgData[p2 + o1 + 2] - imgData[p2 + o2 + 2];
        tmp = tmp * tmp;
        t2 += tmp;

        var cost = t1 + t2;

        //if (isNaN(cost)) {
        //    p1 /= 4;
        //    p2 /= 4;
        //    o1 /= 4;
        //    o2 /= 4;
        //    console.log("ERROR WITH (" + p1 % imgW + ", " + Math.floor(p1 / imgW) + ")  ("
        //        + p2 % imgW + ", " + Math.floor(p2 / imgW) + ") at offsets ("
        //        + o1 % imgW + ", " + Math.floor(o1 / imgW) + ") (" + o2 % imgW + ", " + Math.floor(o2 / imgW) + ")\n ++ <" + alphaX + ", " + alphaY + ", " + px + ", " + py + ">");
        //    ggg++;
        //}

        return isNaN(cost) ? INVALID_COST : cost;
    }

    function PhotomontageUnaryFn(p1, p2, o1) {
        o1 = (o1[0] + o1[1] * imgW) * 4;
        var w4 = imgW * 4;
        var tmp = imgData[p1 + o1] - imgData[p1];
        tmp = tmp * tmp;
        var t1 = tmp;
        tmp = imgData[p1 + o1 + 1] - imgData[p1 + 1];
        tmp = tmp * tmp;
        t1 += tmp;
        tmp = imgData[p1 + o1 + 2] - imgData[p1 + 2];
        tmp = tmp * tmp;
        t1 += tmp;

        tmp = imgData[p2 + o1] - imgData[p2];
        tmp = tmp * tmp;
        var t2 = tmp;
        tmp = imgData[p2 + o1 + 1] - imgData[p2 + 1];
        tmp = tmp * tmp;
        t2 += tmp;
        tmp = imgData[p2 + o1 + 2] - imgData[p2 + 2];
        tmp = tmp * tmp;
        t2 += tmp;

        var cost = t1 + t2;

        //if (isNaN(cost)) {
        //    p1 /= 4;
        //    p2 /= 4;
        //    o1 /= 4;
        //    console.log("ERROR WITH (" + p1 % imgW + ", " + Math.floor(p1 / imgW) + ")  ("
        //        + p2 % imgW + ", " + Math.floor(p2 / imgW) + ") at offsets ("
        //        + o1 % imgW + ", " + Math.floor(o1 / imgW) + ")    >>" + o1);
        //}

        return isNaN(cost) ? INVALID_COST : cost;
    }

    return findOptimalAssignment();
}

if (typeof module !== 'undefined' && module.exports)
    module.exports = PhotomontageGraphCut;
else
    this.Photomontage = PhotomontageGraphCut;
