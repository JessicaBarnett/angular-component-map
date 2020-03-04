const _ = require('lodash');
const express = require('express')
const app = express();
const port = 1212;

const { buildTree } = require('./util/build_trees');
const args = process.argv.slice(2);

if (_.includes(args, '--build')) { // --build flag
  buildTree('portal');
  // buildTree('wire');
}


if (_.includes(args, '--serve')) { // --serve flag
  app.use('/', express.static('public'));
  app.listen(port, () => console.log(`Server listening on port ${port}`));
}
