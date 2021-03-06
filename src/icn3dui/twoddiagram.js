/**
 * @author Jiyao Wang <wangjiy@ncbi.nlm.nih.gov> / https://github.com/ncbi/icn3d
 */

// draw 2D dgm for MMDB ID
// Used as a reference the work at 2016 ISMB hackathon: https://github.com/NCBI-Hackathons/3D_2D_Rep_Structure
// bUpdate: redraw 2Ddiagramfor the displayed structure
iCn3DUI.prototype.draw2Ddgm = function(data, mmdbid, structureIndex, bUpdate) { var me = this, ic = me.icn3d; "use strict";
    // only show the 2D diagrams for displayed structures

    mmdbid = mmdbid.substr(0, 4);

    // reduce the size from 300 to 150
    var factor = 0.5;

    // set molid2chain
    var molid2chain = {}, molid2color = {}, molid2name = {}, chainid2molid = {};
    var chainNameHash = {};

    if(data === undefined) return '';

    for(var molid in data.moleculeInfor) {
          var color = '#' + ( '000000' + data.moleculeInfor[molid].color.toString( 16 ) ).slice( - 6 );
          var chainName = data.moleculeInfor[molid].chain.trim();
          if(chainNameHash[chainName] === undefined) {
              chainNameHash[chainName] = 1;
          }
          else {
              ++chainNameHash[chainName];
          }

          var chainNameFinal = (chainNameHash[chainName] === 1) ? chainName : chainName + chainNameHash[chainName].toString();
          var chainid = mmdbid + '_' + chainNameFinal;
          if(me.mmdbid_q !== undefined && me.mmdbid_q === me.mmdbid_t && structureIndex === 0) {
              //chainid += me.postfix;
              chainid = mmdbid + me.postfix + '_' + chainNameFinal;
          }

          molid2chain[molid] = chainid;
          molid2color[molid] = color;
          molid2name[molid] = data.moleculeInfor[molid].name;

          chainid2molid[chainid] = molid;
    }

    // save the interacting residues
    if(bUpdate === undefined || !bUpdate) {
        for(var i = 0, il = data['intracResidues'].length; i < il; ++i) {
            var pair = data['intracResidues'][i];

            var index = 0;
            var chainid1, chainid2;

            for(var molid in pair) {
                //molid = parseInt(molid);

                var chainid;

                chainid = molid2chain[molid];
                if(index === 0) {
                    chainid1 = chainid;
                }
                else {
                    chainid2 = chainid;
                }

                ++index;
            }

            if(chainid1 === undefined || chainid2 === undefined) continue;

            index = 0;
            for(var molid in pair) {
                var resArray = pair[molid];

                var fisrtChainid, secondChainid;
                if(index === 0) {
                    fisrtChainid = chainid1;
                    secondChainid = chainid2;
                }
                else {
                    fisrtChainid = chainid2;
                    secondChainid = chainid1;
                }

                if(me.chainids2resids[fisrtChainid] === undefined) {
                    me.chainids2resids[fisrtChainid] = {};
                }

                if(me.chainids2resids[fisrtChainid][secondChainid] === undefined) {
                    me.chainids2resids[fisrtChainid][secondChainid] = [];
                }

                for(var j = 0, jl = resArray.length; j < jl; ++j) {
                    var res = resArray[j];
                    var resid = me.mmdbMolidResid2mmdbChainResi[mmdbid.toUpperCase() + '_' + molid + '_' + res];

                    me.chainids2resids[fisrtChainid][secondChainid].push(resid);
                }

                // update me.chainname2residues
                if(me.chainname2residues === undefined) me.chainname2residues = {};

                chainid2 = secondChainid;

                var atom2 = ic.getFirstCalphaAtomObj(ic.chains[chainid2]);
                //if(me.chainname2residues[chainid2] === undefined) me.chainname2residues[chainid2] = {};

                var type2;
                if(ic.chemicals.hasOwnProperty(atom2.serial)) { // 1. chemical interacting with proteins
                    type2 = 'chemical';
                }
                else if(ic.nucleotides.hasOwnProperty(atom2.serial)) { // 2. DNA interacting with proteins
                    type2 = 'nucleotide';
                }
                else if(ic.ions.hasOwnProperty(atom2.serial)) { // 3. ions interacting with proteins
                    type2 = 'ion';
                }
                else if(ic.proteins.hasOwnProperty(atom2.serial)) { // 4. protein interacting with proteins
                    type2 = 'protein';
                }
                else if(ic.water.hasOwnProperty(atom2.serial)) { // 5. water interacting with proteins
                    type2 = 'water';
                }

                var name = chainid2.substr(chainid2.indexOf('_') + 1) + " (" + type2 + ")";

                if(me.chainname2residues[fisrtChainid] === undefined) me.chainname2residues[fisrtChainid] = {};

                me.chainname2residues[fisrtChainid][name] = me.chainids2resids[fisrtChainid][secondChainid];


                ++index;
            }
        }
    }

    var html = "<div id='#" + me.pre + mmdbid + "'>";

    html += "<b>" + mmdbid.toUpperCase() + "</b><br/>";

    html += "<svg viewBox='0,0,150,150'>";
    var strokecolor = '#000000';
    var strokewidth = '1';
    var linestrokewidth = '2';
    var textcolor = '#000000';
    var fontsize = '10';
    var smallfontsize = '8';
    var adjustx = 0, adjusty = 4, smalladjustx = 1, smalladjusty = 2, halfLetHigh = 6;

    var posHash = {};
    var lines = [];

    var nodeHtml = "", chemNodeHtml = "";

    var alignedAtomArray = [];

    var displayedMolids = {};
    if(bUpdate) {
        // get all displayed chains
        for(var i in ic.dAtoms) {
            var atom = ic.atoms[i];
            var chainid = atom.structure + '_' + atom.chain;
            var molid = chainid2molid[chainid];

            displayedMolids[molid] = 1;
        }
    }

    var allMolidArray = Object.keys(data.moleculeInfor);
    var intracMolidArray = Object.keys(data.intrac);

    var missingMolidArray = [];
    for(var i = 0, il = allMolidArray.length; i < il; ++i) {
        if(intracMolidArray.indexOf(allMolidArray[i]) === -1) missingMolidArray.push(allMolidArray[i]);
    }

    var missingMolid2intrac = {}; // biopolymer

    if(missingMolidArray.length > 0) {
        for(var molid in data.intrac) {
            var dgm = data.intrac[molid];
            for(var i = 0, il = dgm.intrac.length; i < il; ++i) {
                var intracMolid = dgm.intrac[i].toString();
                if(missingMolidArray.indexOf(intracMolid) !== -1) {
                    if(missingMolid2intrac[intracMolid] === undefined) missingMolid2intrac[intracMolid] = [];
                    missingMolid2intrac[intracMolid].push(molid);
                    lines.push([intracMolid, molid]);
                }
            }

            if(dgm.shape === 'rect') {
                var x = dgm.coords[0] * factor;
                var y = dgm.coords[1] * factor;
                var width = dgm.coords[2] * factor - x;
                var height = dgm.coords[3] * factor - y;

                posHash[molid] = [x + width/2, y + height/2];
            }
            else if(dgm.shape === 'circle') {
                var x = dgm.coords[0] * factor;
                var y = dgm.coords[1] * factor;
                var r = dgm.coords[2] * factor;

                posHash[molid] = [x, y];
            }
            else if(dgm.shape === 'poly') {
                var x0 = dgm.coords[0] * factor;
                var y0 = dgm.coords[1] * factor;
                var x1 = dgm.coords[2] * factor;
                var y1 = dgm.coords[3] * factor;
                var x2 = dgm.coords[4] * factor;
                var y2 = dgm.coords[5] * factor;
                var x3 = dgm.coords[6] * factor;
                var y3 = dgm.coords[7] * factor;

                var x = x0, y = y1;

                posHash[molid] = [x0, y1];
            }
        }
    }

    var cntNointeraction = 0;
    //for(var molid in data.intrac) {
    for(var index = 0, indexl = allMolidArray.length; index < indexl; ++index) {
        var molid = allMolidArray[index];

        var chainid = molid2chain[molid];

        // if redraw2d diagram and the molid is not displayed, skip
        if(bUpdate && !displayedMolids.hasOwnProperty(molid)) continue;

        var dgm = data.intrac[molid];
        var color = "#FFFFFF";
        var oricolor = molid2color[molid];
        if(chainid !== undefined) {
            var atomArray = Object.keys(ic.chains[chainid]);
            if(atomArray.length > 0) {
                oricolor = "#" + ic.atoms[atomArray[0]].color.getHexString().toUpperCase();
            }
        }

        var alignNum = "";
        if(ic.bInitial) {
            if(structureIndex !== undefined && structureIndex === 0) {
                if(me.alignmolid2color !== undefined && me.alignmolid2color[0].hasOwnProperty(molid)) {
                    //color = me.alignmolid2color[0][molid];
                    alignNum = me.alignmolid2color[0][molid];
                    oricolor = "#FF0000";
                }
                else {
                    oricolor = "#FFFFFF";
                }
            }
            else if(structureIndex !== undefined && structureIndex === 1) {
                if(me.alignmolid2color !== undefined && me.alignmolid2color[1].hasOwnProperty(molid)) {
                    //color = me.alignmolid2color[1][molid];
                    alignNum = me.alignmolid2color[1][molid];
                    oricolor = "#FF0000";
                }
                else {
                    oricolor = "#FFFFFF";
                }
            }
        }

        var chainname = molid2name[molid];

        var chain = ' ', oriChain = ' ';
        if(chainid !== undefined) {
            var pos = chainid.indexOf('_');
            oriChain = chainid.substr(pos + 1);

            if(oriChain.length > 1) {
                chain = oriChain.substr(0, 1) + '..';
            }
            else {
                chain = oriChain;
            }
        }
        else {
            chainid = 'Misc';
        }

        if(oricolor === undefined) {
            oricolor = '#FFFFFF';
        }

        var ratio = 1.0;
        if(ic.bInitial && ic.alnChains[chainid] !== undefined) {
            //ratio = 1.0 * Object.keys(ic.alnChains[chainid]).length / Object.keys(ic.chains[chainid]).length;
            var alignedAtomCnt = 0;
            for(var i in ic.alnChains[chainid]) {
                var colorStr = ic.atoms[i].color.getHexString().toUpperCase();
                if(colorStr === 'FF0000' || colorStr === '00FF00') {
                    ++alignedAtomCnt;
                }
            }
            ratio = 1.0 * alignedAtomCnt / Object.keys(ic.chains[chainid]).length;
        }
        if(ratio < 0.2) ratio = 0.2;

        if(missingMolidArray.indexOf(molid) === -1) {
            for(var i = 0, il = dgm.intrac.length; i < il; ++i) {
                // show the interactin line once
                if(parseInt(molid) < parseInt(dgm.intrac[i])) lines.push([molid, dgm.intrac[i] ]);
            }

            if(dgm.shape === 'rect') {
                var x = dgm.coords[0] * factor;
                var y = dgm.coords[1] * factor;
                var width = dgm.coords[2] * factor - x;
                var height = dgm.coords[3] * factor - y;

                nodeHtml += me.draw2DNucleotide(x + 0.5 * width, y + 0.5 * height, chainid, oriChain, chain, chainname, alignNum, color, oricolor, factor, ratio);

                posHash[molid] = [x + width/2, y + height/2];
            }
            else if(dgm.shape === 'circle') {
                var x = dgm.coords[0] * factor;
                var y = dgm.coords[1] * factor;

                nodeHtml += me.draw2DProtein(x, y, chainid, oriChain, chain, chainname, alignNum, color, oricolor, factor, ratio);

                posHash[molid] = [x, y];
            }
            else if(dgm.shape === 'poly') {
              var x0 = dgm.coords[0] * factor;
              var y0 = dgm.coords[1] * factor;
              var x1 = dgm.coords[2] * factor;
              var y1 = dgm.coords[3] * factor;
              var x2 = dgm.coords[4] * factor;
              var y2 = dgm.coords[5] * factor;
              var x3 = dgm.coords[6] * factor;
              var y3 = dgm.coords[7] * factor;

              var x = x0, y = y1;

              var atom = ic.getFirstAtomObj(ic.chains[chainid]);

              chemNodeHtml += me.draw2DChemical(x, y, chainid, oriChain, chain, chainname, alignNum, color, oricolor, factor, ratio);

              posHash[molid] = [x0, y1];
            }
        }
        else { // missing biopolymer
            // max x and y value: 300
            var maxSize = 300;
            var step = 50;

            var xCenter, yCenter;
            if(missingMolid2intrac[molid] !== undefined && missingMolid2intrac[molid].length > 1) { // has interactions
                // find its position
                var xSum = 0, ySum = 0;

                for(var j = 0, jl = missingMolid2intrac[molid].length; j < jl; ++j) {
                    var intracMolid = missingMolid2intrac[molid][j];
                    if(posHash.hasOwnProperty(intracMolid)) {
                        var node = posHash[intracMolid];
                        xSum += node[0];
                        ySum += node[1];
                    }
                }

                xCenter = xSum / missingMolid2intrac[molid].length;
                yCenter = ySum / missingMolid2intrac[molid].length;
            }
            else { // has NO interactions or just one interaction
                var nSteps = maxSize / step;

                if(cntNointeraction < nSteps - 1) {
                    xCenter = (cntNointeraction + 1) * step * factor;
                    yCenter = 0.1 * maxSize * factor;
                }
                else if(cntNointeraction - (nSteps - 1) < nSteps - 1) {
                    xCenter = 0.1 * maxSize * factor;
                    yCenter = (cntNointeraction - (nSteps - 1) + 1) * step * factor;
                }
                else {
                    xCenter = 0.25 * maxSize * factor;
                    yCenter = xCenter;
                }

                ++cntNointeraction;

            }

            var x = xCenter, y = yCenter;

            var atom = ic.getFirstAtomObj(ic.chains[chainid]);

            var bBiopolymer = true;
            chemNodeHtml += me.draw2DChemical(x, y, chainid, oriChain, chain, chainname, alignNum, color, oricolor, factor, ratio, bBiopolymer);

            posHash[molid] = [x, y];
        }
    }

    for(var i = 0, il = lines.length; i < il; ++i) {
        var pair = lines[i];

        // if redraw2d diagram and the molid is not displayed, skip
        if(bUpdate && (!displayedMolids.hasOwnProperty(pair[0]) || !displayedMolids.hasOwnProperty(pair[1])) ) continue;

        var node1 = posHash[parseInt(pair[0])];
        var node2 = posHash[parseInt(pair[1])];

        if(node1 === undefined || node2 === undefined) continue;

        var chainid1, chainid2;

        chainid1 = molid2chain[pair[0]];
        chainid2 = molid2chain[pair[1]];

        var pos1 = chainid1.indexOf('_');
        var pos2 = chainid2.indexOf('_');

        var chain1 = chainid1.substr(pos1 + 1);
        var chain2 = chainid2.substr(pos2 + 1);

        var x1 = node1[0], y1 = node1[1], x2 = node2[0], y2 = node2[1], xMiddle = (x1 + x2) * 0.5, yMiddle = (y1 + y2) * 0.5;

        html += "<g class='icn3d-interaction' chainid1='" + chainid1 + "' chainid2='" + chainid2 + "' >";
        html += "<title>Interaction of chain " + chain1 + " with chain " + chain2 + "</title>";
        html += "<line x1='" + x1 + "' y1='" + y1 + "' x2='" + xMiddle + "' y2='" + yMiddle + "' stroke='" + strokecolor + "' stroke-width='" + linestrokewidth + "' /></g>";

        html += "<g class='icn3d-interaction' chainid1='" + chainid2 + "' chainid2='" + chainid1 + "' >";
        html += "<title>Interaction of chain " + chain2 + " with chain " + chain1 + "</title>";
        html += "<line x1='" + xMiddle + "' y1='" + yMiddle + "' x2='" + x2 + "' y2='" + y2 + "' stroke='" + strokecolor + "' stroke-width='" + linestrokewidth + "' /></g>";
    }

    html += chemNodeHtml + nodeHtml; // draw chemicals at the bottom layer

    html += "</svg>";
    html += "</div>";

    me.html2ddgm += html;

    $("#" + me.pre + "dl_2ddgm").html(me.html2ddgm);

    return html;
};

