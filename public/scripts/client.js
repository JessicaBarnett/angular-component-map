// credit: https://observablehq.com/@d3/zoomable-circle-packing?collection=@d3/d3-hierarchy
function circlePack(data) {
  const width = 932;
  const height = width;
  const format = d3.format(",d")
  const color = d3.scaleSequential([8, 0], d3.interpolateMagma)
  // const color = d3.scaleLinear()
  //       .domain([0, 5])
  //       .range(["hsl(152,80%,80%)", "hsl(228,30%,40%)"])
  //       .interpolate(d3.interpolateHcl)

  const pack = data => d3.pack()
        .size([width, height])
        .padding(3)
        (
          d3.hierarchy(data)
            .sum(d => d.value)
            .sort((a, b) => b.value - a.value)
        );

  const chart = (data) => {
    const root = pack(data);
    let focus = root;
    let view;
  
    const svg = d3.create("svg")
        .attr("viewBox", `-${width / 2} -${height / 2} ${width} ${height}`)
        .style("display", "block")
        .style("margin", "0 -14px")
        .style("background", color(0))
        .style("cursor", "pointer")
        .on("click", () => zoom(root));
  
    const node = svg.append("g")
      .selectAll("circle")
      .data(root.descendants().slice(1))
      .join("circle")
        .attr("fill", d => d.children ? color(d.depth) : "white")
        .attr("pointer-events", d => !d.children ? "none" : null)
        .on("mouseover", function() { d3.select(this).attr("stroke", "#000"); })
        .on("mouseout", function() { d3.select(this).attr("stroke", null); })
        .on("click", d => focus !== d && (zoom(d), d3.event.stopPropagation()));
  
    const label = svg.append("g")
        .style("font", "10px sans-serif")
        .attr("pointer-events", "none")
        .attr("text-anchor", "middle")
      .selectAll("text")
      .data(root.descendants())
      .join("text")
        .style("fill-opacity", d => d.parent === root ? 1 : 0)
        .style("display", d => d.parent === root ? "inline" : "none")
        .text(d => d.data.name);
  
    zoomTo([root.x, root.y, root.r * 2]);
  
    function zoomTo(v) {
      const k = width / v[2];
  
      view = v;
      label.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
      node.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
      node.attr("r", d => d.r * k);
    }
  
    function zoom(d) {
      const focus0 = focus;
  
      focus = d;
  
      const transition = svg.transition()
          .duration(d3.event.altKey ? 7500 : 750)
          .tween("zoom", d => {
            const i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2]);
            return t => zoomTo(i(t));
          });
  
      label
        .filter(function(d) { return d.parent === focus || this.style.display === "inline"; })
        .transition(transition)
          .style("fill-opacity", d => d.parent === focus ? 1 : 0)
          .on("start", function(d) { if (d.parent === focus) this.style.display = "inline"; })
          .on("end", function(d) { if (d.parent !== focus) this.style.display = "none"; });
    }
  
    return svg.node();
  }

  return chart(data);
}

function tidyTree(data) {
  // credit: https://observablehq.com/@d3/tidy-tree
  const width = 3000;
  const tree = data => {
    const root = d3.hierarchy(data);
    root.dx = 10;
    root.dy = width / (root.height + 1);
    return d3.tree().nodeSize([root.dx, root.dy])(root);
  }
  const chart = data => {
    const root = tree(data);

    let x0 = Infinity;
    let x1 = -x0;
    root.each(d => {
      if (d.x > x1) x1 = d.x;
      if (d.x < x0) x0 = d.x;
    });

    const svg = d3.create("svg")
        .attr("viewBox", [0, 0, width, x1 - x0 + root.dx * 2]);
    
    const g = svg.append("g")
        .attr("font-family", "sans-serif")
        .attr("font-size", 10)
        .attr("transform", `translate(${root.dy / 3},${root.dx - x0})`);
      
    const link = g.append("g")
      .attr("fill", "none")
      .attr("stroke", "#555")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1.5)
    .selectAll("path")
      .data(root.links())
      .join("path")
        .attr("d", d3.linkHorizontal()
            .x(d => d.y)
            .y(d => d.x));
    
    const node = g.append("g")
        .attr("stroke-linejoin", "round")
        .attr("stroke-width", 3)
      .selectAll("g")
      .data(root.descendants())
      .join("g")
        .attr("transform", d => `translate(${d.y},${d.x})`);

    node.append("circle")
        .attr("fill", d => d.children ? "#555" : "#999")
        .attr("r", 2.5);

    node.append("text")
        .attr("dy", "0.31em")
        .attr("x", d => d.children ? -6 : 6)
        .attr("text-anchor", d => d.children ? "end" : "start")
        .text(d => d.data.name)
      .clone(true).lower()
        .attr("stroke", "white");
    
    return svg.node();
  }

  return chart(data);
}


document.addEventListener('DOMContentLoaded', function() { 
  
  fetch('./data/portal-data.json')
    .then((response) => {
      if (response.status !== 200) { console.log(`failed to fetch json.  status code: ${response.status}`) }
      return response || {};
    })
    .then((response) => response.json())
    .catch((err) => console.log(err))
    .then((data) => {
      console.log(data);
      // const circlePackSvg = circlePack(data);
      // document.body.appendChild(circlePackSvg);
      const tidyTreeSvg = tidyTree(data);
      document.body.appendChild(tidyTreeSvg);
    });

});
