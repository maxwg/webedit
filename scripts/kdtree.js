/*******************************************************************************
 ** kdtree.js
 ** Copyright (C) 2015, Max Wang <maxw@inbox.com>
 ** Implements a KDTree datastructure.
 ** points : Array of vectors [[Comparable]] - vectors must be of same dimension
 ** leaf_size : maximum size of final leaves
 ** type: either "tree" or "map"
 **
 ** Return: type =  map: Binds leaves to each point element, adding the .leaf property
 *           type = tree: returns a KDTree object with properties
 *                        dimension: dimension of split. -1 indicates a leaf, containing elements:[point].
 *                        median : median of split in dimension.
 *                        left: left subtree
 *                        right: right subtree
 *
 *******************************************************************************/

"use strict";

var KDTREE = function (points, leaf_size, type) {
    const LEAF_SIZE = leaf_size;
    var pointSize = points[0].length;

    var createKDTree = function (points) {
        if (points.length <= LEAF_SIZE) {
            return {
                dimension: -1,
                elements: points
            };
        }

        var maxVarianceDim = dimensionOfMaximumVariance(points);
        var dim = maxVarianceDim[0];
        var stDev = Math.sqrt(maxVarianceDim[1] / points.length);
        if (stDev < 0.0001) { //All patches are effectively the same
            return {
                dimension: -1,
                elements: [points[~~(points.length / 2)]]
            };
        }

        var median = medianofMedians(points, dim, 0, points.length - 1)[dim];
        var left = [];
        var right = [];
        var eq = [];
        for (var i = 0, numPoints = points.length; i < numPoints; i++) {
            var curpt = points[i];
            var curptval = curpt[dim];
            if (curptval < median)
                left.push(curpt);
            else if (curptval > median)
                right.push(curpt);
            else  //eq prevents 0 element branches in the case the median makes up a majority.
                eq.push(curpt);
        }
        if (eq.length > 0) {
            if (right.length == 0) {
                median -= 0.01;
                Array.prototype.push.apply(right, eq);
            }
            else
                Array.prototype.push.apply(left, eq);
        }
        return {
            median: median,
            dimension: dim,
            left: createKDTree(left),
            right: createKDTree(right)
        };
    }

    function createKDMap(points) {
        var numPoints = points.length;
        if (numPoints <= LEAF_SIZE) {
            for (var i = 0; i < numPoints; i++)
                points[i].leaf = points;
            return;
        }

        var maxVarianceDim = dimensionOfMaximumVariance(points);
        var dim = maxVarianceDim[0];
        var stDev = Math.sqrt(maxVarianceDim[1] / (numPoints));
        if (stDev < 0.05) { //All patches are effectively the same
            for (var i = 0; i < numPoints; i++)
                points[i].leaf = [points[~~(points.length / 2)]];
            return;
        }
        var median = medianofMedians(points, dim, 0, points.length - 1)[dim];
        var left = [];
        var right = [];
        for (var i = 0; i < numPoints; i++) {
            var curpt = points[i];
            var curptval = curpt[dim];
            if (curptval < median)
                left.push(curpt);
            else if (curptval > median)
                right.push(curpt);
            else  //eq prevents 0 element branches in the case the median makes up a majority.
                (Math.random() < 0.5) ? right.push(curpt) : left.push(curpt);
        }

        createKDMap(left);
        createKDMap(right);
    }

    function dimensionOfMaximumVariance(points) {
        var maxVariance = -1;
        var maxVarianceDimension;
        //Get dimension of maximum "spread"
        for (var dim = 0; dim < pointSize; dim++) {
            var mean = 0.0;
            var variance = 0.0;
            for (var j = 0, numPoints = points.length; j < numPoints; j++) { //j is the point number.
                var prevMean = mean;
                var value = points[j][dim];
                mean += (value - prevMean) / (j + 1);
                variance += (value - prevMean) * (value - mean);
            }
            if (variance > maxVariance) {
                maxVariance = variance;
                maxVarianceDimension = dim;
            }
        }
        return [maxVarianceDimension, maxVariance];
    }

    function medianofMedians(vectors, dim, left, right) {
        const rl = right - left;
        if(rl <= 1)
            return vectors[left];
        if(rl <= 3)
            return vectors[medianOfThreeFour(vectors, dim, left)];
        if(rl == 4)
            return vectors[medianOfFive(vectors, dim, left)];

        var momArray = [];
        var i;
        const rn5 = right - 5;
        for (i = left; i <= rn5; i += 5) {
            momArray.push(vectors[medianOfFive(vectors, dim, i)])
        }
        if(i < rn5){
            var len = rn5 - i;
            if(len <=1)
                momArray.push(vectors[i+5]);
            else
                momArray.push(vectors[medianOfThreeFour(vectors, dim, i+5)]);
        }

        return medianofMedians(momArray, dim, 0, momArray.length -1);
    }

    function medianOfFive(vectors, dim, start){
        var a = vectors[start][dim];
        var b = vectors[start+1][dim];
        var c = vectors[start+2][dim];
        var d = vectors[start+3][dim];
        var e = vectors[start+4][dim];
        return b < a ? d < c ? b < d ? a < e ? a < d ? e < d ? start+4 : start+3
            : c < a ? start+2 : start
            : e < d ? a < d ? start : start+3
            : c < e ? start+2 : start+4
            : c < e ? b < c ? a < c ? start : start+2
            : e < b ? start+4 : start+1
            : b < e ? a < e ? start : start+4
            : c < b ? start+2 : start+1
            : b < c ? a < e ? a < c ? e < c ? start+4 : start+2
            : d < a ? start+3 : start
            : e < c ? a < c ? start : start+2
            : d < e ? start+3 : start+4
            : d < e ? b < d ? a < d ? start : start+3
            : e < b ? start+4 : start+2
            : b < e ? a < e ? start : start+4
            : d < b ? start+3 : start+1
            : d < c ? a < d ? b < e ? b < d ? e < d ? start+4 : start+3
            : c < b ? start+2 : start+1
            : e < d ? b < d ? start+1 : start+3
            : c < e ? start+2 : start+4
            : c < e ? a < c ? b < c ? start+1 : start+2
            : e < a ? start+4 : start
            : a < e ? b < e ? start+1 : start+4
            : c < a ? start+2 : start
            : a < c ? b < e ? b < c ? e < c ? start+4 : start+2
            : d < b ? start+3 : start+1
            : e < c ? b < c ? start+1 : start+2
            : d < e ? start+3 : start+4
            : d < e ? a < d ? b < d ? start+1 : start+3
            : e < a ? start+4 : start
            : a < e ? b < e ? start+1 : start+4
            : d < a ? start+3 : start;
    }

    function medianOfThreeFour(vectors, dim, start){
        var a = vectors[start][dim];
        var b = vectors[start+1][dim];
        var c = vectors[start+2][dim];

        return a < b ? b < c ? start+1
            : c < a ? start : start+2
            : a < c ? start
            : c < b ? start + 1 : start + 2;
    }

    function insertSort(vectors, dim, left, right) {
        for (var i = left + 1; i < right; i++) {
            var j = i;
            while (j > left && vectors[j - 1][dim] > vectors[j][dim]) {
                var tmp = vectors[j];
                vectors[j] = vectors[j - 1];
                vectors[j - 1] = tmp;
                j--;
            }
        }
    }

    return type == 'tree' ? createKDTree(points) : createKDMap(points);
};

if (typeof module !== 'undefined' && module.exports)
    module.exports = KDTREE;
else
    this.KDTree = KDTREE;
