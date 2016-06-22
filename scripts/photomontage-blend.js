/*******************************************************************************
 ** photomontageblend.js
 ** Copyright (C) 2015, Max Wang <maxw@inbox.com>
 ** Adapts Chris Tralie's poisson blending algorithm for application on
 ** photomontage labelling blending.
 ** http://www.ctralie.com/Teaching/PoissonImageEditing/#source
 **
 ** PARAMS:  img: base image
 *          label: object mapping pixel to labelling (offset)
 *          paintedArea: array specifying each pixel to be inpainted,
 *          pixelNode: array mapping each painted pixel to a graph node.
 *******************************************************************************/

"use strict";

var POISSONBLEND = function (img, label, paintedArea, pixelNode) {
    const omega = 1.95;
    var labelling = [], //array of labels [[label1 pixels], [label2 pixels] ...];
        labellingidx = {},
        nodeToLabelIdx = [],
        labels = 0,
        imgData = img.data,
        width = img.width,
        height = img.height;

    for (var i = 0, paintLen = paintedArea.length; i < paintLen; i++) {
        var lbl = label[paintedArea[i]];
        if (lbl in labellingidx) {
            nodeToLabelIdx[i] = labelling[labellingidx[lbl]].length;
            labelling[labellingidx[lbl]].push(i);
        }
        else {
            labellingidx[lbl] = labels;
            labelling[labels] = [i] // ERORR HERE
            labels++;
        }
    }
//    console.log([labels, labelling[0].length, paintedArea.length]);

    for (var lbl = 0; lbl < labels; lbl++) {
        var lblRegion = labelling[lbl],
            regionSize = lblRegion.length,
            diagonal = new Uint8Array(regionSize),
            offDiagonal = new Int32Array(regionSize * 4),
            result = new Float32Array(regionSize * 3),
            target = new Float32Array(regionSize * 3),
            prevResult = new Float32Array(regionSize * 3);

        var neighbours = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (var i = 0; i < regionSize; i++) {
            var lblIdx = lblRegion[i];
            var lblPx = label[paintedArea[lblIdx]];
            var lblOff = (lblPx[0] + lblPx[1] * width) * 4;
            var validNeighbours = 0;
            var selPx = paintedArea[lblIdx];
            var x = selPx % width;
            var y = ~~(selPx / width);
            var red = imgData[selPx * 4 + lblOff];
            var green = imgData[selPx * 4 + lblOff + 1];
            var blue = imgData[selPx * 4 + lblOff + 2];

            target[i * 3] = 0.0;
            target[i * 3 + 1] = 0.0;
            target[i * 3 + 2] = 0.0;
            for (var k = 0; k < neighbours.length; k++) {
                var x2 = x + neighbours[k][0];
                var y2 = y + neighbours[k][1];
                offDiagonal[i * 4 + k] = -1;
                if (x2 < 0 || x2 > width - 1 || y2 < 0 || y2 > height - 1)
                    continue;
                validNeighbours++;
                var index = pixelNode[x2 + y2 * width];
                if (index == undefined) { //border pixel
                    target[i * 3] += imgData[(x2 + y2 * width) * 4];
                    target[i * 3 + 1] += imgData[(x2 + y2 * width) * 4 + 1];
                    target[i * 3 + 2] += imgData[(x2 + y2 * width) * 4 + 2];
                } else if (label[x2 + y2 * width] == lblPx) {
                    offDiagonal[i * 4 + k] = nodeToLabelIdx[index];
                    var red2 = imgData[(x2 + y2 * width) * 4 + lblOff];
                    var green2 = imgData[(x2 + y2 * width) * 4 + 1 + lblOff];
                    var blue2 = imgData[(x2 + y2 * width) * 4 + 2 + lblOff];
                    target[i * 3] += red - red2;
                    target[i * 3 + 1] += green - green2;
                    target[i * 3 + 2] += blue - blue2;
                }
                else {
                    var lOff = (label[x2 + y2 * width][0] + label[x2 + y2 * width][1] * width) * 4;
                    target[i * 3] += imgData[(x2 + y2 * width) * 4 + lOff];
                    target[i * 3 + 1] += imgData[(x2 + y2 * width) * 4 + 1 + lOff];
                    target[i * 3 + 2] += imgData[(x2 + y2 * width) * 4 + 2 + lOff];
                }
            }
            diagonal[i] = validNeighbours;
        }

        var iteration = 0;
        var error;
        do {
            error = PoissonError();
            iteration++;
            for (var i = 0; i < 100; i++)
                PoissonIteration();
//            console.log(error);
        } while (error > 5);

        for (var i = 0; i < regionSize; i++) {
            var selPx = paintedArea[lblRegion[i]];
            imgData[selPx * 4] = result[i * 3];
            imgData[selPx * 4 + 1] = result[i * 3 + 1];
            imgData[selPx * 4 + 2] = result[i * 3 + 2];
        }
        //console.log(result);

        function PoissonIteration() {
            for (var i = 0; i < regionSize; i++) {
                prevResult[i * 3] = result[i * 3];
                prevResult[i * 3 + 1] = result[i * 3 + 1];
                prevResult[i * 3 + 2] = result[i * 3 + 2];
                result[i * 3] = target[i * 3];
                result[i * 3 + 1] = target[i * 3 + 1];
                result[i * 3 + 2] = target[i * 3 + 2];
                for (var n = 0; n < 4; n++) {
                    if (offDiagonal[i * 4 + n] >= 0) {
                        var index = offDiagonal[i * 4 + n];
                        result[i * 3] += result[index * 3];
                        result[i * 3 + 1] += result[index * 3 + 1];
                        result[i * 3 + 2] += result[index * 3 + 2];
                    }
                }

                result[i * 3] = prevResult[i * 3] + omega * (result[i * 3] / diagonal[i] - prevResult[i * 3]);
                result[i * 3 + 1] = prevResult[i * 3 + 1] + omega * (result[i * 3 + 1] / diagonal[i] - prevResult[i * 3 + 1]);
                result[i * 3 + 2] = prevResult[i * 3 + 2] + omega * (result[i * 3 + 2] / diagonal[i] - prevResult[i * 3 + 2]);
            }
        }

        function PoissonError() {
            var total = 0.0;
            for (var i = 0; i < regionSize; i++) {
                var e1 = target[i * 3];
                var e2 = target[i * 3 + 1];
                var e3 = target[i * 3 + 2];
                for (var n = 0; n < 4; n++) {
                    if (offDiagonal[i * 4 + n] >= 0) {
                        var index = offDiagonal[i * 4 + n];
                        e1 += result[index * 3];
                        e2 += result[index * 3 + 1];
                        e3 += result[index * 3 + 2];
                    }
                }
                e1 -= diagonal[i] * result[i * 3];
                e2 -= diagonal[i] * result[i * 3 + 1];
                e3 -= diagonal[i] * result[i * 3 + 2];
                total += e1 * e1 + e2 * e2 + e3 * e3;
            }
            return Math.sqrt(total);
        }
    }

    return imgData;
}

if (typeof module !== 'undefined' && module.exports)
    module.exports = POISSONBLEND;
else
    this.PoissonBlend = POISSONBLEND;

