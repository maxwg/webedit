/*******************************************************************************
 ** maxflow.js
 ** Copyright (C) 2015, Stephen Gould <stephen.gould@anu.edu.au>
 ** OO conversion and slight optimizations by Max Wang <maxw@inbox.com>
 *
 * Usage:
 *    var graph = new MAXFLOWGRAPH(500);
 *    graph.addSourceEdge(0, 100);
 *    graph.setEdge(0, 1, 50);
 *    graph.maxFlow();
 *    console.log(graph.cut[0]) -- TARGET
 *******************************************************************************/
/*
 return { //public methods
 print: print,
 maxFlow: flowBoykovKomogorov,
 addSourceEdge: addSourceEdge,
 setSourceEdge: setSourceEdge,
 addTargetEdge: addTargetEdge,
 setTargetEdge: setTargetEdge,
 reset: reset
 };
 */
if (typeof module !== 'undefined' && module.exports)
    "use strict";

var MAXFLOWGRAPH = function (numNodes) {
    const MAX_FLOW_FREE = -2;
    const MAX_FLOW_TERMINAL = -1;
    const MAX_FLOW_TARGET = 0;
    const MAX_FLOW_SOURCE = 1;

    var sourceEdges = new Float32Array(numNodes);   // edges leaving the source node
    var targetEdges = new Float32Array(numNodes);   // edges entering the target node
    var nodes = [];         // nodes and their outgoing internal edges (node, w, rindx)

    var flowValue = 0;      // current flow value
    var cut = new Int8Array(numNodes);           // S-set or T-set for each node

    for (var i = numNodes; i > 0; i--) {
        nodes.push([]);
        cut[i] = MAX_FLOW_TERMINAL;
    }

    function maxFlowAssert(b, msg) {
        if (!b) throw new Error(msg);
    }

    function print() {
        var str = "";
        for (var v = 0; v < sourceEdges.length; v++) {
            if (sourceEdges[v] > 0.0) {
                str += "s --> " + v + " : " + sourceEdges[v] + "\n";
            }
        }

        for (var u = 0; u < numNodes; u++) {
            for (var i = 0; i < nodes[u].length; i++) {
                if (nodes[u][i].w > 0.0) {
                    str += u + " --> " + nodes[u][i].node + " : " + nodes[u][i].w + "\n";
                }
            }
        }

        for (var u = 0; u < targetEdges.length; u++) {
            if (targetEdges[u] > 0.0) {
                str += u + " --> t : " + targetEdges[u] + "\n";
            }
        }

        return str;
    }

    function addConstant() {
        flowValue += c;
    }

    function addSourceEdge(u, c) {
        if (c > 0.0) {
            sourceEdges[u] += c;
        } else {
            targetEdges[u] -= c;
            flowValue += c;
        }
    }

    function setSourceEdge(u, c) {
        sourceEdges[u] = c;
    }

    function addTargetEdge(u, c) {
        if (c > 0.0) {
            targetEdges[u] += c;
        } else {
            sourceEdges[u] -= c;
            flowValue += c;
        }
    }

    function setTargetEdge(u, c) {
        targetEdges[u] = c;
    }

    function setEdge(u, v, c) {
        var indx = findEdge(u, v);
        if (indx < 0) {
            nodes[u].push({node: v, w: c, rindx: nodes[v].length});
            nodes[v].push({node: u, w: 0.0, rindx: nodes[u].length - 1});
        } else {
            nodes[u][indx].w = c;
        }
    }

    function reset() {
        flowValue = 0;
        for (i = 0; i < numNodes; i++) {
            cut[i] = MAX_FLOW_TERMINAL;
            var inode = nodes[i];
            for (var j = 0, nl = inode.length; j < nl; j++) {
                inode[j].w = 1000000000000;
            }
        }
    }

    // Returns the index of the neighbour of u in g.
    function findEdge(u, v) {
        var unode = nodes[u];
        for (var i = 0, nl = unode.length; i < nl; i++) {
            if (unode[i].node == v) {
                return i;
            }
        }
        return -1;
    }

    function preAugment() {
        for (var u = 0; u < numNodes; u++) {
            // augment s-u-t paths
            if ((sourceEdges[u] > 0.0) && (targetEdges[u] > 0.0)) {
                var c = Math.min(sourceEdges[u], targetEdges[u]);
                flowValue += c;
                sourceEdges[u] -= c;
                targetEdges[u] -= c;
            }

            if (sourceEdges[u] == 0.0) continue;

            // augment s-u-v-t paths
            var unode = nodes[u];
            for (var i = 0, nl = unode.length; i < nl; i++) {
                var v = unode[i].node;
                var ri = unode[i].rindx;
                var tw = unode[i].w;
                if ((tw == 0.0) || (targetEdges[v] == 0.0)) continue;

                var w = Math.min(tw, Math.min(sourceEdges[u], targetEdges[v]));
                sourceEdges[u] -= w;
                targetEdges[v] -= w;
                unode[i].w -= w;
                nodes[v][ri].w += w;
                flowValue += w;

                if (sourceEdges[u] == 0.0) break;
            }
        }
    }

    function flowEdmondsKarp() {
        // pre-augment
        preAugment();

        while (true) {
            // find augmenting path
            var frontier = [];
            var backtrack = [];
            for (var u = 0; u < nodes.length; u++) {
                if (sourceEdges[u] > 0.0) {
                    frontier.push(u);
                    backtrack.push(MAX_FLOW_TERMINAL);
                } else {
                    backtrack.push(MAX_FLOW_FREE);
                }
            }

            var u = MAX_FLOW_TERMINAL;
            while (frontier.length > 0) {
                u = frontier.shift(); // pop and return front
                if (targetEdges[u] > 0.0) {
                    break;
                }
                for (var i = 0; i < nodes[u].length; i++) {
                    if ((nodes[u][i].w > 0.0) && (backtrack[nodes[u][i].node] == MAX_FLOW_FREE)) {
                        frontier.push(nodes[u][i].node);
                        backtrack[nodes[u][i].node] = u;
                    }
                }

                u = MAX_FLOW_TERMINAL;
            }

            if (u == MAX_FLOW_TERMINAL) break;

            // backtrack
            var path = [];
            var c = targetEdges[u];
            while (backtrack[u] != MAX_FLOW_TERMINAL) {
                var v = u;
                u = backtrack[v];
                var e = findEdge(u, v);
                c = Math.min(c, nodes[u][e].w);
                path.push(e);
            }
            c = Math.min(c, sourceEdges[u]);

            sourceEdges[u] -= c;
            for (var i = path.length - 1; i >= 0; i--) {
                var v = nodes[u][path[i]].node;
                var ri = nodes[u][path[i]].rindx;
                nodes[u][path[i]].w -= c;
                nodes[v][ri].w += c;
                u = v;
            }
            targetEdges[u] -= c;

            flowValue += c;
        }

        // fill cut variable with 1 for S-set and 0 for T-set
        for (var u = 0; u < cut.length; u++) {
            cut[u] = MAX_FLOW_TARGET;
        }

        var frontier = [];
        for (var u = 0; u < nodes.length; u++) {
            if (sourceEdges[u] > 0.0) {
                frontier.push(u);
                cut[u] = MAX_FLOW_SOURCE;
            }

            while (frontier.length > 0) {
                var u = frontier.shift();
                for (var i = 0; i < nodes[u].length; i++) {
                    var v = nodes[u][i].node;
                    if ((nodes[u][i].w > 0.0) && (cut[v] != MAX_FLOW_SOURCE)) {
                        frontier.push(v);
                        cut[v] = MAX_FLOW_SOURCE;
                    }
                }
            }
        }

        return flowValue;
    }

    function flowBoykovKomogorov() {
        // pre-augment paths
        preAugment();

        // initialize search trees
        var parents = new Int8Array(numNodes);
        var active = [];
        for (var u = 0; u < numNodes; u++) {
            if (sourceEdges[u] > 0.0) {
                cut[u] = MAX_FLOW_SOURCE;
                parents[u] = MAX_FLOW_TERMINAL;
                active.push(u);
            } else if (targetEdges[u] > 0.0) {
                cut[u] = MAX_FLOW_TARGET;
                parents[u] = MAX_FLOW_TERMINAL;
                active.push(u);
            } else {
                parents[u] = MAX_FLOW_FREE;
                cut[u] = MAX_FLOW_FREE;
            }
        }

        // find augmenting paths
        while (active.length > 0) {
            // expand trees
            var u = active[0];
            var path = [];
            if (cut[u] == MAX_FLOW_SOURCE) {
                for (var i = 0; i < nodes[u].length; i++) {
                    var v = nodes[u][i].node;
                    if (nodes[u][i].w > 0.0) {
                        if (cut[v] == MAX_FLOW_FREE) {
                            cut[v] = MAX_FLOW_SOURCE;
                            parents[v] = nodes[u][i].rindx;
                            active.push(v);
                        } else if (cut[v] == MAX_FLOW_TARGET) {
                            // found augmenting path (node, neighbour index)
                            path = [u, i];
                            break;
                        }
                    }
                }
            } else {
                for (var i = 0; i < nodes[u].length; i++) {
                    var v = nodes[u][i].node;
                    var ri = nodes[u][i].rindx;
                    if (nodes[v][ri].w > 0.0) {
                        if (cut[v] == MAX_FLOW_FREE) {
                            cut[v] = MAX_FLOW_TARGET;
                            parents[v] = ri;
                            active.push(v);
                        } else if (cut[v] == MAX_FLOW_SOURCE) {
                            // found augmenting path (node, neighbour index)
                            path = [v, ri];
                            break;
                        }
                    }
                }
            }

            if (path.length == 0) {
                active.shift();
                continue;
            }

            // augment path
            var c = nodes[path[0]][path[1]].w;
            // backtrack
            u = path[0];
            while (parents[u] != MAX_FLOW_TERMINAL) {
                var v = nodes[u][parents[u]].node;
                var ri = nodes[u][parents[u]].rindx;
                c = Math.min(c, nodes[v][ri].w);
                u = v;
            }
            c = Math.min(c, sourceEdges[u]);

            // forward track
            u = nodes[path[0]][path[1]].node;
            while (parents[u] != MAX_FLOW_TERMINAL) {
                var v = nodes[u][parents[u]].node;
                c = Math.min(c, nodes[u][parents[u]].w);
                u = v;
            }
            c = Math.min(c, targetEdges[u]);

            maxFlowAssert(c != 0.0, "zero capacity augmenting path");

            var orphans = [];
            u = path[0];
            v = nodes[u][path[1]].node;
            nodes[u][path[1]].w -= c;
            nodes[v][nodes[u][path[1]].rindx].w += c;
            while (parents[u] != MAX_FLOW_TERMINAL) {
                var v = nodes[u][parents[u]].node;
                var ri = nodes[u][parents[u]].rindx;
                nodes[v][ri].w -= c;
                nodes[u][parents[u]].w += c;
                if (nodes[v][ri].w == 0.0) {
                    orphans.push(u);
                }
                u = v;
            }
            sourceEdges[u] -= c;
            if (sourceEdges[u] == 0.0) {
                orphans.push(u);
            }
            u = nodes[path[0]][path[1]].node;
            while (parents[u] != MAX_FLOW_TERMINAL) {
                var v = nodes[u][parents[u]].node;
                var ri = nodes[u][parents[u]].rindx;
                nodes[u][parents[u]].w -= c;
                nodes[v][ri].w += c;
                if (nodes[u][parents[u]].w == 0.0) {
                    orphans.push(u);
                }
                u = v;
            }
            targetEdges[u] -= c;
            if (targetEdges[u] == 0.0) {
                orphans.push(u);
            }

            flowValue += c;

            // adopt orphans
            for (var i = 0; i < orphans.length; i++) {
                parents[orphans[i]] = MAX_FLOW_TERMINAL;
            }

            while (orphans.length > 0) {
                var u = orphans.pop();
                var treeLabel = cut[u];

                var bFreeOrphan = true;
                for (var i = 0; i < nodes[u].length; i++) {
                    // check if different tree or no capacity
                    var v = nodes[u][i].node;
                    var ri = nodes[u][i].rindx;
                    if (cut[v] != treeLabel) continue;
                    if ((treeLabel == MAX_FLOW_SOURCE) && (nodes[v][ri].w == 0.0)) continue;
                    if ((treeLabel == MAX_FLOW_TARGET) && (nodes[u][i].w == 0.0)) continue;

                    // check that u is not an ancestor of v
                    while ((v != u) && (parents[v] != MAX_FLOW_TERMINAL)) {
                        v = nodes[v][parents[v]].node;
                    }
                    if (v == u) continue;

                    // add as parent
                    parents[u] = i;
                    bFreeOrphan = false;
                    break;
                }

                if (bFreeOrphan) {
                    for (var i = 0; i < nodes[u].length; i++) {
                        var v = nodes[u][i].node;
                        if ((cut[v] == treeLabel) && (parents[v] == nodes[u][i].rindx)) {
                            parents[v] = MAX_FLOW_TERMINAL;
                            orphans.push(v);
                            if (active.indexOf(v) == -1) active.push(v);
                        }
                    }

                    // mark inactive and free
                    var indx = active.indexOf(u);
                    if (indx != -1) active.splice(indx, 1);
                    cut[u] = MAX_FLOW_FREE;
                }
            }
        }

        return flowValue;
    }

    return { //public methods
        print: print,
        maxFlow: flowBoykovKomogorov,
        addSourceEdge: addSourceEdge,
        setSourceEdge: setSourceEdge,
        addTargetEdge: addTargetEdge,
        setTargetEdge: setTargetEdge,
        setEdge: setEdge,
        reset: reset,
        cut: cut,
        FREE: MAX_FLOW_FREE,
        TERMINAL: MAX_FLOW_TERMINAL,
        TARGET: MAX_FLOW_TARGET,
        SOURCE: MAX_FLOW_SOURCE
    };
};

if (typeof module !== 'undefined' && module.exports)
    module.exports = MAXFLOWGRAPH;
else
    this.FlowGraph = MAXFLOWGRAPH;