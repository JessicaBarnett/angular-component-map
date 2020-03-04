/*
## Steps 
    ### Get Metadata
        * for each `.component.ts` file in `src/app`...
            * for each line in the file... 
                * grab the selector, template path, and component name and store them in `allComponents` 
    
    ### Get Child Components 
        * for each `.component.html` file `src/app`
            * match filename against templateUrls in `allComponents` to find matching data
            * for each line in file...
                * for each instance of component selector in the line...
                    *  Add component name to 'children' array of `componentData`
            * remove duplicates from 'children' array in `componentData`

    ### Build Trees
        * sort allComponents by fewest children first
        * for each componentData in allComponents...
            * for each child in componentData... 
                * if child has no children, create a node w/ just the name
                * if child has children, get corresponding data for that child and see if it's complete.
                    * if so, copy tree data for that child
                    * if not, recurse and repeat for that child's children. 
                    * 
    ### Write Json
        * clear any trees that don't have children from the top level
        * export json and save to a file
        * profit!
        
## Assumptions
    - assumes 1 component definition per `.component.ts` file
    - assumes that the first thing selectorRegex, templatePathRegex, and componentNameRegex will match @Component() metadata
*/

const path = require('path');
const fs = require('fs');
const readline = require('readline');
const _ = require('lodash');

