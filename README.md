## Angular Component Map
This is a tiny utility to 
  a) generate a json tree that describes all components defined in that project, and  their parent/child relationships
  b) start a local server to start a tiny web page that'll display said json in a chart 

It was specifically built to generate trees for Relay's Portal and Wire apps, to be used to decide where to direct testing efforts, and generally visualize & document their complexity.

## To Use 
use one of the 4 scripts in package.json 
  - "start": run this to both re-generate data and run the server
  - "build": run this to just build data
  - "serve": run this to just run the server, if you've already run `build` to generate data
  - "debug": run this to run the data-building code with `inspect`

## Bugfix TODO
1) get rid of 'user/jessica' in the paths in build_trees.js
2) make sure this works for wire too
3) handle recursive components (ex: PhoneComponent)

## Feature TODO
1) move the labels with children to the same position as the actual children for better readability
2) click a component name and highlight all matching component names, to see how often they're used.  
3) add more metadata - number of components, etc
4) put number of occurances in parens next to the names of components in the top-level
5) allow passing in a filepath to generate a subtree on-the-fly?
6) Some kinda testing...

## Test Cases
1) handle recursive components (ex: PhoneComponent)
2) ensure sorting by number of children, then by component name alphabetical  
3) ensure that we're only catching component classes, not non-component classes that are declared above the @Component decorator
4) ensure selectors that are similar (ex: 'quick-launch' and 'quick-launch-content') are differentiated 
5) ensure templates for different components that have similar file names (ex: 'list.component.html' (ProductGroupsComponent) vs 'jobs-list.component.html' (JobsListComponent)) are differentiated