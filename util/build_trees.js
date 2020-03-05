/*
## Summary of Steps
    ### Get Metadata
        * for each `.component.ts` file in `src/app`...
            * for each line in the file... 
                * create componentData item in allComponents list
                * get metadata and store it on componentData item
    
    ### Get Child Components 
        * for each `.component.html` file `src/app`
            * match filename against templateUrls in `allComponents` to find matching data
            * for each line in file...
                * for each instance of component selector in the line...
                    *  Add component name to 'children' array of `componentData`

    ### Build Trees
        * sort allComponents
        * for each componentData in allComponents...
            * for each child in componentData... 
                * if child has no children, create a node w/ just the name
                * if child has children, get corresponding data for that child and see if it's complete.
                    * if so, copy tree data for that child
                    * if not, recurse and repeat for that child's children. 
                    * 
    ### Write Json
        * export json and save to a file

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

class ComponentData {
    constructor(data) {
        const { selector, name, templatePath, controllerPath, children, tree } = data;
        this.selector = selector || undefined ; // string
        this.name = name || undefined; // string
        this.templatePath = templatePath || undefined; // string
        this.controllerPath = controllerPath || undefined; // string
        this.children = children || []; // string[]
        this.recursive = false; // true if the component uses its own selector in its template
        this.tree = tree || undefined; // TreeNode[]
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

class ComponentDataList {
    constructor(list = []) {
        this.list = list;
    }

    add (componentData) {
        this.list.push(componentData)
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

    /**
     * @returns a regex that will match the selectors of any component in `this.list` 
     *   - if a component doesn't have a selector, it'll be filtered out
     *   - will capture the selector name in the first group when used with `.exec()`
     *   - will only match opening tags. 
     *   - will match tags that have attriubutes and that do not: ex: `<selector-1>` and `<selector-1 class="hi">` will both match 
     *   ex: /<(selector-1|selector-2|selector-3|selector-4|selector-5)[\s|>]/g 
    */
   getSelectorsRegex () {
        const processSelectors = _.flow(
            (listItem) => _.map(listItem, 'selector'), // pluck out 'selector' values
            (selectors) => _.compact(selectors), // remove any components that don't have selectors (there are a couple - AppComponent is one)
            (selectors) => _.join(selectors, '|'), // join selectors together with pipes: my-selector|my-selector-2|my-selector-3
            (joinedSelectors) => _.replace(joinedSelectors, /-/g, '\-') // escape hyphens for RegExp: my\-selector|my\-selector\-2|my\-selector\-3
        );
        return new RegExp(`<(${processSelectors(this.list)})[\\s|>]`, 'g');  // match out to a space, ex: to ensure the entry for 'app-quick-launch' doesn't match 'app-quick-launch-content'
    }

    /**
     * 
     */
    createTrees() {
        this.list = this._sort(this.list);
        for (let i = 0; i < this.list.length; i++) {
            let childData = this.getDataByIndex(i);
            if (!childData.tree || !childData.tree.length) { // if tree hasn't been established already via recursion... 
                childData.tree = this._sort(this._createTree(childData));
            }
        }
    }
    
    _createTree(componentData) {
        return _.map(componentData.children, (childName) => { // for each child, get ComponentData
            const childData = this.getDataByName(childName); // get child data

            if (componentData.recursive && childData.name === componentData.name) { // if this is a recursive component inside a recursive component... 
                return new TreeNode(`${childData.name} (recursive)`); // just say its '(recursive)' and don't bother adding a tree.  
            }

            if (childData.tree && childData.tree.length) { // if childData is complete, return a node w/ name and copied tree data (prevents having to recurse again)
                return new TreeNode(childData.name, this._sort(childData.tree));
            }
            
            if (!childData.children.length) {// if childData has no children then return a node with just the name
                return new TreeNode(childData.name);
            }

            // else recurse to get the next-level tree for this child 
            const newTree = this._sort(this._createTree(childData));
            return new TreeNode(childData.name, newTree);
        });
    }

    // TODO - make this prettier
    _sort(list) {
        const numberOfChildren = (listItem) => listItem.children ? listItem.children.length : 0; // just return 0 if there are no children to sort by
        const groups = _.groupBy(list, numberOfChildren);  // group by number of children
        const sortedGroups = _.map(groups, (group) => _.sortBy(group, 'name')); 
        const sorted = _.flatten(_.values(sortedGroups));
        return sorted;
    }

    treeAsJson() {
        const trees = {
            name: "root", // d3 needs a root node to be able to do anything
            children: _.map(this.list, (node) => { // pulls just 'tree' keys out of top-level 'ComponentData' objects,
                            return {
                                name: node.name, 
                                children: node.tree
                            };
                        })
        };

        return JSON.stringify(trees, null, 4); // to pretty-print json
    }

    // for debugging only
    asJson() {
        return JSON.stringify(this.list, null, 4);
    }

    // for debugging only
    find(componentName) {
        return _.find(this.list, (node) => node.name === componentName);
    }
};

