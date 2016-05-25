/*******************************************************************************
** maxflow.js
** Copyright (C) 2015, Stephen Gould <stephen.gould@anu.edu.au>
** OO conversion and slight optimizations by Max Wang <maxw@inbox.com>
*******************************************************************************/

const MAX_FLOW_FREE = -2;
const MAX_FLOW_TERMINAL = -1;
const MAX_FLOW_TARGET = 0;
const MAX_FLOW_SOURCE = 1;

function maxFlowAssert(b, msg) {
    if (!b) throw new Error(msg);
}

var MaxFlowGraph = function () {
    this.sourceEdges = [];   // edges leaving the source node
    this.targetEdges = [];   // edges entering the target node
    this.nodes = [];         // nodes and their outgoing internal edges (node, w, rindx)

    this.flowValue = 0;      // current flow value
    this.cut = [];           // S-set or T-set for each node
}

var MaxFlowGraph = function (n) {
    this.sourceEdges = new Float32Array(n);   // edges leaving the source node
    this.targetEdges = new Float32Array(n);   // edges entering the target node
    this.nodes = [];         // nodes and their outgoing internal edges (node, w, rindx)

    this.flowValue = 0;      // current flow value
    this.cut = new Int8Array(n);           // S-set or T-set for each node

    for (var i = n; i > 0; i--) {
        this.nodes.push([]);
        this.cut[i] = MAX_FLOW_TERMINAL;
    }
}

MaxFlowGraph.prototype.NumNodes = function () {
    return this.nodes.length;
}

MaxFlowGraph.prototype.AddNodes = function (n) {
    for (var i = n; i > 0; i--) {
        this.nodes.push([]);
        this.sourceEdges.push(0.0); //Exception Here likely means the primative maxflowgraph was used
        this.targetEdges.push(0.0);
        this.cut.push(MAX_FLOW_TERMINAL);
    }
}

MaxFlowGraph.prototype.AddConstant = function (c) {
    this.flowValue += c;
}

MaxFlowGraph.prototype.AddSourceEdge = function (u, c) {
    if (c > 0.0) {
        this.sourceEdges[u] += c;
    } else {
        this.targetEdges[u] -= c;
        this.flowValue += c;
    }
}

MaxFlowGraph.prototype.SetSourceEdge = function (u, c) {
    this.sourceEdges[u] = c;
}

MaxFlowGraph.prototype.AddTargetEdge = function (u, c) {
    if (c > 0.0) {
        this.targetEdges[u] += c;
    } else {
        this.sourceEdges[u] -= c;
        this.flowValue += c;
    }
}

MaxFlowGraph.prototype.SetTargetEdge = function (u, c) {
    this.targetEdges[u] = c;
}

// Add an edge to the graph from u to v with (positive) capacity c.
MaxFlowGraph.prototype.AddEdge = function (u, v, c) {
    if (u == v) return;
    maxFlowAssert((u < this.nodes.length) && (v < this.nodes.length), "invalid node pair (" + u + ", " + v + ")");

    var indx = this.FindEdge(u, v);
    if (indx < 0) {
        this.nodes[u].push({ node: v, w: c, rindx: this.nodes[v].length });
        this.nodes[v].push({ node: u, w: 0.0, rindx: this.nodes[u].length - 1 });
    } else {
        this.nodes[u][indx].w += c;
    }
}

MaxFlowGraph.prototype.SetEdge = function (u, v, c) {
    var indx = this.FindEdge(u, v);
    if (indx < 0) {
        this.nodes[u].push({ node: v, w: c, rindx: this.nodes[v].length });
        this.nodes[v].push({ node: u, w: 0.0, rindx: this.nodes[u].length - 1 });
    } else {
        this.nodes[u][indx].w = c;
    }
}

MaxFlowGraph.prototype.Reset = function () {
    this.flowValue = 0;
    for (i = 0; i < this.cut.length; i++)
        this.cut[i] = MAX_FLOW_TERMINAL;
}

// Returns the index of the neighbour of u in g.
MaxFlowGraph.prototype.FindEdge = function (u, v) {
    for (var i = 0; i < this.nodes[u].length; i++) {
        if (this.nodes[u][i].node == v) {
            return i;
        }
    }
    return -1;
}

MaxFlowGraph.prototype.MaxFlowPreAugment = function () {
    for (var u = 0; u < this.nodes.length; u++) {
        // augment s-u-t paths
        if ((this.sourceEdges[u] > 0.0) && (this.targetEdges[u] > 0.0)) {
            var c = Math.min(this.sourceEdges[u], this.targetEdges[u]);
            this.flowValue += c;
            this.sourceEdges[u] -= c;
            this.targetEdges[u] -= c;
        }

        if (this.sourceEdges[u] == 0.0) continue;

        // augment s-u-v-t paths
        for (var i = 0; i < this.nodes[u].length; i++) {
            var v = this.nodes[u][i].node;
            var ri = this.nodes[u][i].rindx;
            if ((this.nodes[u][i].w == 0.0) || (this.targetEdges[v] == 0.0)) continue;

            var w = Math.min(this.nodes[u][i].w, Math.min(this.sourceEdges[u], this.targetEdges[v]));
            this.sourceEdges[u] -= w;
            this.targetEdges[v] -= w;
            this.nodes[u][i].w -= w;
            this.nodes[v][ri].w += w;
            this.flowValue += w;

            if (this.sourceEdges[u] == 0.0) break;
        }
    }
}

