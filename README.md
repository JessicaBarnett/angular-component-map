## Angular Component Map
This is a tiny utility to 
  1) generate a json tree that describes all components defined in that project, and their parent/child relationships. 
     (Writes data in a hirearchical format to match d3.hirearchy's expected input: https://github.com/d3/d3-hierarchy#hierarchy)
  2) start a local server to start a tiny web page that'll display said json in a chart 

It was specifically built to generate trees for Relay's Portal and Wire apps, to be used to decide where to direct testing efforts, and generally visualize & document their complexity.

## To Use 
use one of the 4 scripts in package.json 
  - "start": run this to both re-generate data and run the server
  - "build": run this to just build data
  - "serve": run this to just run the server, if you've already run `build` to generate data
  - "debug": run this to run the data-building code with `inspect`

## Dependencies
 - d3 to generate chart (credit: https://observablehq.com/@d3/tidy-tree) (`public/scripts/client.js`)
 - express/node to run a local server (`main.js`)
 - custom node script to walk/parse angular project and build json (`util/build_trees.js`)

## Bugfix TODO
1) get rid of 'user/jessica' in the paths in build_trees.js
2) make sure this works for wire too

## Feature TODO
1) move the labels with children to the same position as the actual children for better readability
2) add more metadata - number of components, depth, length of ts/html files, number of functions, number of services injected, etc.  make available on click/hover or something.
3) indicate top-level components (referenced from in routes)
4) indicate components that aren't used anywhere (like EmptyComponent)
5) zoom into subtree
6) testing

## Test Cases
1) handle recursive components (ex: PhoneComponent)
2) ensure sorting by number of children, then by component name alphabetical  
3) ensure that we're only catching component classes, not non-component classes that are declared above the @Component decorator
4) ensure selectors that are similar (ex: 'quick-launch' and 'quick-launch-content') are differentiated 
5) ensure templates for different components that have similar file names (ex: 'list.component.html' (ProductGroupsComponent) vs 'jobs-list.component.html' (JobsListComponent)) are differentiated
6) ensure `<app-my-element class="blah">` and `<app-my-element>` both match.  ensure `</app-my-element>` does not. 