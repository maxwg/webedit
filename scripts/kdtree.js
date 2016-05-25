/*  points: (x, y) :: (int, int) pixel coord
            v :: Array of WHT vectors, each of equal dimension
    Finds dimension with maximum StDev(variance), and splits at the median of that dimension.
*/
const LEAFSIZE = 32;
var KDTree = function (points) {
    if (points.length <= LEAFSIZE) {
        this.dimension = -1;
        this.elements = points;
        for (var i = 0; i < points.length; i++)
            points[i].leaf = this;
        return;
    }
    //  else {
    this.dimension = 0;
    var curMaxVariance = -1;
    var maxDimMean = 0;
    //Get dimension of maximum "spread"
    for (var i = 0; i < points[0].v.length; i++) { //i is the dimension
        //Calculate the variance of the dimension with Welford's Method
        //Two-Pass may potentially be more efficient.
        var mean = 0.0;
        var variance = 0.0;
        for (var j = 0; j < points.length; j++) { //j is the point number.
            var prevMean = mean;
            var value = points[j].v[i];
            mean += (value - prevMean) / (j + 1);
            variance += (value - prevMean) * (value - mean);
        }
        if (variance > curMaxVariance) {
            curMaxVariance = variance;
            maxDimMean = mean;
            this.dimension = i;
        }
    }
    var stDev = Math.sqrt(curMaxVariance / (points.length));
    if (stDev < 0.001) { //All patches are effectively the same
        //var newpts = points;
        /*var increment = ~~(points.length / LEAFSIZE);
        for (i = 0; i < LEAFSIZE; i++) {
            newpts.push(points[i]);
        }*/
        // newpts.push(points[~~(points.length / 2)]);
        for (var i = 0; i < points.length; i++)
            points[i].leaf = this;
        this.dimension = -1;
        this.elements = [points[0]];
        return;
    }
    //Find the median of this dimension, and split the tree here.
    if (points.length < 20000) { //Median of Medians - slower, yet more accurate
        var medIndex = MedianofMedians(points, this.dimension, 0, points.length - 1);
        this.median = points[medIndex].v[this.dimension];
    }
    else { //binApprox - accurate and fast for large sets, yet rounding error makes it unsuitable for smaller
        this.median = Median(points, this.dimension, maxDimMean, stDev);
    }
    //console.log(this.median);
    // this.median = maxDimMean;
    var left = [];
    var right = [];
    var eq = [];
    for (var i = 0; i < points.length; i++) {
        var curpt = points[i];
        var curptval = curpt.v[this.dimension];
        if (curptval < this.median)
            left.push(curpt);
        else if (curptval > this.median)
            right.push(curpt);
        else { //eq prevents 0 element branches in the case the median makes up a majority.
            eq.push(curpt)
        }
    }
    if (eq.length > 0) {
        if (right.length == 0) {
            this.median -= 0.01;
            Array.prototype.push.apply(right, eq);
        }
        else {
            Array.prototype.push.apply(left, eq);
        }

    }
    // console.log("left: " + left.length);
    //console.log("right: " + right.length);

    //*********************************DEBUG -- REMOVE FROM FINAL FOR PERFORMANCE*****************************
    if (left.length == 0 || right.length == 0) {
        console.log("ZERO LENGTH LIST! Median: " + this.median + " eq " + eq.length + " stdev: " + stDev + "mean: " + maxDimMean + " dimension: " + this.dimension);
        console.log(points);
        console.log(left);
        console.log(right);
        console.log(eq);
        throw new Error();
    }
    //*******************************End DEBUG **************

    this.left = new KDTree(left);
    this.right = new KDTree(right);
    //   }
}

KDTree.prototype.GetContainingLeaf = function (point) {
    if (this.dimension == -1)
        return this;
    else if (point.v[this.dimension] <= this.median)
        this.left.GetContainingLeaf(point);
    else
        this.right.GetContainingLeaf(point);

}