iCn3DUI.prototype.set2DdgmNote = function(bAlign) { var me = this, ic = me.icn3d; "use strict";
    var html = "<div style='width:150px'><b>Nodes</b>:<br>";

    if(me.isMac()) {
        html += "<span style='margin-right:18px;'>&#9711;</span>Protein<br>";
        html += "<span style='margin-right:18px;'>&#9634;</span>Nucleotide<br>";
        html += "<span style='margin-right:18px;'>&#9826;</span>Chemical<br>";
        html += "<span style='margin-right:18px;display: inline-block;transform: skew(-25deg);'>&#9634;</span>Biopolymer<br>";
    }
    else {
        html += "<span style='margin-right:18px;'>O</span>Protein<br>";
        html += "<span style='margin-right:18px;'>&#9634;</span>Nucleotide<br>";
        html += "<span style='margin-right:18px;'>&#9671;</span>Chemical<br>";
        html += "<span style='margin-right:18px;display: inline-block;transform: skew(-25deg);'>&#9634;</span>Biopolymer<br>";
    }

    html += "<br><b>Lines</b>:<br> Interactions at 4 &#197;<br>"
    if(bAlign) html += "<b>Numbers in red</b>:<br> Aligned chains"
    html += "</div><br/>";

    return html;
};

iCn3DUI.prototype.highlightNode = function(type, highlight, base, ratio) { var me = this, ic = me.icn3d; "use strict";
    if(ratio < 0.2) ratio = 0.2;
    var strokeWidth = 3; // default 1

    if(type === 'rect') {
        $(highlight).attr('stroke', me.ORANGE);
        $(highlight).attr('stroke-width', strokeWidth);

        var x = Number($(base).attr('x'));
        var y = Number($(base).attr('y'));
        var width = Number($(base).attr('width'));
        var height = Number($(base).attr('height'));
        $(highlight).attr('x', x + width / 2.0 * (1 - ratio));
        $(highlight).attr('y', y + height / 2.0 * (1 - ratio));
        $(highlight).attr('width', width * ratio);
        $(highlight).attr('height', height * ratio);
    }
    else if(type === 'circle') {
        $(highlight).attr('stroke', me.ORANGE);
        $(highlight).attr('stroke-width', strokeWidth);

        $(highlight).attr('r', Number($(base).attr('r')) * ratio);
    }
    else if(type === 'polygon') {
        $(highlight).attr('stroke', me.ORANGE);
        $(highlight).attr('stroke-width', strokeWidth);

        var x = Number($(base).attr('x'));
        var y = Number($(base).attr('y'));

        var x0diff = Number($(base).attr('x0d'));
        var y0diff = Number($(base).attr('y0d'));
        var x1diff = Number($(base).attr('x1d'));
        var y1diff = Number($(base).attr('y1d'));
        var x2diff = Number($(base).attr('x2d'));
        var y2diff = Number($(base).attr('y2d'));
        var x3diff = Number($(base).attr('x3d'));
        var y3diff = Number($(base).attr('y3d'));

        $(highlight).attr('points', (x+x0diff*ratio).toString() + ", " + (y+y0diff*ratio).toString() + ", " + (x+x1diff*ratio).toString() + ", " + (y+y1diff*ratio).toString() + ", " + (x+x2diff*ratio).toString() + ", " + (y+y2diff*ratio).toString() + ", " + (x+x3diff*ratio).toString() + ", " + (y+y3diff*ratio).toString());
    }
};