function maxFlowPrint(g) {
    var str = "";
    for (var v = 0; v < g.sourceEdges.length; v++) {
        if (g.sourceEdges[v] > 0.0) {
            str += "s --> " + v + " : " + g.sourceEdges[v] + "\n";
        }
    }

    for (var u = 0; u < g.nodes.length; u++) {
        for (var i = 0; i < g.nodes[u].length; i++) {
            if (g.nodes[u][i].w > 0.0) {
                str += u + " --> " + g.nodes[u][i].node + " : " + g.nodes[u][i].w + "\n";
            }
        }
    }

    for (var u = 0; u < g.targetEdges.length; u++) {
        if (g.targetEdges[u] > 0.0) {
            str += u + " --> t : " + g.targetEdges[u] + "\n";
        }
    }

    return str;
}

function maxFlowEdmondsKarp(g) {
    // pre-augment
    g.MaxFlowPreAugment();

    while (true) {
        // find augmenting path
        var frontier = [];
        var backtrack = [];
        for (var u = 0; u < g.nodes.length; u++) {
            if (g.sourceEdges[u] > 0.0) {
                frontier.push(u);
                backtrack.push(MAX_FLOW_TERMINAL);
            } else {
                backtrack.push(MAX_FLOW_FREE);
            }
        }

        var u = MAX_FLOW_TERMINAL;
        while (frontier.length > 0) {
            u = frontier.shift(); // pop and return front
            if (g.targetEdges[u] > 0.0) {
                break;
            }
            for (var i = 0; i < g.nodes[u].length; i++) {
                if ((g.nodes[u][i].w > 0.0) && (backtrack[g.nodes[u][i].node] == MAX_FLOW_FREE)) {
                    frontier.push(g.nodes[u][i].node);
                    backtrack[g.nodes[u][i].node] = u;
                }
            }

            u = MAX_FLOW_TERMINAL;
        }

        if (u == MAX_FLOW_TERMINAL) break;

        // backtrack
        var path = [];
        var c = g.targetEdges[u];
        while (backtrack[u] != MAX_FLOW_TERMINAL) {
            var v = u;
            u = backtrack[v];
            var e = g.FindEdge(u, v);
            c = Math.min(c, g.nodes[u][e].w);
            path.push(e);
        }
        c = Math.min(c, g.sourceEdges[u]);

        g.sourceEdges[u] -= c;
        for (var i = path.length - 1; i >= 0; i--) {
            var v = g.nodes[u][path[i]].node;
            var ri = g.nodes[u][path[i]].rindx;
            g.nodes[u][path[i]].w -= c;
            g.nodes[v][ri].w += c;
            u = v;
        }
        g.targetEdges[u] -= c;

        g.flowValue += c;
    }

    // fill cut variable with 1 for S-set and 0 for T-set
    for (var u = 0; u < g.cut.length; u++) {
        g.cut[u] = MAX_FLOW_TARGET;
    }

    var frontier = [];
    for (var u = 0; u < g.nodes.length; u++) {
        if (g.sourceEdges[u] > 0.0) {
            frontier.push(u);
            g.cut[u] = MAX_FLOW_SOURCE;
        }

        while (frontier.length > 0) {
            var u = frontier.shift();
            for (var i = 0; i < g.nodes[u].length; i++) {
                var v = g.nodes[u][i].node;
                if ((g.nodes[u][i].w > 0.0) && (g.cut[v] != MAX_FLOW_SOURCE)) {
                    frontier.push(v);
                    g.cut[v] = MAX_FLOW_SOURCE;
                }
            }
        }
    }

    return g.flowValue;
}