//BinMedian Algorithm -- http://www.stat.cmu.edu/~ryantibs/median/
//Uses BinApprox for performance -- 1/1000th of a standard deviation not significant.
function Median(vectors, dimension, mean, stDev) {
    var count = 0;
    var n = vectors.length;
    var binCount = Log2(n) * 6 + 40; //Requires Log2 in walshhadamard.js
    //Number of bins - determines accuracy.
    var bins = [];
    for (var i = 0; i < binCount; i++) {
        bins[i] = 0;
    }
    var scalefactor = binCount / (2 * stDev);
    var leftend = mean - stDev;
    var rightend = mean + stDev;
    var bin;
    for (var i = 0; i < n; i++) {
        var val = vectors[i].v[dimension];
        if (val < leftend) {
            count++;
        }
        else if (val < rightend) {
            bin = ~~((val - leftend) * scalefactor);
            bins[bin]++;
        }
    }
    //console.log(count + " -- " + stDev + " - " + mean);
    //If vectors.length is odd
    if (n & 1) {
        var k = (n + 1) / 2;
        for (var i = 0; i < binCount; i++) {
            count += bins[i];
            if (count >= k) {
                return (i + 0.5) / scalefactor + leftend;
            }
        }
    }
    else {
        var k = n / 2;
        for (var i = 0; i < binCount; i++) {
            count += bins[i];
            if (count >= k) {
                var j = i;
                while (count == k) {
                    j++;
                    count += bins[j];
                }
                return (i + j + 1) / (2 * scalefactor) + leftend;
            }
        }

    }
    console.log("ERROR:: Could not find median -- " + (n & 1) + " " + binCount + " " + count);
    throw new Error();
}


//Median of Medians function for point vectors
//Each Vector is x:int, y:int, v:[int]
//O(n), estimates median with a reasonable accuracy.
//Appears to be too slow.
function MedianofMedians(vectors, dimension, left, right) {
    if (right - left <= 4) {
        InsertSort(vectors, dimension, left, right + 1);
        return ~~((right + left) / 2); //Middle Element Index
    }
    for (var i = left; i <= right - 5; i += 5) {
        var median = MedianofMedians(vectors, dimension, i, i + 4);
        var base = ~~(i / 5);
        var tmpMed = vectors[median];
        vectors[median] = vectors[base];
        vectors[base] = tmpMed;
    }
    return MedianofMedians(vectors, dimension, 0, ~~((right + 1) / 5));
}

//Fast median of 5 through encoding if statements
//Given that the code is compiled (ala chrome)
//i give up
function SelectMed5(vectors, dimension, left) {
    var index = 0;
    var v0 = vectors[0].v[dimension];
    var v1 = vectors[1].v[dimension];
    var v2 = vectors[2].v[dimension];
    var v3 = vectors[3].v[dimension];
    var v4 = vectors[4].v[dimension];
    if (v0 > v1) {   // v1 -- v0

    }
    else { //v0 -- v1
        if (v1 > v2) { // v0 -- v2 -- v1 
            if (v2 > v3) { //(v0, v3)? -- v2 -- v1 
                if (v4 > v2) { //(v0, v3) -- v2 -- (v1, v4)
                    return 2;
                }
                else { //(v0, v3, v4) -- v2 -- v1
                    if (v0 > v3) {
                        if (v0 > v4) { // (v3, v4) --v0 --v2 --v1
                            return 0;
                        }
                        // v0 > v3 && v0 <= v4 => v3 -- v0 -- v4
                        return 4;
                    }
                    else { //v0, v3, v4 
                        if (v3 > v4) {
                            return 3;
                        }
                        return 4; // v3 <= v4 && v0 <= v3 => v0 -- v3 --- v4 
                    }
                }
            }
            else {  // v0 -- v1 -- v2 
                if (v3 > v2) { // v0 -- v1 -- v2 -- v3

                }
            }
        }
        else {

        }
    }
}


function InsertSort(vectors, dimension, left, right) {
    for (var i = left + 1; i < right; i++) {
        var j = i;
        while (j > left && vectors[j - 1].v[dimension] > vectors[j].v[dimension]) {
            var tmp = vectors[j];
            vectors[j] = vectors[j - 1];
            vectors[j - 1] = tmp;
            j--;
        }
    }
}