iCn3DUI.prototype.removeLineGraphSelection = function() { var me = this, ic = me.icn3d; "use strict";
      $("#" + me.pre + "dl_linegraph circle").attr('stroke', '#000000');
      $("#" + me.pre + "dl_linegraph circle").attr('stroke-width', 1);

      $("#" + me.pre + "dl_linegraph svg line.icn3d-hlline").attr('stroke', '#FFF');
      //$("#" + me.pre + "dl_linegraph svg line .icn3d-hlline").attr('stroke-width', 1);
};

iCn3DUI.prototype.removeScatterplotSelection = function() { var me = this, ic = me.icn3d; "use strict";
      $("#" + me.pre + "dl_scatterplot circle").attr('stroke', '#000000');
      $("#" + me.pre + "dl_scatterplot circle").attr('stroke-width', 1);

      $("#" + me.pre + "dl_scatterplot rect").attr('stroke', '#000000');
      $("#" + me.pre + "dl_scatterplot rect").attr('stroke-width', 1);
};

iCn3DUI.prototype.click2Ddgm = function() { var me = this; //"use strict";
    $("#" + me.pre + "dl_2ddgm").on("click", ".icn3d-node", function(e) { var ic = me.icn3d;
          e.stopImmediatePropagation();
        if(Object.keys(ic.hAtoms).length < Object.keys(ic.atoms).length) me.setMode('selection');

        //me.bClickInteraction = false;

        var chainid = $(this).attr('chainid');

        // clear all nodes
        if(!ic.bCtrl && !ic.bShift) {
            me.removeSelection();

            // me.lineArray2d is used to highlight lines in 2D diagram
            me.lineArray2d = [];
        }

        var ratio = 1.0;
        if(ic.alnChains[chainid] !== undefined) ratio = 1.0 * Object.keys(ic.alnChains[chainid]).length / Object.keys(ic.chains[chainid]).length;

        var target = $(this).find("rect[class='icn3d-hlnode']");
        var base = $(this).find("rect[class='icn3d-basenode']");
        me.highlightNode('rect', target, base, ratio);

        target = $(this).find("circle[class='icn3d-hlnode']");
        base = $(this).find("circle[class='icn3d-basenode']");
        me.highlightNode('circle', target, base, ratio);

        target = $(this).find("polygon[class='icn3d-hlnode']");
        base = $(this).find("polygon[class='icn3d-basenode']");
        me.highlightNode('polygon', target, base, ratio);

        if(!ic.bCtrl && !ic.bShift) {
            ic.hAtoms = ic.cloneHash(ic.chains[chainid]);
        }
        else {
            ic.hAtoms = ic.unionHash(ic.hAtoms, ic.chains[chainid]);
        }

        // get the name array
        if(!ic.bCtrl && !ic.bShift) {
            me.chainArray2d = [chainid];
        }
        else {
            if(me.chainArray2d === undefined) me.chainArray2d = [];
            me.chainArray2d.push(chainid);
        }

        me.updateHlAll(me.chainArray2d);

        // show selected chains in annotation window
        me.showAnnoSelectedChains();

        var select = "select chain " + chainid;
        me.setLogCmd(select, true);

        me.bSelectResidue = false;
    });

    $("#" + me.pre + "dl_2ddgm").on("click", ".icn3d-interaction", function(e) { var ic = me.icn3d;
          e.stopImmediatePropagation();
        if(Object.keys(ic.hAtoms).length < Object.keys(ic.atoms).length) me.setMode('selection');

        me.bClickInteraction = true;

        var chainid1 = $(this).attr('chainid1');
        var chainid2 = $(this).attr('chainid2');

        $(this).find('line').attr('stroke', me.ORANGE);

        // interaction of chain1 with chain2, only show the part of chain1 interacting with chain2
        me.selectInteraction(chainid1, chainid2);

        // show selected chains in annotation window
        me.showAnnoSelectedChains();

        var select = "select interaction " + chainid1 + "," + chainid2;
        me.setLogCmd(select, true);

        me.bClickInteraction = false;
    });

    $("#" + me.pre + "dl_linegraph").on("click", ".icn3d-node", function(e) { var ic = me.icn3d;
        e.stopImmediatePropagation();
        if(Object.keys(ic.hAtoms).length < Object.keys(ic.atoms).length) me.setMode('selection');

        var resid = $(this).attr('resid');

        if(!ic.bCtrl && !ic.bShift) {
          ic.hAtoms = {};

          me.removeLineGraphSelection();
        }

        var strokeWidth = 2;
        $(this).find('circle').attr('stroke', me.ORANGE);
        $(this).find('circle').attr('stroke-width', strokeWidth);

        ic.hAtoms = ic.unionHash(ic.hAtoms, ic.residues[resid]);

        var select = 'select ' + me.residueids2spec([resid]);

        me.updateHlAll();

        me.setLogCmd(select, true);

        me.bSelectResidue = false;
    });

    $("#" + me.pre + "dl_scatterplot").on("click", ".icn3d-node", function(e) { var ic = me.icn3d;
        e.stopImmediatePropagation();
        if(Object.keys(ic.hAtoms).length < Object.keys(ic.atoms).length) me.setMode('selection');

        var resid = $(this).attr('resid');

        if(!ic.bCtrl && !ic.bShift) {
          ic.hAtoms = {};

          me.removeScatterplotSelection();
        }

        var strokeWidth = 2;
        $(this).find('circle').attr('stroke', me.ORANGE);
        $(this).find('circle').attr('stroke-width', strokeWidth);

        ic.hAtoms = ic.unionHash(ic.hAtoms, ic.residues[resid]);

        var select = 'select ' + me.residueids2spec([resid]);

        me.updateHlAll();

        me.setLogCmd(select, true);

        me.bSelectResidue = false;
    });

    $("#" + me.pre + "dl_linegraph").on("click", ".icn3d-interaction", function(e) { var ic = me.icn3d;
          e.stopImmediatePropagation();
        if(Object.keys(ic.hAtoms).length < Object.keys(ic.atoms).length) me.setMode('selection');

        var resid1 = $(this).attr('resid1');
        var resid2 = $(this).attr('resid2');

        if(!ic.bCtrl && !ic.bShift) {
          ic.hAtoms = {};

          me.removeLineGraphSelection();
        }

        $(this).find('line.icn3d-hlline').attr('stroke', me.ORANGE);

        ic.hAtoms = ic.unionHash(ic.hAtoms, ic.residues[resid1]);
        ic.hAtoms = ic.unionHash(ic.hAtoms, ic.residues[resid2]);

        var select = 'select ' + me.residueids2spec([resid1, resid2]);

        me.updateHlAll();

        me.setLogCmd(select, true);
    });

    $("#" + me.pre + "dl_scatterplot").on("click", ".icn3d-interaction", function(e) { var ic = me.icn3d;
        e.stopImmediatePropagation();
        if(Object.keys(ic.hAtoms).length < Object.keys(ic.atoms).length) me.setMode('selection');

        var resid1 = $(this).attr('resid1');
        var resid2 = $(this).attr('resid2');

        if(!ic.bCtrl && !ic.bShift) {
          ic.hAtoms = {};

          me.removeScatterplotSelection();
        }

        var strokeWidth = 2;
        $(this).find('rect').attr('stroke', me.ORANGE);
        $(this).find('rect').attr('stroke-width', strokeWidth);

        ic.hAtoms = ic.unionHash(ic.hAtoms, ic.residues[resid1]);
        ic.hAtoms = ic.unionHash(ic.hAtoms, ic.residues[resid2]);

        var select = 'select ' + me.residueids2spec([resid1, resid2]);

        me.updateHlAll();

        me.setLogCmd(select, true);
    });
};