let allComponents = new ComponentDataList();

/**
 * Functions
 */

/**
 * recursively crawls directory at `startPath` and calls `callback` for each file matching `filter`
 * credit: partly borrowed from: https://stackoverflow.com/questions/25460574/find-files-by-extension-html-under-a-folder-in-nodejs
 * 
 * @param {*} startPath directory to search
 * @param {*} filter filetype you want to look for (ex: *.component.ts)
 * @param {*} callback function to call for each found file
 * @param {*} promises  collects promises for recursive async operations, to allow `fromDir().then()` to be a thing
 * 
 * @returns an array of `promises` that will resolve when those callbacks are complete
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

/**
 * returns an almost-fully qualified path (starting from src) for a component template. 
 * this is needed to ensure that if 2 component templates have the same filename, but are in different 
 * directories, they stay differentiated.  ex: `file-engine-list/list.html` and `product-group-list/list.html`
 * 
 * @param {*} fullControllerPath full filepath for `*.component.ts` file.  ex: `/Users/myuser/relay/rn-v3/server/emerald-portal/src/app/jobs-list/components/jobs-list/jobs-list.component.ts`
 * @param {*} templatePath whatever is in the `templatePath` key of the `@Component` metadata for `*.component.ts` file.  often a relative path, ex: './jobs-list.html'
 */
const getFullTemplatePath = (fullControllerPath, templatePath) => {
    const parentPath = /.*(src\/app.*\/)/.exec(fullControllerPath)[1]; // ex: takes `/Users/myuser/relay/rn-v3/server/emerald-portal/src/app/jobs-list/components/jobs-list/jobs-list.component.ts` and captures `/src/app/jobs-list/components/jobs-list/`
    const fullTemplatePath = templatePath.replace(/^\.\//, parentPath); // replace `./` with parent path.  ex: `./jobs-list.html` becomes `/src/app/jobs-list/components/jobs-list/jobs-list.html`
    return fullTemplatePath;
}

/**
 * create ComponentData object for component at `filename` and extract metadata to save on it.
 * 
 * - go through all lines in the component file at `filename` 
 * - collect metadata (selector, component name, template path, controller path) 
 * - store it in allComponents for later use.
 * 
 * Intended to be passed to fromDir as a callback. 
 * 
 * @param {*} filename full filepath for component.  file should match `*.component.ts`
 * @returns promise that will resolve when all metadata has been collected
 */
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
                readInterface.close(); // stop parsing file once all information is found.  
                readInterface.removeAllListeners();
            }
        }).on('close', () => {
            reject(`Failed ${filename}  \nCaptured data: ${JSON.stringify(data)} \n** Make sure component metadata is written per angular standard! **`)
        });
    });
}

/**
 * Create & add a 'children' array to every componentData item in allComponents
 * 
 * - Get regex that will match all selectors for all components in allComponents.  
 * - Run that regex against every line of html in `filename`. (async)
 * - for each match, add componentName to a `children` array
 * - when the file is fully parsed, add `children` array to matching componentData in allComponents, and resolve promise
 *
 * Intended to be passed to fromDir as a callback. 
 * 
 * @param {*} filename full filepath for component template.  file should match `*.component.html`
 * @returns promise that will resolve when the file has been fully parsed
 */
const getChildComponentsFromTemplate = (filename) => {
    let selectorsRegex = allComponents.getSelectorsRegex();
    const componentData = allComponents.getDataByTemplate(filename);
    const children = [];

    return new Promise((resolve) => {
        const readInterface = readline.createInterface({
            input: fs.createReadStream(filename)
        });
        
        readInterface.on('line', (line) => {
            let nextResult;
            while ((nextResult = selectorsRegex.exec(line))) { // will be null when there's nothing left
                const match = allComponents.getDataBySelector(nextResult[1]);

                if (match && match['name'] === componentData['name']) { // if component references its own selector in its template, mark recursive
                    componentData.recursive = true;
                }
                if (match) { // won't get a match if a component doesn't have a selector (ex: AppComponent)
                    children.push(match['name']); 
                }
            }
        }).on('close', () => {
            if (children.length) {
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
 * @param app { string: 'wire' | 'portal' }  
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
                                
                                /* ensure `/public/data` exists */
                                fs.mkdir('public/data', { recursive: true }, (err) => {
                                    if (err) throw err;
                                });

                                /*  writes data in a hirearchical format to match d3.hirearchy's needs: https://github.com/d3/d3-hierarchy#hierarchy */
                                fs.writeFile(`public/data/${app}-data.json`, allComponents.treeAsJson(), () => {
                                    console.log(`All done!  File written to /public/data/${app}-data.json`);
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