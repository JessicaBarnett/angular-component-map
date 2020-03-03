## Angular Component Map
This is a tiny utility to 
  a) generate a json tree that describes all components defined in that project, and  their parent/child relationships
  b) start a local server to start a tiny web page that'll display said json in a chart 

It was specifically built to generate trees for Relay's Portal and Wire apps, to be used to decide where to direct testing efforts.  

## To Use 
use one of the 3 scripts in package.json 
  - build: run this to both re-generate data and run the server
  - serve: run this to just run the server, if you've already run `build` to generate data
  - debug: run this to run the code that builds the json with `inspect`

## Immediate TODO
1) get rid of 'user/jessica' in the paths in build_trees.js
2) make sure this works for wire too

## Feature TODO
1) some components w/ children are getting their children erased O_O it's a conspiracy.  Must get to the bottom of it... for the children!
2) get it working for the wire
3) click a component name and highlight all matching component names, to see how often they're used.  
4) list components with number of occurences 
5) allow passing in a filepath to generate a subtree on-the-fly
6) Some kinda testing...  shouldn't be too hard