iCn3DUI.prototype.selectInteraction = function (chainid1, chainid2) {   var me = this, ic = me.icn3d; "use strict";
        me.removeHl2D();
        ic.removeHlObjects();

        if(!ic.bCtrl && !ic.bShift) {
            // me.lineArray2d is used to highlight lines in 2D diagram
            me.lineArray2d = [chainid1, chainid2];
        }
        else {
            if(me.lineArray2d === undefined) me.lineArray2d = [];
            me.lineArray2d.push(chainid1);
            me.lineArray2d.push(chainid2);
        }

        me.selectInteractionAtoms(chainid1, chainid2);

        ic.addHlObjects();

        me.updateHlAll();
};

iCn3DUI.prototype.selectInteractionAtoms = function (chainid1, chainid2) {   var me = this, ic = me.icn3d; "use strict";  // ic.pAtom is set already
    var radius = 4;

    // method 2. Retrieved from the cgi (This previously had problems in sharelink where the data from ajax is async. Now the data is from the same cgi as the atom data and there is no problem.)
    var residueArray = me.chainids2resids[chainid1][chainid2];

    if(!ic.bCtrl && !ic.bShift) ic.hAtoms = {};

    for(var i = 0, il = residueArray.length; i < il; ++i) {
        ic.hAtoms = ic.unionHash(ic.hAtoms, ic.residues[residueArray[i]]);
    }

    var commandname, commanddesc;
    if(Object.keys(ic.structures).length > 1) {
        commandname = "inter_" + chainid1 + "_" + chainid2;
    }
    else {
        var pos1 = chainid1.indexOf('_');
        var pos2 = chainid2.indexOf('_');

        commandname = "inter_" + chainid1.substr(pos1 + 1) + "_" + chainid2.substr(pos2 + 1);
    }

    commanddesc = "select the atoms in chain " + chainid1 + " interacting with chain " + chainid2 + " in a distance of " + radius + " angstrom";

    var select = "select interaction " + chainid1 + "," + chainid2;

    me.addCustomSelection(residueArray, commandname, commanddesc, select, true);

    var nameArray = [commandname];
};

