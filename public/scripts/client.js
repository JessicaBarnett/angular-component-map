(function(){
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
          .attr("class", d => d.data.name)
          .attr("dy", "0.31em")
          .attr("x", d => d.children ? -6 : 6)
          .attr("text-anchor", d => d.children ? "end" : "start")
          .text(d => `${d.data.name}${d.data.count ? ' ('+d.data.count+')' : ''}${d.data.recursive ? ' (recursive)' : ''}`)
        .clone(true).lower()
          .attr("stroke", "white");
      
      // have to use full function for 'this' context to work correctly
      node.on('click', function() {
          // remove "highlighted" class from last group
          const oldGroup = Array.prototype.slice.call(document.getElementsByClassName('highlighted'));
          oldGroup.forEach((element) => element.classList.remove('highlighted'));

          // add "highlighted" class to new group
          const newGroupClass = d3.select(this).data()[0].data.name;
          const newGroup = Array.prototype.slice.call(document.getElementsByClassName(newGroupClass));
          newGroup.forEach((element) => element.classList.add('highlighted'));
      });

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
        const tidyTreeSvg = tidyTree(data);
        document.body.appendChild(tidyTreeSvg);
      });

  });




})();
