$(function () {	

	function setupCodeBars(data) {

	    var bar_width = 30;
	    var bar_height = 15;
	    var bar_horizontal_padding = 5;
	    var bar_vertical_padding = 0;

        var svg = d3.select("#search_bars")
            .append("svg")
            .attr("width", data.length * (bar_width + bar_horizontal_padding))
            //.attr("height", data.length * (bar_height + bar_vertical_padding));
            .attr("height", d3.max(data, function(d) { return d.lines.length }) * 
                    (bar_height + bar_vertical_padding));

        var responses = svg.selectAll("g")
            .data(data)
            .enter()
            .append("g")
            .attr("class", "response_g")
            .attr("transform", function(d, i) {
                return "translate(" +
                    i * (bar_width + bar_horizontal_padding) + ", 0)";
            })
            .each(function(d,i) {
                d.index = i;
            });

		var lines = responses.selectAll("g")
            .data(function(d) { return d.lines; })
            .enter()
            .append("g")
            .attr("class", "line_g")
            .attr("transform", function(d, i, j) { 
                return "translate(0," +
                    //j * (bar_width + bar_horizontal_padding) + "," +
                    i * (bar_height + bar_vertical_padding) + ")";
            })
            .each(function(d,i){
                d.index = i;
            });

        var bars = lines.append("rect")
            .attr("class", "line_rect")
			.attr("width", bar_width)
			.attr("height", bar_height)
			.style("fill", function(d) { return code_colors(d.type_); })
            .style("stroke", "black")
            .style("pointer-events", "all")
            .on("mouseover", function(d) {
                var body = d3.select(this.parentNode.parentNode).datum().body;
                setPreview("#preview_pane", body, d.text);
            })
            .on("mousedown", dragStart)
            .on("mouseup", dragEnd)
            .on("click", function(d, i){
                //  flip value of sortOrder
                sortOrder = !sortOrder;
                var rs = d3.selectAll(".response_g")
                    .each(function(d, i){
                        sortBars(this);
                    });
            });

        var flags = lines.append("svg")
            .attr("width", bar_width)
            .attr("height", bar_height)
            .append("use")
            .attr("class", "flag")
            .attr("xlink:href", "static/skim/img/sprite.svg#media-record")
            .style("fill", "#fff")
            .style("fill-opacity", 0.0)
            .style("pointer-events", "none"); // do not block mouse events

        // Sort UI elements
        d3.select("#sort_type_dropdown")
            .on("change", function(){
                sortResponses();
            });
        d3.selectAll("input[type=radio][name=sort_order]")
            .on("change", function(){
                sortResponses();
            });
            
        function setPreview(selector, body, line) {
            preview = $(selector);
            preview.empty();
            preview.append(body);
            var textSpan = preview.find('span:contains(' + line + ')');

            /* We don't scroll to lines with less than 5 characters, as they might be
             * a false match to another blank line or "try {" line ! */
            if (textSpan.length > 0 && line.length > 10) {

                /* Move highlighting to new terms */
                preview.find('span').removeClass("highlight");
                textSpan.addClass("highlight");

                /* Animate a scroll to the current line */
                preview.stop(true)
                    .animate({
                        scrollTop: textSpan.offset().top - 
                            preview.offset().top + preview.scrollTop() -
                            preview.height() / 3,
                        duration: 300
                });
            }
        }

        var dragStartParent, dragEndParent;
        var dragStartLine, dragEndLine;
        
        function dragStart(d, i) {
            dragEndParent = undefined;
            dragEndLine = undefined;
            dragStartParent = d3.select(this.parentNode.parentNode);
            dragStartLine = d3.select(this.parentNode);
        };

        function dragEnd(d, i) {

            function posFromTranslate(string) {
                tokens = string.split(/[(,)]/);
                return {
                    x: tokens[1],
                    y: tokens[2]
                };
            }

            /* Draw rectangle over selected region */
            dragEndParent = d3.select(this.parentNode.parentNode);
            dragEndLine = d3.select(this.parentNode);
            if (dragEndParent.datum().index === dragStartParent.datum().index) {
                startPos = posFromTranslate(dragStartLine.attr("transform"));
                endPos = posFromTranslate(dragEndLine.attr("transform"));
                var rectX = startPos.x;
                var rectY = Math.min(startPos.y, endPos.y);
                var rectW = Number(d3.select(this).attr("width"));
                var rectH = Math.abs(startPos.y - endPos.y) + Number(d3.select(this).attr("height"));
                dragEndParent.append("rect")
                    .attr("x", rectX)
                    .attr("y", rectY)
                    .attr("width", rectW)
                    .attr("height", rectH)
                    .style("fill-opacity", 0)
                    .style("stroke", "black")
                    .style("stroke-width", 5)
                    .style("pointer-events", "none");
            }

            /* Keep only the lines in the body that have been selected by the user */
            var body = $(dragStartParent.datum().body).clone();
            var startIndex = Math.min(dragStartLine.datum().index, dragEndLine.datum().index);
            var endIndex = Math.max(dragStartLine.datum().index, dragEndLine.datum().index);
            for (var i = startIndex; i <= endIndex; i++) {
                var lineText = dragStartParent.datum().lines[i].text;
                if (lineText.length > 0) {
                    var spans = body.find('span:contains(' + lineText + ')')
                            .addClass('keep');
                }
            }
            body.find("pre > span").not(".keep").remove();
            body.find("p > span").not(".keep").remove();
            body.find("p:not(:has(*))").remove();
            body.find("pre:not(:has(*))").remove();
            body.html(body.html().replace(/^\s*[\r\n]/gm, ""));

            var snippet = $("<div></div>");
            var header = snippet.append("<h5>" + window.query + "</h5>")
                .addClass("keep_header")
                .prop("contenteditable", "true")
                .on("keypress", function(e) {
                    if (e.keyCode == 13) {
                        $("#target").blur().next().focus();
                        return false;
                    }
                });
            snippet.append(body);
            $("#keep_col").prepend(snippet);
            snippet.accordion({
                collapsible: true,
                heightStyle: "content"
            });

            dragStartParent = undefined;
            dragStartLine = undefined;
        };

        var sortOrder = false;
        var sortBars = function(response) {
            //  flip value of sortOrder
            //sortOrder = !sortOrder;
            d3.selectAll(response.childNodes)
                .sort(function(a, b) {
                    if (sortOrder) {
                        // sort by type
                        if (a.type_ === b.type_)
                            return d3.ascending(a.index, b.index);
                        else
                            return d3.ascending(a.type_, b.type_);
                    } else {
                        // return to original order
                        return d3.ascending(a.index, b.index);
                    }
                })
                .transition()
                //.delay(function(d, i) {
                    //return i * 50;
                //})
                .duration(500)
                .attr("transform", function(d, i) { 
                    var transform = d3.transform(d3.select(this).attr("transform")).translate;
                    var xPosition = transform[0];
                    var yPosition = transform[1];
                    return "translate(" +
                        xPosition + "," + 
                        //yPosition + ")";
                        i * (bar_height + bar_vertical_padding) + ")";
                });
        };

        var sortResponses = function() {
            var sort_type = "length", sort_order="descending";
            sort_type = d3.select("#sort_type_dropdown").property('value');
            sort_order = d3.select("#sort_options_form input[type='radio']:checked").property('value');
            var d3_sort_order = sort_order === "ascending"? d3.ascending : d3.descending;
            d3.selectAll(".response_g")
                .sort(function(a, b) {
                    switch(sort_type) {
                        case "length":
                            //return d3.descending(a.lines.length, b.lines.length);
                            return d3_sort_order(a.lines.length, b.lines.length);
                            break;
                        case "code_lines":
                            return d3_sort_order(
                                a.lines.filter(function(d,i) { return d.type_ == "code"; }).length,
                                b.lines.filter(function(d,i) { return d.type_ == "code"; }).length);
                            break;
                        case "text_lines":
                            return d3_sort_order(
                                a.lines.filter(function(d,i) { return d.type_ == "text"; }).length,
                                b.lines.filter(function(d,i) { return d.type_ == "text"; }).length);
                            break;
                        case "votes":
                            return d3_sort_order(a.votes, b.votes);
                            break;
                        case "reputation":
                            return d3_sort_order(a.reputation, b.reputation);
                            break;
                    }
                })
                .transition()
                .duration(500)
                .attr("transform", function(d, i) { 
                    var transform = d3.transform(d3.select(this).attr("transform")).translate;
                    var xPosition = transform[0];
                    var yPosition = transform[1];
                    return "translate(" +
                        i * (bar_width + bar_horizontal_padding) + "," + 
                        yPosition + ")";
                });
        };
	};

    function setupCountChart(divId, data, featureKey) {

        var chart = d3.select(divId);
        var w = px_to_num(chart.style("width"));
        var h = px_to_num(chart.style("height"));
        var svg = chart
            .append("svg")
            .attr("width", w)
            .attr("height", h);
        var margin = {
            top: 20,
            bottom: 70,
            left: 30,
            right: 20
        };

        var REF_COUNT = 10;  // 20 because of category20 colors for D3
        var ref_counts = countCodeFeatures(data, featureKey);
        var sortedFeatCounts = d3.entries(ref_counts)
            .sort(function(a, b) {
                return b.value - a.value;
            })
            .splice(0, REF_COUNT);
        var ref_colors = d3.scale.category20b()
            .domain(d3.keys(sortedFeatCounts));

        var max_refs = d3.max(d3.entries(ref_counts), function(d) { return d.value; });
        var x_scale = d3.scale.ordinal()
            .domain(sortedFeatCounts.map(function(d) { return d.key; }))
            .rangeRoundBands([margin.left, w - margin.right], .1);
        var y_scale = d3.scale.linear()
            .domain([0, max_refs])
            .range([h - margin.bottom, margin.top]);
        var h_scale = d3.scale.linear()
            .domain([0, max_refs])
            .range([0, h - (margin.top + margin.bottom)]);

        var bars = svg.selectAll("rect")
            .data(sortedFeatCounts)
            .enter()
            .append("rect")
            .attr("class", "dep_bar")
            .attr("x", function (d, i) { return x_scale(d.key); })
            .attr("y", function (d) { return y_scale(d.value); })
            .attr("width", x_scale.rangeBand())
            .attr("height", function(d) { return h_scale(d.value); })
            .style("fill", function(d) { return ref_colors(d.key) })
            .on("mouseover", mouseover)
            .on("click", click)
            .on("mouseout", mouseout);

        var labels = svg.selectAll("text")
            .data(sortedFeatCounts)
            .enter()
            .append("text")
            .attr("text-anchor", "end")
            .attr("class", "ac_label")
            .text(function(d) { return d.key; })
            .attr("transform", function(d) {
                return "translate(" + 
                    Math.floor(x_scale(d.key) + x_scale.rangeBand() / 2) + "," + 
                    (h - margin.bottom + 12) + 
                    ")rotate(-40)";
            });

        var yAxis = d3.svg.axis()
            .scale(y_scale)
            .ticks(4)
            .orient("left");
        svg.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(" + margin.left + ",0)")
            .call(yAxis);

        function mouseover(d) {
            d3.select(this).classed("hovered", true);
            brighten_lines_with_feature(featureKey, d.key, 1.5);
            d3.select(this).call(color_dep_bar);
        }

        function click() {
            d3.select(this).classed("selected", function() {
                return ! d3.select(this).classed("selected");
            });
            show_flags_for_selected_features(featureKey);
            d3.select(this).call(color_dep_bar);
        }

        function mouseout(d) {
            d3.select(this).classed("hovered", false);
            brighten_lines_with_feature(featureKey, d.key, 0);
            d3.select(this).call(color_dep_bar);
        }

        function color_dep_bar(element) {
            var data = element.data()[0];
            var base_color = ref_colors(data.key);
            element.style("fill", function(d) {
                var brightness = (
                    d3.select(this).classed("selected") || 
                    d3.select(this).classed("hovered")) ? 
                    1.5 : 0;
                return d3.rgb(ref_colors(d.key)).brighter(brightness);
            });
        }

        function brighten_lines_with_feature(key, ref, brightness) {
            d3.selectAll(".line_rect").filter(function(d) { 
                return (d[key].indexOf(ref) >= 0); 
            }).style("fill", function(d) {
                return d3.rgb(code_colors(d.type_)).brighter(brightness);
            });
        };

        function show_flags_for_selected_features(featureKey) {

            function color_flags_with_feature(featureKey, ref, color) {
                d3.selectAll(".flag").filter(function(d) { 
                    return (d[featureKey].indexOf(ref) >= 0); 
                }).style("fill", function(d) {
                    return d3.rgb(color);
                }).style("fill-opacity", 1.0);
            }

            /* Start by hiding all flags */
            d3.selectAll(".flag").style("fill-opacity", 0.0);

            /* Fill in flag colors for selected deps, starting with least-used deps.
             * These will get overwritten by the selected most-used deps. */
            var selected = d3.selectAll(".dep_bar.selected");
            if (selected.length > 0) {
                selected[0].reverse();
                selected.each(function(d) {
                    color_flags_with_feature(featureKey, d.key, ref_colors(d.key));
                });
            }
        };
    }

    /* Utilities */
    function countCodeFeatures(data, key) {
        var feat_counts = {};
        for (var i = 0; i < data.length; i++) {
            var lines = data[i].lines;
            for (var j = 0; j < lines.length ; j++) {
                var features = lines[j][key];
                for (var k = 0; k < features.length; k++) {
                    var feat = features[k];
                    if (!(feat in feat_counts)) {
                        feat_counts[feat] = 0;
                    }
                    feat_counts[feat]++;
                }
            }
        }
        return feat_counts;
    };

    function px_to_num(str) {
        return Number(str.replace("px", ""));
    };

    function addJavadocsLinks(divId, linksData) {
        $("#aggregate_chart text.ac_label").each(function() {
            var className = $(this).text();
            var link = undefined;
            if (linksData.hasOwnProperty(className)) {
                link = linksData[className];
            } else {
                link = "https://docs.oracle.com/javase/7/docs/api";
            }
            $(this).data("href", link)
            .on('click', function() {
                window.open($(this).data('href'), '_blank');
            })
            .css({
                cursor: 'pointer',
                cursor: 'hand'
            });
        });
    }

    /* Routines for processing input data */
    function preprocessData(data) {

        function addSpans(body) {
            var code = body.children("pre");
            if (code.length > 0) {
                code.each(function() {
                    $(this).html(function(_, text) {
                        return text.replace(/^<code>/, "<span>")
                            .replace(/(\r\n|\n|\r)/gm, "</span>\r\n<span>")
                            .replace(/<\/code>$/, "</span>");
                    });
                });
            }
            var par = body.children("p");
            if (par.length > 0) {
                par.each(function() {
                    $(this).html(function(_, text) {
                        return "<span>" + text.replace(/\.\s/gm, "</span>\r\n<span>") + "</span>";
                    });
                });
            }
            return body;
        }

        function highlightCode(body) {
           body.find("pre").each(function(_, block) {
               hljs.highlightBlock(block);
           });
        }

        /* Add spans for each line of each answer body so we can look move the
         * preview window to focus precisely at that line. */
        for (var i = 0; i < data.length; i++) {
            data[i].body = addSpans($("<div>" + data[i].body + "</div>"));
            highlightCode(data[i].body);
        }
    }

    /* Globals */
    var code_colors = d3.scale.category10()
        .domain(["text", "code", "codecommentinline", "codecommentlong"]);

    /* MAIN */
    d3.json("/static/skim/data/javadocs_links.json", function(linksData) {
        preprocessData(data);
        setupCodeBars(data);
        setupCountChart("#aggregate_chart", data, "references");
        addJavadocsLinks("#aggregate_chart", linksData);
        setupCountChart("#concept_chart", data, "concepts");
    });
});