iCn3DUI.prototype.draw2DProtein = function(x, y, chainid, oriChain, chain, chainname, alignNum, color, oricolor, factor, ratio) { var me = this, ic = me.icn3d; "use strict";
    var strokecolor = '#000000';
    var strokewidth = '1';
    var linestrokewidth = '2';
    var textcolor = '#000000';
    var fontsize = '10';
    var smallfontsize = '8';
    var adjustx = 0, adjusty = 4, smalladjustx = 1, smalladjusty = 2, halfLetHigh = 6;

    var r = 20 * factor;

    var html = "<g class='icn3d-node' chainid='" + chainid + "' >";
    html += "<title>Chain " + oriChain + ": " + chainname + "</title>";
    html += "<circle class='icn3d-basenode' cx='" + x + "' cy='" + y + "' r='" + r + "' fill='" + color + "' stroke-width='" + strokewidth + "' stroke='" + strokecolor + "' class='icn3d-node' chainid='" + chainid + "' />";

    html += "<circle class='icn3d-hlnode' cx='" + x + "' cy='" + y + "' r='" + (r * ratio).toString() + "' fill='" + oricolor + "' stroke-width='" + strokewidth + "' stroke='" + strokecolor + "' />";

    html += "<text x='" + (x - adjustx).toString() + "' y='" + (y + adjusty).toString() + "' style='fill:" + textcolor + "; font-size:" + fontsize + "; text-anchor:middle' >" + chain + "</text>";

    if(alignNum !== "") html += "<text x='" + (x - adjustx).toString() + "' y='" + (y + r + adjusty + halfLetHigh).toString() + "' style='fill:" + oricolor + "; font-size:" + smallfontsize + "; font-weight:bold; text-anchor:middle' >" + alignNum + "</text>";

    html += "</g>";

    return html;
};