const componentMetadataRegex = /^.*@Component\(.*$/;
const selectorRegex = /selector:\s'(.+?)'/;
const templatePathRegex = /templateUrl:\s'(\.\/.+)'/;  // matches: "  templateUrl: './test-launcher.component.html'," & captures "test-launcher.component.html" in first group
const componentNameRegex = /export\sclass\s(.+?)\s+[i|{|e]/;  // matches "export class MyComponent implements/exends/{" & captures "MyComponent" in 1st group

/**
 * Models
 */
class ComponentDataList {
    constructor(list = []) {
        this.list = list;
    }

    add (componentData) {
        this.list.push(componentData)
    }

    /*
        regex looks like: /<(selector-1|selector-2|selector-3|selector-4|selector-5)/g 
    */
    getSelectorsRegex () {
        const processSelectors = _.flow(
            _.partialRight(_.map, 'selector'), // pluck out 'selector' values
            _.compact, // remove any components that don't have selectors (there are a couple - AppComponent is one)
            _.partialRight(_.join, '|'), // join selectors together with pipes: my-selector|my-selector-2|my-selector-3
            _.partialRight(_.replace, /-/g, '\-'), // escape hyphens for RegExp: my\-selector|my\-selector\-2|my\-selector\-3
        );
        return new RegExp(`<(${processSelectors(this.list)})`, 'g'); 
    }

    getDataByTemplate (templatePath) {
        return _.find(this.list, (data) => templatePath.search(data.templatePath) >= 0);
    }

    getDataByName (name) {
        return _.find(this.list, (data) => data.name === name);
    }

    getDataBySelector (selector) {
        return _.find(this.list, (data) => data.selector === selector);
    }

    getDataByIndex (i) {
        return this.list[i];
    }

    createTrees() {
        this.list = this._sortByFewestChildren(this.list);
        for (let i = 0; i < this.list.length; i++) {
            let childData = this.getDataByIndex(i);
            childData.tree = this._createTree(childData);
            childData.complete = true;
        }
    }

    _sortByFewestChildren (list) {
        return _.sortBy(list, (listItem) => listItem.children.length );
    }
    
    _createTree(componentData) { // depth is just for debugging
        return _.map(componentData.children, (childName) => { // for each child, get ComponentData
            const childData = this.getDataByName(childName); // get child data

            if (childData.complete) { // if childData is complete, return a node w/ name and copied tree data
                return new TreeNode(childData.name, childData.tree);
            } else {
                childData.complete = true;
            }

            if (!childData.children.length) {// if childData has no children then return a node with just the name
                return new TreeNode(childData.name);
            }

            // else recurse to get the next-level tree for this child 
            return new TreeNode(childData.name, this._createTree(childData));
        });[]
    }

    treeAsJson() {
        const trees = {
            name: "root", // d3 needs a root node to be able to do anything
            children: _.flow(
                _.partialRight(_.map, (node) => {
                    return {
                        name: node.name, 
                        children: node.tree
                    };
                }), // pulls just 'tree' keys out of top-level 'ComponentData' objects,
                // _.partialRight(_.reject, (node) => node.children.length === 0), // to remove top-level nodes without any children, if we want that
            )(this.list)
        };

        return JSON.stringify(trees, null, 4); // to pretty-print json
    }

    // for debugging only
    _asJson() {
        return JSON.stringify(this.list, null, 4);
    }

    // for debugging only
    _find(componentName) {
        return _.find(this.list, (node) => node.name === componentName);
    }
};

class ComponentData {
    constructor(data) {
        const { selector, name, templatePath, controllerPath, children, tree } = data;
        this.selector = selector || undefined ; // string
        this.name = name || undefined; // string
        this.templatePath = templatePath || undefined; // string
        this.controllerPath = controllerPath || undefined; // string
        this.children = children || []; // string[]
        this.tree = tree || []; // TreeNode[]
    }
};

class TreeNode {
    constructor(name, children) {
        this.name = name; // string

        if (children && children.length) {
            this.children = children; // TreeNode[]
        }
    }
};

let allComponents = new ComponentDataList();

/**
 * Functions
 */

/*
  partly borrowed from: https://stackoverflow.com/questions/25460574/find-files-by-extension-html-under-a-folder-in-nodejs
*/
const fromDir = (startPath, filter, callback, promises = []) => {
    var files = fs.readdirSync(startPath);
    
    for (var i = 0; i < files.length; i++) {
        var filename = path.join(startPath,files[i]);
        var stat = fs.lstatSync(filename);

        if (stat.isDirectory()){
            promises.concat(fromDir(filename, filter, callback, promises)); // recurse
        } else if (filter.test(filename)) { 
            promises.push(callback(filename)); // callback returns a promise
        }
    };

    return promises;
};

const getFullTemplatePath = (fullControllerPath, templatePath) => {
    const parentPath = /.*(src\/app.*\/)/.exec(fullControllerPath)[1]; // ex: takes `/Users/myuser/relay/rn-v3/server/emerald-portal/src/app/jobs-list/components/jobs-list/jobs-list.component.ts` and captures `/src/app/jobs-list/components/jobs-list/`
    const fullTemplatePath = templatePath.replace(/^\.\//, parentPath); // replace `./` with parent path.  ex: `./jobs-list.html` becomes `/src/app/jobs-list/components/jobs-list/jobs-list.html`
    return fullTemplatePath;
}

const getComponentDataFromController = (filename) => {
    return new Promise((resolve, reject) => {
        const readInterface = readline.createInterface({
            input: fs.createReadStream(filename)
        });
    
        const data = new ComponentData({
            selector: undefined,
            name: undefined,
            templatePath: undefined,
            controllerPath: filename,
            children: [],
            tree: []
        });

        let foundComponent = false; // set to true when '@Component(' is found 

        readInterface.on('line', (line) => {
            if (!foundComponent && componentMetadataRegex.test(line)) {
                foundComponent = true;
            }

            if (!foundComponent) { // prevents us from getting non-component class names as componentNames
                return;
            }

            if (!data.selector && selectorRegex.test(line)) {
                data.selector = selectorRegex.exec(line)[1];
            }
            
            if (!data.templatePath && templatePathRegex.test(line)) {
                data.templatePath = getFullTemplatePath(filename, templatePathRegex.exec(line)[1]);
            }
            
            if (!data.name && componentNameRegex.test(line)) {
                data.name = componentNameRegex.exec(line)[1];
            }
            
            if (data.name && data.templatePath) { // selector is not required
                allComponents.add(new ComponentData(data));
                resolve();
                readInterface.close();
                readInterface.removeAllListeners();
            }
        }).on('close', () => {
            reject(`Failed ${filename}  \nCaptured data: ${JSON.stringify(data)} \n** Make sure component metadata is written per angular standard! **`)
        });
    });
}

const getChildComponentsFromTemplate = (filename) => {
    let selectorsRegex = allComponents.getSelectorsRegex();
    const children = [];

    return new Promise((resolve) => {
        const readInterface = readline.createInterface({
            input: fs.createReadStream(filename)
        });
        
        readInterface.on('line', (line) => {
            
            let nextResult;
            while ((nextResult = selectorsRegex.exec(line))) { // will be null when there's nothing left
                const match = allComponents.getDataBySelector(nextResult[1]);
                if (match) { // won't get a match if a component doesn't have a selector
                    children.push(match['name']); 
                }
            }
        }).on('close', () => {
            if (children.length) {
                const componentData = allComponents.getDataByTemplate(filename);
                // if (filename.search('jobs-list/jobs-list.component.html') > 0) { debugger }
                componentData.children = _.uniq(children);
            }
            resolve();
        });
    });
};


/** 
 * Execution
 */

/**
 * @param {string: 'wire' | 'portal'} app 
 */
const buildTree = (app) => {
    const pathToSearch = `/Users/jbarnett/relay/rn-v3/server/emerald-${app}/src/app/`;
    // const pathToSearch = '/Users/jbarnett/relay/rn-v3/server/emerald-portal/src/app/jobs-list'; // limited path for testing

    try {
        console.log(`getting component data for {app}...`)
        const metadataPromises = fromDir(pathToSearch, /\.component.ts$/, getComponentDataFromController);
        Promise.all(metadataPromises)
                .then(() => {
                    console.log(`finding child components...`)
                    const childComponentPromises = fromDir(pathToSearch, /\.component.html$/, getChildComponentsFromTemplate);
                    Promise.all(childComponentPromises)
                        .catch((error) => {
                                console.log(error)
                        })
                        .finally(() => {
                                console.log(`building trees...`);
                                allComponents.createTrees();

                                console.log(`writing to file...`)
                                /*  writes data in a hirearchical format to match d3.hirearchy's needs: https://github.com/d3/d3-hierarchy#hierarchy */
                                fs.writeFile(`./public/data/${app}-data.json`, allComponents.treeAsJson(), () => {
                                    console.log(`All done!  File written to ./public/data/${app}-data.json`);
                                });
                            }); 
                })
                .catch((error) => {
                    console.log(error)
                });
    } catch(error) {
        console.log(error);
    }
}

module.exports = {
    buildTree: buildTree
}