MaxFlowGraph.prototype.MaxFlowBK = function () {
    // pre-augment paths
    this.MaxFlowPreAugment();

    // initialize search trees
    var parents = [];
    var active = [];
    for (var u = 0; u < this.nodes.length; u++) {
        if (this.sourceEdges[u] > 0.0) {
            this.cut[u] = MAX_FLOW_SOURCE;
            parents.push(MAX_FLOW_TERMINAL);
            active.push(u);
        } else if (this.targetEdges[u] > 0.0) {
            this.cut[u] = MAX_FLOW_TARGET;
            parents.push(MAX_FLOW_TERMINAL);
            active.push(u);
        } else {
            parents.push(MAX_FLOW_FREE);
            this.cut[u] = MAX_FLOW_FREE;
        }
    }

    // find augmenting paths
    while (active.length > 0) {
        // expand trees
        var u = active[0];
        var path = [];
        if (this.cut[u] == MAX_FLOW_SOURCE) {
            for (var i = 0; i < this.nodes[u].length; i++) {
                var v = this.nodes[u][i].node;
                if (this.nodes[u][i].w > 0.0) {
                    if (this.cut[v] == MAX_FLOW_FREE) {
                        this.cut[v] = MAX_FLOW_SOURCE;
                        parents[v] = this.nodes[u][i].rindx;
                        active.push(v);
                    } else if (this.cut[v] == MAX_FLOW_TARGET) {
                        // found augmenting path (node, neighbour index)
                        path = [u, i];
                        break;
                    }
                }
            }
        } else {
            for (var i = 0; i < this.nodes[u].length; i++) {
                var v = this.nodes[u][i].node;
                var ri = this.nodes[u][i].rindx;
                if (this.nodes[v][ri].w > 0.0) {
                    if (this.cut[v] == MAX_FLOW_FREE) {
                        this.cut[v] = MAX_FLOW_TARGET;
                        parents[v] = ri;
                        active.push(v);
                    } else if (this.cut[v] == MAX_FLOW_SOURCE) {
                        // found augmenting path (node, neighbour index)
                        path = [v, ri];
                        break;
                    }
                }
            }
        }

        if (path.length == 0) { active.shift(); continue; }

        // augment path
        var c = this.nodes[path[0]][path[1]].w;
        // backtrack
        u = path[0];
        while (parents[u] != MAX_FLOW_TERMINAL) {
            var v = this.nodes[u][parents[u]].node;
            var ri = this.nodes[u][parents[u]].rindx;
            c = Math.min(c, this.nodes[v][ri].w);
            u = v;
        }
        c = Math.min(c, this.sourceEdges[u]);

        // forward track
        u = this.nodes[path[0]][path[1]].node;
        while (parents[u] != MAX_FLOW_TERMINAL) {
            var v = this.nodes[u][parents[u]].node;
            c = Math.min(c, this.nodes[u][parents[u]].w);
            u = v;
        }
        c = Math.min(c, this.targetEdges[u]);

        maxFlowAssert(c != 0.0, "zero capacity augmenting path");

        orphans = [];
        u = path[0];
        v = this.nodes[u][path[1]].node;
        this.nodes[u][path[1]].w -= c;
        this.nodes[v][this.nodes[u][path[1]].rindx].w += c;
        while (parents[u] != MAX_FLOW_TERMINAL) {
            var v = this.nodes[u][parents[u]].node;
            var ri = this.nodes[u][parents[u]].rindx;
            this.nodes[v][ri].w -= c;
            this.nodes[u][parents[u]].w += c;
            if (this.nodes[v][ri].w == 0.0) {
                orphans.push(u);
            }
            u = v;
        }
        this.sourceEdges[u] -= c;
        if (this.sourceEdges[u] == 0.0) {
            orphans.push(u);
        }
        u = this.nodes[path[0]][path[1]].node;
        while (parents[u] != MAX_FLOW_TERMINAL) {
            var v = this.nodes[u][parents[u]].node;
            var ri = this.nodes[u][parents[u]].rindx;
            this.nodes[u][parents[u]].w -= c;
            this.nodes[v][ri].w += c;
            if (this.nodes[u][parents[u]].w == 0.0) {
                orphans.push(u);
            }
            u = v;
        }
        this.targetEdges[u] -= c;
        if (this.targetEdges[u] == 0.0) {
            orphans.push(u);
        }

        this.flowValue += c;

        // adopt orphans
        for (var i = 0; i < orphans.length; i++) {
            parents[orphans[i]] = MAX_FLOW_TERMINAL;
        }

        while (orphans.length > 0) {
            var u = orphans.pop();
            var treeLabel = this.cut[u];

            var bFreeOrphan = true;
            for (var i = 0; i < this.nodes[u].length; i++) {
                // check if different tree or no capacity
                var v = this.nodes[u][i].node;
                var ri = this.nodes[u][i].rindx;
                if (this.cut[v] != treeLabel) continue;
                if ((treeLabel == MAX_FLOW_SOURCE) && (this.nodes[v][ri].w == 0.0)) continue;
                if ((treeLabel == MAX_FLOW_TARGET) && (this.nodes[u][i].w == 0.0)) continue;

                // check that u is not an ancestor of v
                while ((v != u) && (parents[v] != MAX_FLOW_TERMINAL)) {
                    v = this.nodes[v][parents[v]].node;
                }
                if (v == u) continue;

                // add as parent
                parents[u] = i;
                bFreeOrphan = false;
                break;
            }

            if (bFreeOrphan) {
                for (var i = 0; i < this.nodes[u].length; i++) {
                    var v = this.nodes[u][i].node;
                    if ((this.cut[v] == treeLabel) && (parents[v] == this.nodes[u][i].rindx)) {
                        parents[v] = MAX_FLOW_TERMINAL;
                        orphans.push(v);
                        if (active.indexOf(v) == -1) active.push(v);
                    }
                }

                // mark inactive and free
                var indx = active.indexOf(u);
                if (indx != -1) active.splice(indx, 1);
                this.cut[u] = MAX_FLOW_FREE;
            }
        }
    }

    return this.flowValue;
}