iCn3DUI.prototype.draw2DNucleotide = function(x, y, chainid, oriChain, chain, chainname, alignNum, color, oricolor, factor, ratio) { var me = this, ic = me.icn3d; "use strict";
    var strokecolor = '#000000';
    var strokewidth = '1';
    var linestrokewidth = '2';
    var textcolor = '#000000';
    var fontsize = '10';
    var smallfontsize = '8';
    var adjustx = 0, adjusty = 4, smalladjustx = 1, smalladjusty = 2, halfLetHigh = 6;

    var width = 30 * factor;
    var height = 30 * factor;

    x -= 0.5 * width;
    y -= 0.5 * height;

    var html = "<g class='icn3d-node' chainid='" + chainid + "' >";
    html += "<title>Chain " + oriChain + ": " + chainname + "</title>";
    // place holder
    html += "<rect class='icn3d-basenode' x='" + x + "' y='" + y + "' width='" + width + "' height='" + height + "' fill='" + color + "' stroke-width='" + strokewidth + "' stroke='" + strokecolor + "' />";
    // highlight
    html += "<rect class='icn3d-hlnode' x='" + (x + width / 2.0 * (1 - ratio)).toString() + "' y='" + (y + height / 2.0 * (1 - ratio)).toString() + "' width='" + (width * ratio).toString() + "' height='" + (height * ratio).toString() + "' fill='" + oricolor + "' stroke-width='" + strokewidth + "' stroke='" + strokecolor + "' />";

    html += "<text x='" + (x + width / 2 - adjustx).toString() + "' y='" + (y + height / 2 + adjusty).toString() + "' style='fill:" + textcolor + "; font-size:" + fontsize + "; text-anchor:middle' >" + chain + "</text>";

    if(alignNum !== "") html += "<text x='" + (x + width / 2 - adjustx).toString() + "' y='" + (y + height + adjusty + halfLetHigh).toString() + "' style='fill:" + oricolor + "; font-size:" + smallfontsize + "; font-weight:bold; text-anchor:middle' >" + alignNum + "</text>";

    html += "</g>";

    return html;
};

