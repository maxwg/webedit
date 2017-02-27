"use strict";
this.ToolManager = function(canvas){
    var curTool = StatInpaint;
    curTool.bind(canvas);
    bindToolBox();

    function bindToolBox(){
        document.getElementById("statInpaintTool").addEventListener("click", function() {
            change(StatInpaint);
        }, false);

        document.getElementById("cloneTool").addEventListener("click", function() {
            change(CloneStamp)
        }, false);
    }

    function change(tool){
        if(tool.bind && tool.unbind && tool.execute){
            curTool.unbind(canvas);
            curTool = tool;
            curTool.bind(canvas)
        }
        else{
            throw "Invalid Tool!"
        }
    }

    function current(){
        return curTool;
    }

    function refresh(){
        curTool.unbind(canvas);
        curTool.bind(canvas);
    }

    return {
        change: change,
        current: current,
        refresh: refresh
    };
};