iCn3DUI.prototype.draw2DChemical = function(x, y, chainid, oriChain, chain, chainname, alignNum, color, oricolor, factor, ratio, bBiopolymer) { var me = this, ic = me.icn3d; "use strict";
    var strokecolor = '#000000';
    var strokewidth = '1';
    var linestrokewidth = '2';
    var textcolor = '#000000';
    var fontsize = '10';
    var smallfontsize = '8';
    var adjustx = 0, adjusty = 4, smalladjustx = 1, smalladjusty = 2, halfLetHigh = 6;

    var bpsize = 30 * factor;

    var x0, y0, x1, y1, x2, y2, x3, y3;
    if(bBiopolymer) {
        // biopolymer
        var xOffset = 0.5 * bpsize / Math.sqrt(3);
        var yOffset = 0.5 * bpsize;

        x0 = x - xOffset;
        y0 = y - yOffset;
        x1 = x + 3 * xOffset;
        y1 = y - yOffset;
        x2 = x + xOffset;
        y2 = y + yOffset;
        x3 = x - 3 * xOffset;
        y3 = y + yOffset;
    }
    else {
        // diamond
        var xOffset = 0.5 * bpsize;
        var yOffset = 0.5 * bpsize;

        x0 = x - xOffset;
        y0 = y;
        x1 = x;
        y1 = y + yOffset;
        x2 = x + xOffset;
        y2 = y;
        x3 = x;
        y3 = y - yOffset;
    }

    var x0diff = x0 - x;
    var y0diff = y0 - y;
    var x1diff = x1 - x;
    var y1diff = y1 - y;
    var x2diff = x2 - x;
    var y2diff = y2 - y;
    var x3diff = x3 - x;
    var y3diff = y3 - y;

    var html = "<g class='icn3d-node' chainid='" + chainid + "' >";
    html += "<title>Chain " + oriChain + ": " + chainname + "</title>";
    html += "<polygon class='icn3d-basenode' points='" + x0 + ", " + y0 + "," + x1 + ", " + y1 + "," + x2 + ", " + y2 + "," + x3 + ", " + y3 + "' x='" + x + "' y='" + y + "' x0d='" + x0diff + "' y0d='" + y0diff + "' x1d='" + x1diff + "' y1d='" + y1diff + "' x2d='" + x2diff + "' y2d='" + y2diff + "' x3d='" + x3diff + "' y3d='" + y3diff + "' fill='" + color + "' stroke-width='" + strokewidth + "' stroke='" + strokecolor + "' />";

    html += "<polygon class='icn3d-hlnode' points='" + (x+x0diff*ratio).toString() + ", " + (y+y0diff*ratio).toString() + "," + (x+x1diff*ratio).toString() + ", " + (y+y1diff*ratio).toString() + "," + (x+x2diff*ratio).toString() + ", " + (y+y2diff*ratio).toString() + "," + (x+x3diff*ratio).toString() + ", " + (y+y3diff*ratio).toString() + "' fill='" + oricolor + "' stroke-width='" + strokewidth + "' stroke='" + strokecolor + "' />";

    html += "<text x='" + (x + smalladjustx).toString() + "' y='" + (y + smalladjusty).toString() + "' style='fill:" + textcolor + "; font-size:" + smallfontsize + "; text-anchor:middle' >" + chain + "</text>";

    if(alignNum !== "") html += "<text x='" + (x + smalladjustx).toString() + "' y='" + (y + smalladjusty + halfLetHigh).toString() + "' style='fill:" + oricolor + "; font-size:" + smallfontsize + "; font-weight:bold; text-anchor:middle' >" + alignNum + "</text>";

    html += "</g>";

    return html;
};

